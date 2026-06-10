import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../firebase/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Course, Session, Registration, Attendance } from '../types';
import {
  calculateAttendanceCount,
  calculateAttendanceRate,
  calculateAttendanceScore,
} from '../utils/scoringService';

// UI library imports
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { ProgressCard } from '../components/Analytics/ProgressCard';

import {
  GraduationCap,
  Percent,
  CheckSquare,
  Award,
  QrCode,
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Laptop,
  CheckCircle2,
  FileCheck,
  Download,
  BookOpen,
} from 'lucide-react';

import jsPDF from 'jspdf';

export const StudentDashboard: React.FC = () => {
  const { user, profile } = useAuth();

  // Database states
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [coursesMap, setCoursesMap] = useState<Record<string, Course>>({});
  const [studentAttendanceLogs, setStudentAttendanceLogs] = useState<Attendance[]>([]);
  const [sessionsByCourse, setSessionsByCourse] = useState<Record<string, Session[]>>({});
  const [hoursLog, setHoursLog] = useState<any[]>([]);
  const [issuedCertificates, setIssuedCertificates] = useState<any[]>([]);

  // Selection states
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');

  // Online study timers
  const [activeCheckin, setActiveCheckin] = useState<Record<string, number>>({}); // courseId -> checkin startTime ms
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Loading & error flags
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // ========================================================
  // FIRESTORE LOADER - SPARK OPTIMIZED SINGLE-READ QUERY
  // ========================================================
  useEffect(() => {
    async function loadStudentDashboard() {
      const studentId = profile?.id || user?.uid;
      if (!studentId) return;

      try {
        setIsLoading(true);
        setErrorMessage(null);

        // 1. Fetch ALL course nodes in parallel
        const coursesSnap = await getDocs(collection(db, 'courses'));
        const allCourses = coursesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Course[];

        const tempCoursesMap: Record<string, Course> = {};
        allCourses.forEach((c) => {
          tempCoursesMap[c.id] = c;
        });
        setCoursesMap(tempCoursesMap);

        // 2. Discover registered courses (enrollments only)
        const activeCoursesList: Course[] = [];
        const sessionsPromises: Promise<{ courseId: string; sessions: Session[] }>[] = [];

        // Check root-level registrations (Pillar 6)
        const rootRegsSnap = await getDocs(collection(db, 'registrations'));
        const registeredCourseIds = new Set<string>();
        rootRegsSnap.docs.forEach((d) => {
          const rData = d.data();
          if (rData.studentId === studentId && (rData.status === 'registered' || rData.status === 'approved' || rData.status === 'completed')) {
            registeredCourseIds.add(rData.courseId);
          }
        });

        // Loop and add sessions
        for (const course of allCourses) {
          // If in root registrations OR in subcollection registration
          let hasEnrollment = registeredCourseIds.has(course.id);
          if (!hasEnrollment) {
            try {
              const regDocRef = doc(db, 'courses', course.id, 'registrations', `${studentId}_${course.id}`);
              const regDoc = await getDoc(regDocRef);
              if (regDoc.exists() && (regDoc.data().status === 'approved' || regDoc.data().status === 'registered')) {
                hasEnrollment = true;
              }
            } catch (e) {
              // Ignore restriction
            }
          }

          if (hasEnrollment) {
            activeCoursesList.push(course);
            sessionsPromises.push(
              getDocs(collection(db, 'courses', course.id, 'sessions')).then((snap) => ({
                courseId: course.id,
                sessions: snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Session[],
              }))
            );
          }
        }

        setEnrolledCourses(activeCoursesList);

        if (activeCoursesList.length > 0) {
          setSelectedCourseId((prev) => (prev === 'all' ? 'all' : prev));
        }

        // 3. Resolve enrolled course sessions in parallel
        const resolvedSessArrays = await Promise.all(sessionsPromises);
        const tempSessionsMap: Record<string, Session[]> = {};
        resolvedSessArrays.forEach((item) => {
          tempSessionsMap[item.courseId] = item.sessions;
        });
        setSessionsByCourse(tempSessionsMap);

        // 4. Fetch private check-in records (Strict Spark Optimization)
        const attRef = collection(db, 'attendance');
        const q = query(attRef, where('studentId', '==', studentId));
        const attSnap = await getDocs(q);
        const logs = attSnap.docs.map((d) => d.data() as Attendance);
        setStudentAttendanceLogs(logs);

        // 5. Fetch attendance training hours logged
        const hoursSnap = await getDocs(collection(db, 'attendance_hours'));
        const loadedHours = hoursSnap.docs
          .map((d) => d.data())
          .filter((d) => d.studentId === studentId);
        setHoursLog(loadedHours);

        // 6. Fetch certificates issued (Pillar 6 and 12)
        const certsSnap = await getDocs(collection(db, 'certificates'));
        const loadedCerts = certsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as any))
          .filter((d) => d.studentId === studentId);
        setIssuedCertificates(loadedCerts);

      } catch (err: any) {
        console.error('Student loader error:', err);
        setErrorMessage('Failed to compile study gate telemetry indicators.');
      } finally {
        setIsLoading(false);
      }
    }

    loadStudentDashboard();
  }, [user, profile, refreshTrigger]);

  // ========================================================
  // COMPUTE SUMMARY SCORECARDS & TIMELINES (MEMOIZED)
  // ========================================================
  const studentMetricsSummary = useMemo(() => {
    const coursesSubset =
      selectedCourseId === 'all'
        ? enrolledCourses
        : enrolledCourses.filter((c) => c.id === selectedCourseId);

    let totalPlannedSessions = 0;
    let totalCompletedSessions = 0;
    let actualAttendanceCount = 0;
    let totalScoresEarned = 0;
    let totalPointsMaxPossible = 0;

    coursesSubset.forEach((course) => {
      const planned = course.plannedSessions || 10;
      const maxPts = course.maxPoints || 100;

      const courseAttendance = studentAttendanceLogs.filter((a) => a.courseId === course.id);
      const courseSessions = sessionsByCourse[course.id] || [];

      const count = calculateAttendanceCount(courseAttendance);
      const rate = calculateAttendanceRate(count, planned);
      const score = calculateAttendanceScore(count, planned, maxPts);

      totalPlannedSessions += planned;
      totalCompletedSessions += courseSessions.length;
      actualAttendanceCount += count;
      totalScoresEarned += score;
      totalPointsMaxPossible += maxPts;
    });

    const averageRate = enrolledCourses.length > 0 && totalPlannedSessions > 0
      ? calculateAttendanceRate(actualAttendanceCount, totalPlannedSessions)
      : 0;

    const remainingSessions = Math.max(0, totalPlannedSessions - totalCompletedSessions);

    // Timeline logs chronologically grouped
    const timelineLogs: any[] = [];
    coursesSubset.forEach((course) => {
      const courseSess = sessionsByCourse[course.id] || [];
      courseSess.forEach((s) => {
        const att = studentAttendanceLogs.find((a) => a.sessionId === s.id);
        
        let tStr = '--';
        if (att?.checkinTime) {
          tStr = new Date(att.checkinTime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
        }
        timelineLogs.push({
          sessionId: s.id,
          sessionTitle: s.title,
          courseCode: course.code,
          date: s.date,
          status: att?.status || 'absent',
          time: tStr,
          remarks: att?.status === 'present' ? 'Successful scan' : '--',
        });
      });
    });

    timelineLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter upcoming class session targets
    const upcomingList: any[] = [];
    coursesSubset.forEach((course) => {
      const courseSess = sessionsByCourse[course.id] || [];
      courseSess.forEach((s) => {
        const isUpcoming = s.status === 'upcoming' || s.status === 'active' || new Date(s.date) >= new Date();
        const alreadyChecked = studentAttendanceLogs.some(
          (a) => a.sessionId === s.id && (a.status === 'present' || a.status === 'late' || a.status === 'manual')
        );

        if (isUpcoming && !alreadyChecked) {
          upcomingList.push({
            sessionObj: s,
            courseCode: course.code,
            courseName: course.title,
            courseId: course.id,
            meetingLink: s.meetingLink || course.meetingLink || '',
          });
        }
      });
    });

    upcomingList.sort(
      (a, b) => new Date(a.sessionObj.date).getTime() - new Date(b.sessionObj.date).getTime()
    );

    return {
      totalCoursesCount: coursesSubset.length,
      averageRateValue: averageRate,
      scoreValue: totalScoresEarned,
      maxScoreValue: totalPointsMaxPossible,
      attendedCount: actualAttendanceCount,
      completedSessCount: totalCompletedSessions,
      plannedSessCount: totalPlannedSessions,
      remainingCount: remainingSessions,
      timeline: timelineLogs,
      upcoming: upcomingList.slice(0, 4),
    };
  }, [selectedCourseId, enrolledCourses, studentAttendanceLogs, sessionsByCourse]);

  // Online study training hooks
  const handleStartOnlineStudy = (courseId: string, meetingLink: string) => {
    setActiveCheckin((prev) => ({ ...prev, [courseId]: Date.now() }));
    if (meetingLink) {
      window.open(meetingLink, '_blank', 'referrer');
    }
    setSuccessToast(`Joined online seminar virtual lobby! Study stopwatch is running.`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleCheckoutOnlineStudy = async (courseId: string) => {
    const startTime = activeCheckin[courseId];
    if (!startTime) return;

    try {
      const durationMin = Math.max(1, Math.round((Date.now() - startTime) / (1000 * 60)));
      
      const hoursPayload = {
        studentId: profile?.id || user?.uid,
        courseId: courseId,
        sessionId: `online_${courseId}_${Date.now()}`,
        checkinTime: new Date(startTime).toISOString(),
        checkoutTime: new Date().toISOString(),
        durationMinutes: durationMin,
      };

      // Direct write log to Firestore
      await addDoc(collection(db, 'attendance_hours'), hoursPayload);
      
      // Clear active study clock
      setActiveCheckin((prev) => {
        const copy = { ...prev };
        delete copy[courseId];
        return copy;
      });

      setSuccessToast(`Logged ${durationMin} credit minutes to your official study log!`);
      setRefreshTrigger((v) => v + 1);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Error logging hours:', err);
      setErrorMessage('Could not log hours successfully.');
    }
  };

  // jsPDF academic certificate builder (A4 Landscape)
  const downloadCredentialPDF = (cert: any) => {
    const doc = new jsPDF('landscape', 'pt', 'a4');
    
    // Borders
    doc.setDrawColor(217, 119, 6); // Amber
    doc.setLineWidth(4);
    doc.rect(20, 20, 802, 555); // Outer
    
    doc.setDrawColor(245, 158, 11); // Amber light
    doc.setLineWidth(1);
    doc.rect(24, 24, 794, 547); // Inner inline

    // Heading
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(30, 41, 59); // deep slate
    doc.text('BANGKOK UNIVERSITY ACADEMIA', 421, 100, { align: 'center' });
    
    doc.setFont('times', 'italic');
    doc.setFontSize(16);
    doc.setTextColor(217, 119, 6);
    doc.text('CONFERRED UNDER AUDITED EXCELLENCE DIRECTIVE', 421, 130, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text('THIS ACADEMICAL RECORD IS PROUDLY CONFERRED UPON', 421, 190, { align: 'center' });

    // Candidate Name
    doc.setFont('times', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(15, 23, 42);
    doc.text((cert.studentName || profile?.name || 'Academic Scholar').toUpperCase(), 421, 240, { align: 'center' });

    // Underline name
    doc.setDrawColor(199, 210, 254);
    doc.setLineWidth(2);
    doc.line(260, 250, 580, 250);

    // Course Details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text('for having successfully completed the comprehensive training syllabus and session checkins prescribed for:', 421, 290, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text(`"${cert.courseTitle || 'CS-201 Webb Architectures'}"`, 421, 330, { align: 'center' });

    // Details column
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    const dateStr = cert.issueDate?.seconds 
      ? new Date(cert.issueDate.seconds * 1000).toLocaleDateString() 
      : new Date(cert.issueDate || Date.now()).toLocaleDateString();

    doc.text(`CONFERRED DATE: ${dateStr}`, 150, 430);
    doc.text(`CREDENTIAL NUMBER: ${cert.certificateNumber || 'BU-TRN-2026-000000'}`, 150, 450);
    doc.text(`VERIFICATION PORTAL: ${window.location.origin}/verify/${cert.id}`, 150, 470);

    // Signatures
    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text('Dr. Chutimavadee T.', 600, 430);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Dean of Computer Engineering', 600, 445);
    doc.text('Authorized Signature (Cryptographic Hash Verified)', 600, 460);

    // Save
    doc.save(`Certificate_${cert.certificateNumber || 'BU-TRN'}.pdf`);
  };

  const summaryKpiCards = useMemo(() => {
    return [
      {
        title: 'Active Registries',
        value: studentMetricsSummary.totalCoursesCount,
        desc: 'Approved Courses',
        icon: GraduationCap,
        color: 'text-blue-600 bg-blue-50/50',
      },
      {
        title: 'Overall Attendance Rate',
        value: `${studentMetricsSummary.averageRateValue.toFixed(1)}%`,
        desc: studentMetricsSummary.averageRateValue >= 80 ? 'Safe from penalty gates' : 'At Risk! Maintain above 80%',
        icon: Percent,
        color: studentMetricsSummary.averageRateValue >= 80 ? 'text-emerald-600 bg-emerald-50/50' : 'text-red-600 bg-red-50/50',
      },
      {
        title: 'Total Scans Logged',
        value: `${studentMetricsSummary.attendedCount} / ${studentMetricsSummary.completedSessCount}`,
        desc: 'Successful Checkpins',
        icon: CheckSquare,
        color: 'text-indigo-600 bg-indigo-50/50',
      },
      {
        title: 'Earned Proportional Score',
        value: `${studentMetricsSummary.scoreValue.toFixed(2)} pts`,
        desc: `of ${studentMetricsSummary.maxScoreValue} Target Points`,
        icon: Award,
        color: 'text-pink-600 bg-pink-50/50',
      },
    ];
  }, [studentMetricsSummary]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] gap-3" id="student-dashboard-loading">
        <LoadingSpinner size="lg" />
        <span className="text-xs font-mono text-slate-400">Assembling trainee Study Gate analytics...</span>
      </div>
    );
  }

  // Calculate total minutes logged
  const totalMinsLogged = hoursLog.reduce((sum, current) => sum + (current.durationMinutes || 0), 0);

  return (
    <div className="flex flex-col gap-8 pb-12 animate-fade-in" id="student-study-gate-dashboard">
      {/* Dynamic Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <GraduationCap className="h-64 w-64 text-white" />
        </div>

        <div className="flex flex-col gap-2 max-w-xl relative z-10">
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200 bg-white/10 px-3 py-1 rounded-full w-fit">
            Academic Track: Spring Semester
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">Trainee Study Gate</h1>
          <p className="text-xs sm:text-sm text-indigo-100 font-light leading-relaxed">
            Monitor attendance parameters, review earned proportional grades, track upcoming lecture timelines, and prepare credentials. Maintain average rates above 80% to qualify for instant credentials issuance!
          </p>
        </div>

        <div className="shrink-0 relative z-10">
          <Button
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            variant="secondary"
            size="md"
            className="flex items-center gap-2 shadow-md bg-white text-indigo-700 hover:bg-slate-50 border-0 font-bold"
          >
            <QrCode className="h-4.5 w-4.5 text-indigo-600" /> Refresh Diagnostics
          </Button>
        </div>
      </div>

      {successToast && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-150 flex items-center gap-2 animate-slide-in-up">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shadow-xs" />
          <span>{successToast}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-150 flex items-center gap-2 animate-slide-in-up">
          <Award className="h-5 w-5 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {enrolledCourses.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3">
          <GraduationCap className="h-12 w-12 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-800">No Course Enrolled Found</h3>
          <p className="text-sm text-slate-400 max-w-md">
            You do not currently have any approved course registrations. Contact your course trainer or submit an enrollment application inside Courses page.
          </p>
        </div>
      ) : (
        <>
          {/* Online training & workshop checkpoints */}
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Laptop className="h-5 w-5 text-indigo-600" /> 💻 Online Virtual Classrooms & Hours Logging Lobby
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.filter(c => c.trainingType === 'online' || c.trainingType === 'hybrid').map((course) => {
                const checkedInTime = activeCheckin[course.id];
                const meetingLink = course.meetingLink || 'https://meet.google.com';
                
                return (
                  <Card key={course.id} className="border-indigo-100 bg-gradient-to-br from-indigo-50/10 to-indigo-50/5 relative overflow-hidden flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 absolute top-4 right-4">
                        Online
                      </span>
                      <CardTitle className="text-sm font-bold text-slate-800 tracking-tight leading-snug">{course.title}</CardTitle>
                      <CardDescription className="text-xs text-slate-400 font-mono mt-0.5">{course.code}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pb-4">
                      {checkedInTime ? (
                        <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg text-center flex flex-col items-center gap-1.5 animate-pulse">
                          <span className="text-[10px] text-indigo-650 font-bold uppercase tracking-wider block">Seminar Study Session Active</span>
                          <span className="text-sm font-mono font-bold text-indigo-750">
                            Time: {new Date(checkedInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 font-light pr-12">
                          Join the lecture virtual sandbox, then trigger the checklist stopwatch to log academic training minutes!
                        </p>
                      )}
                    </CardContent>

                    <CardFooter className="flex items-center gap-2 pb-4 pt-0 mt-auto">
                      {!checkedInTime ? (
                        <Button variant="primary" size="xs" onClick={() => handleStartOnlineStudy(course.id, meetingLink)} className="w-full text-[10px] font-bold h-7.5 bg-indigo-600 hover:bg-indigo-700">
                          <ExternalLink className="h-3 w-3 mr-1" /> Launch Lobby
                        </Button>
                      ) : (
                        <Button variant="primary" size="xs" onClick={() => handleCheckoutOnlineStudy(course.id)} className="w-full text-[10px] font-bold h-7.5 bg-rose-650 hover:bg-rose-700">
                          <Clock className="h-3.5 w-3.5 mr-1" /> Check-out {Math.round((Date.now() - checkedInTime) / 60000)} mins
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
              
              {/* Overall hours log metric */}
              <Card className="border-slate-200 flex flex-col items-center justify-center p-5 text-center bg-slate-50/20">
                <Clock className="h-8 w-8 text-indigo-500 mb-2" />
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Online Class Logged</h4>
                <p className="text-2xl font-black text-slate-800 mt-1">{totalMinsLogged} <span className="text-sm font-light text-slate-400">minutes</span></p>
                <span className="text-[9px] text-slate-400 font-mono mt-1">across {hoursLog.length} virtual modules</span>
              </Card>
            </div>
          </div>

          {/* Student Certificates Center */}
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-600" /> Trainee Certificate Center
            </h3>
            {issuedCertificates.length === 0 ? (
              <Card className="border-dashed p-8 text-center text-slate-400 bg-white">
                <FileCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <span className="text-xs font-mono block">No credentials Issued Yet</span>
                <p className="text-[10px] text-slate-450 max-w-sm mx-auto mt-1">Once you satisfy the course requirements (Attendance Rate of 80% or more and Active Evaluation Status), your teacher will issue your cryptographic academic certification here.</p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {issuedCertificates.map((cert) => {
                  const correspondingCourse = enrolledCourses.find((c) => c.id === cert.courseId);
                  return (
                    <Card key={cert.id} className="border-amber-200 bg-amber-50/5 relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Award className="h-24 w-24 text-amber-600" />
                      </div>
                      <CardHeader className="pb-2">
                        <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200 w-fit">
                          {cert.status || 'valid'}
                        </span>
                        <CardTitle className="text-sm font-bold text-slate-800 mt-1 font-serif">Certificate of Course Completion</CardTitle>
                        <CardDescription className="text-xs text-slate-500 font-semibold mt-0.5">
                          {cert.courseTitle || correspondingCourse?.title || 'Academic Program'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="text-[10px] space-y-1 text-slate-500 font-mono">
                          <div><span className="font-bold">Credential No:</span> {cert.certificateNumber}</div>
                          <div><span className="font-bold">Verification Hash:</span> {cert.verificationCode}</div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex items-center gap-2 mt-auto pb-4 pt-0">
                        <Button variant="secondary" size="xs" onClick={() => downloadCredentialPDF(cert)} className="w-full text-[10px] text-amber-800 hover:bg-amber-50 border-amber-200 bg-amber-50/20 font-bold">
                          <Download className="h-3 w-3 mr-1" /> Download PDF Credential
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filtering Dropdown selection */}
          <div className="bg-white p-4 border border-slate-200/60 shadow-xs rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-xl">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider shrink-0 mt-0.5">
                Active Registry Focus:
              </label>
              <div className="w-full">
                <Select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="py-1.5 text-xs font-semibold bg-slate-50"
                >
                  <option value="all">Summarize All Enrolled Courses</option>
                  {enrolledCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.title}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider shrink-0 mt-0.5">
              Refreshed: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* KPI Dashboard stats boards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="dashboard-metric-boards">
            {summaryKpiCards.map((card, idx) => {
              const IconComp = card.icon;
              return (
                <Card key={idx} id={`student-kpi-${idx}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center gap-4 p-5">
                    <span className={`p-3 rounded-xl shrink-0 ${card.color}`}>
                      <IconComp className="h-5 w-5" />
                    </span>
                    <div className="overflow-hidden">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {card.title}
                      </span>
                      <p className="text-xl font-black text-slate-800 mt-1 leading-none">{card.value}</p>
                      <span className="text-[10px] text-slate-500 truncate block mt-1.5 font-sans font-medium">{card.desc}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Visual Progress card & upcoming split layouts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="student-progress-upcoming">
            <div className="lg:col-span-2">
              <ProgressCard
                courseName={
                  selectedCourseId === 'all'
                    ? 'Total Semester Curriculum Aggregation'
                    : coursesMap[selectedCourseId]?.title || 'Enrolled Course Progress'
                }
                courseCode={selectedCourseId === 'all' ? 'MULTI' : coursesMap[selectedCourseId]?.code || 'CRS'}
                attendanceCount={studentMetricsSummary.attendedCount}
                attendanceRate={studentMetricsSummary.averageRateValue}
                attendanceScore={studentMetricsSummary.scoreValue}
                completedSessions={studentMetricsSummary.completedSessCount}
                remainingSessions={studentMetricsSummary.remainingCount}
                totalPlannedSessions={studentMetricsSummary.plannedSessCount}
                maxPoints={studentMetricsSummary.maxScoreValue}
              />
            </div>

            {/* Upcoming sessions timeline */}
            <div className="flex flex-col gap-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-500" /> Upcoming Class Sessions Target
              </h3>

              <Card className="h-full border border-slate-200" id="upcoming-sessions-panel">
                <CardContent className="p-4 divide-y divide-slate-100 flex flex-col justify-start">
                  {studentMetricsSummary.upcoming.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-mono text-xs">
                      No active upcoming class lectures. Keep attendance status monitors set.
                    </div>
                  ) : (
                    studentMetricsSummary.upcoming.map(({ sessionObj, courseCode, meetingLink }) => (
                      <div key={sessionObj.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3 hover:bg-slate-50/40 transition-colors justify-between">
                        <div className="overflow-hidden flex items-start gap-2">
                          <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold leading-none shrink-0 h-9 w-9 flex items-center justify-center flex-col">
                            <Clock className="h-4.5 w-4.5 mb-0.5 text-indigo-500" />
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-1 truncate">{sessionObj.title}</h4>
                            <span className="font-mono text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded mr-2 uppercase">
                              {courseCode}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono font-medium">{sessionObj.date} | {sessionObj.startTime} - {sessionObj.endTime}</span>
                          </div>
                        </div>
                        {meetingLink && (
                          <Button variant="secondary" size="xs" onClick={() => window.open(meetingLink, '_blank', 'referrer')} className="text-[9px] font-bold whitespace-nowrap px-1.5 py-1">
                            Join <ExternalLink className="h-2.5 w-2.5 ml-0.5 inline" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Historical Logs summary table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4" id="timetable-scans-summary">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" /> Checked sessions timeline history (Complete)
            </h3>

            <Table id="student-scans-timeline-table">
              <Thead>
                <Tr>
                  <Th>Registration Course</Th>
                  <Th>Session Label</Th>
                  <Th>Session Date</Th>
                  <Th>Check-in Time</Th>
                  <Th className="text-center">Scan Status</Th>
                  <Th>Instructor remarks</Th>
                </Tr>
              </Thead>
              <Tbody>
                {studentMetricsSummary.timeline.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} className="text-center text-slate-400 font-mono text-xs py-8">
                      No class checkins discovered on timeline records. Try scanning active QRs first.
                    </Td>
                  </Tr>
                ) : (
                  studentMetricsSummary.timeline.map((row, index) => (
                    <Tr key={`${row.sessionId}-${index}`} className="hover:bg-slate-50/30">
                      <Td className="font-mono text-xs font-bold text-indigo-600">
                        <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {row.courseCode}
                        </span>
                      </Td>
                      <Td className="font-bold text-slate-800 text-sm">{row.sessionTitle}</Td>
                      <Td className="text-slate-400 font-mono text-xs">{row.date}</Td>
                      <Td className="text-slate-400 font-mono text-xs">{row.time}</Td>
                      <Td className="text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            row.status === 'present'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : row.status === 'late'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : row.status === 'absent'
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : row.status === 'excused'
                              ? 'bg-purple-50 text-purple-700 border border-purple-100'
                              : 'bg-slate-50 text-slate-400'
                          }`}
                        >
                          {row.status}
                        </span>
                      </Td>
                      <Td className="text-slate-500 text-xs italic font-sans max-w-[150px] truncate" title={row.remarks}>
                        {row.remarks}
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentDashboard;
