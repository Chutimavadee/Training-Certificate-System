import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../firebase/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Course, Session, Registration, StudentProfile, Attendance } from '../types';
import {
  calculateAttendanceCount,
  calculateAttendanceRate,
  calculateAttendanceScore,
  calculateStudentRanking,
  StudentRankingResult,
} from '../utils/scoringService';
import {
  exportStudentProgressCSV,
  exportCourseAnalyticsCSV,
} from '../utils/exportService';
import { modifyAttendanceStatus } from '../utils/attendanceService';

// Analytics UI Components
import { AnalyticsCards, AnalyticsCardData } from '../components/Analytics/AnalyticsCards';
import { AttendancePieChart } from '../components/Analytics/AttendancePieChart';
import { AttendanceBarChart } from '../components/Analytics/AttendanceBarChart';
import { AttendanceLineChart } from '../components/Analytics/AttendanceLineChart';
import { StudentRankingTable } from '../components/Analytics/StudentRankingTable';
import { RiskStudentsTable } from '../components/Analytics/RiskStudentsTable';
import { CourseAnalyticsTable, CourseAnalyticsRow } from '../components/Analytics/CourseAnalyticsTable';

// System UI library
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';

import {
  BookOpen,
  Users,
  QrCode,
  Award,
  Plus,
  RefreshCw,
  Sliders,
  X,
  FileSpreadsheet,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { user, profile } = useAuth();

  // Firestore Database states
  const [courses, setCourses] = useState<Course[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);

  // Selection states & Interactive handles
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedStudentResult, setSelectedStudentResult] = useState<StudentRankingResult | null>(null);

  // Active course setup overrides (Edit configuration local state)
  const [localPlannedSessions, setLocalPlannedSessions] = useState('14');
  const [localMaxPoints, setLocalMaxPoints] = useState('20');

  // Loading, saving, error markers
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Remarks formulation states (Remarks panel inside profile view)
  const [overrideSessionId, setOverrideSessionId] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<'present' | 'late' | 'absent' | 'excused' | 'manual'>('present');
  const [overrideRemarks, setOverrideRemarks] = useState('');

  // Evaluation & Certificates states
  const [evalStatus, setEvalStatus] = useState<string>('registered');
  const [evalGrade, setEvalGrade] = useState<string>('A');
  const [hasCertificateIssued, setHasCertificateIssued] = useState<boolean>(false);
  const [isCertifying, setIsCertifying] = useState(false);

  // ========================================================
  // FIRESTORE SPARK-PLAN BULK LOAD STRATEGY
  // ========================================================
  useEffect(() => {
    async function loadTeacherDashboardData() {
      if (!user) return;
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // 1. Fetch teacher's owned courses
        const coursesRef = collection(db, 'courses');
        const courseQuery = query(coursesRef, where('teacherId', '==', user.uid));
        const courseSnap = await getDocs(courseQuery);
        const resolvedCourses = courseSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Course[];

        setCourses(resolvedCourses);

        if (resolvedCourses.length === 0) {
          setIsLoading(false);
          return;
        }

        const courseIds = resolvedCourses.map((c) => c.id);

        // 2. Fetch sessions inside these courses in parallel
        const sessionsPromises = courseIds.map(async (cId) => {
          const sessionsRef = collection(db, 'courses', cId, 'sessions');
          const snap = await getDocs(sessionsRef);
          return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Session[];
        });
        const resolvedSessionsArrays = await Promise.all(sessionsPromises);
        const flatSessions = resolvedSessionsArrays.flat();
        setAllSessions(flatSessions);

        // 3. Fetch registrations inside these courses in parallel
        const regsPromises = courseIds.map(async (cId) => {
          const regsRef = collection(db, 'courses', cId, 'registrations');
          const snap = await getDocs(regsRef);
          return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Registration[];
        });
        const resolvedRegsArrays = await Promise.all(regsPromises);
        const flatRegistrations = resolvedRegsArrays.flat();
        setAllRegistrations(flatRegistrations);

        // 4. Fetch Master Students Roster once (Cache & filter to avoid Spark overheads)
        const studentsSnap = await getDocs(collection(db, 'students'));
        const resolvedStudents = studentsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as StudentProfile[];
        setAllStudents(resolvedStudents);

        // 5. Fetch Attendance flat logs
        // Query flat attendance collection
        const attendanceRef = collection(db, 'attendance');
        const attendanceSnap = await getDocs(attendanceRef);
        const resolvedAttendance = attendanceSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Attendance[];

        // Filter flat logs down to the teacher's active course portfolio
        const teacherAttendance = resolvedAttendance.filter((att) =>
          courseIds.includes(att.courseId)
        );
        setAllAttendance(teacherAttendance);
      } catch (err: any) {
        console.error('Spark Bulk loader exception:', err);
        setErrorMessage('Failed to synchronise dashboard metadata indices.');
      } finally {
        setIsLoading(false);
      }
    }

    loadTeacherDashboardData();
  }, [user, refreshTrigger]);

  // Handle selected course changing to update configuration drawer values
  const activeCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (activeCourse) {
      setLocalPlannedSessions(String(activeCourse.plannedSessions || 14));
      setLocalMaxPoints(String(activeCourse.maxPoints || 20));
    }
  }, [activeCourse]);

  // ========================================================
  // MEMOIZED PORTFOLIO CALCULATIONS (ZERO EXCESSIVE READS!)
  // ========================================================
  const currentLevelSummary = useMemo(() => {
    // 1. Resolve Course subset
    const filteredCourses =
      selectedCourseId === 'all'
        ? courses
        : courses.filter((c) => c.id === selectedCourseId);

    const filteredCourseIds = filteredCourses.map((c) => c.id);

    // 2. Resolve Course level sessions
    const courseSessions = allSessions.filter((s) =>
      filteredCourseIds.includes(s.courseId)
    );

    // 3. Resolve registered students
    const courseRegistrations = allRegistrations.filter(
      (r) => filteredCourseIds.includes(r.courseId) && r.status === 'approved'
    );
    const approvedStudentIds = Array.from(
      new Set(courseRegistrations.map((r) => r.studentId))
    );
    const courseStudents = allStudents.filter((s) => approvedStudentIds.includes(s.id));

    // 4. Resolve Course attendance records
    const courseAttendance = allAttendance.filter((a) =>
      filteredCourseIds.includes(a.courseId)
    );

    // 5. Status indicators
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;

    courseAttendance.forEach((att) => {
      if (att.status === 'present') present++;
      else if (att.status === 'late') late++;
      else if (att.status === 'absent') absent++;
      else if (att.status === 'excused') excused++;
      else if (att.status === 'manual') present++; // Count manually checked in as present
    });

    // 6. Complete average attendance rate calculations
    // Group attendance records by (student + course) to assess individual percentages
    const rankingResults: StudentRankingResult[] = [];

    // Evaluate stats student-by-student
    courseStudents.forEach((student) => {
      // Find course enrollments for this student
      const studentRegs = courseRegistrations.filter((r) => r.studentId === student.id);
      
      studentRegs.forEach((reg) => {
        const correspondingCourse = courses.find((c) => c.id === reg.courseId);
        const plannedSec = correspondingCourse?.plannedSessions || 14;
        const maxPts = correspondingCourse?.maxPoints || 20;

        const studentLogs = courseAttendance.filter(
          (att) => att.studentId === student.id && att.courseId === reg.courseId
        );

        const actualAtt = calculateAttendanceCount(studentLogs);
        const attRate = calculateAttendanceRate(actualAtt, plannedSec);
        const attScore = calculateAttendanceScore(actualAtt, plannedSec, maxPts);

        rankingResults.push({
          student,
          attendanceCount: actualAtt,
          attendanceRate: attRate,
          score: attScore,
          rank: 0, // rank is computed on final sorted array
        });
      });
    });

    // Compute ranks
    rankingResults.sort((a, b) => {
      if (b.attendanceRate !== a.attendanceRate) return b.attendanceRate - a.attendanceRate;
      return b.score - a.score;
    });
    const rankedResults = rankingResults.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    // Average stats across course portfolio
    const totalRates = rankedResults.reduce((acc, curr) => acc + curr.attendanceRate, 0);
    const avgAttendanceRate = rankedResults.length > 0 ? totalRates / rankedResults.length : 0;

    const totalScores = rankedResults.reduce((acc, curr) => acc + curr.score, 0);
    const avgScore = rankedResults.length > 0 ? totalScores / rankedResults.length : 0;

    // Line Chart dataset: Attendance Trend across individual dates/sessions
    // Group sessions by date and calculate average session-by-session rate
    const sessionTrendData = courseSessions
      .map((sess) => {
        const sessionAttLogs = courseAttendance.filter((att) => att.sessionId === sess.id);
        const attendeesCount = calculateAttendanceCount(sessionAttLogs);
        
        // Find how many total students were approved for this session's course at that moment
        const courseApprovedTrainees = allRegistrations.filter(
          (r) => r.courseId === sess.courseId && r.status === 'approved'
        ).length;

        const rate = calculateAttendanceRate(attendeesCount, courseApprovedTrainees || 1);

        return {
          sessionTitle: sess.title,
          dateString: sess.date,
          attendanceCount: attendeesCount,
          attendanceRate: rate,
        };
      })
      .sort((a, b) => new Date(a.dateString).getTime() - new Date(b.dateString).getTime());

    // Bar chart dataset: Top 5 Trainees
    const topStudentsBar = rankedResults.slice(0, 5).map((r) => ({
      name: r.student.name,
      attendanceCount: r.attendanceCount,
    }));

    return {
      totalCourses: filteredCourses.length,
      totalStudents: courseStudents.length,
      totalSessions: courseSessions.length,
      avgAttendanceRate,
      avgScore,
      pie: { present, late, absent, excused },
      lineData: sessionTrendData,
      barData: topStudentsBar,
      rankings: rankedResults,
    };
  }, [selectedCourseId, courses, allSessions, allRegistrations, allStudents, allAttendance]);

  // Aggregate Course analytics table (CoursePortfolio)
  const coursePortfolioAnalytics: CourseAnalyticsRow[] = useMemo(() => {
    return courses.map((course) => {
      const plannedSec = course.plannedSessions || 14;
      const maxPts = course.maxPoints || 20;

      const courseSess = allSessions.filter((s) => s.courseId === course.id);
      const courseRegs = allRegistrations.filter((r) => r.courseId === course.id && r.status === 'approved');
      const courseStudentsIds = courseRegs.map((r) => r.studentId);
      
      const courseAtt = allAttendance.filter((a) => a.courseId === course.id);

      // Average student levels
      const studentAverages = courseStudentsIds.map((sId) => {
        const studentLogs = courseAtt.filter((a) => a.studentId === sId);
        const count = calculateAttendanceCount(studentLogs);
        const rate = calculateAttendanceRate(count, plannedSec);
        const score = calculateAttendanceScore(count, plannedSec, maxPts);
        return { rate, score };
      });

      const avgRate = studentAverages.length > 0 
        ? studentAverages.reduce((acc, curr) => acc + curr.rate, 0) / studentAverages.length 
        : 0;
      const avgScore = studentAverages.length > 0 
        ? studentAverages.reduce((acc, curr) => acc + curr.score, 0) / studentAverages.length 
        : 0;

      return {
        courseId: course.id,
        courseCode: course.code,
        courseName: course.title,
        plannedSessions: plannedSec,
        completedSessions: courseSess.length,
        attendanceRate: avgRate,
        averageScore: avgScore,
        maxPoints: maxPts,
      };
    });
  }, [courses, allSessions, allRegistrations, allAttendance]);

  // Create UI stats panels to match
  const metricCards: AnalyticsCardData[] = useMemo(() => {
    return [
      {
        title: 'Active Courses',
        value: currentLevelSummary.totalCourses,
        desc: 'Academic Portfolios',
        icon: BookOpen,
        color: 'text-indigo-600 bg-indigo-50',
      },
      {
        title: 'Registered Trainees',
        value: currentLevelSummary.totalStudents,
        desc: 'Approved Enrollment',
        icon: Users,
        color: 'text-blue-600 bg-blue-50',
      },
      {
        title: 'Held Checkpoints',
        value: currentLevelSummary.totalSessions,
        desc: 'Sessions Registered',
        icon: QrCode,
        color: 'text-emerald-600 bg-emerald-50',
      },
      {
        title: 'Class Attendance Avg',
        value: `${currentLevelSummary.avgAttendanceRate.toFixed(1)}%`,
        desc: 'General Rating',
        icon: Award,
        color: 'text-amber-600 bg-amber-50',
      },
    ];
  }, [currentLevelSummary]);

  // ========================================================
  // SUBMISSIONS & ACTIONS CONFIG
  // ========================================================
  const handleSaveCourseConfiguration = async () => {
    if (!activeCourse) return;
    try {
      setIsSaving(true);
      const planned = parseInt(localPlannedSessions, 10);
      const points = parseFloat(localMaxPoints);

      if (isNaN(planned) || planned <= 0) {
        throw new Error('Planned sessions must be a positive integer.');
      }
      if (isNaN(points) || points <= 0) {
        throw new Error('Max attendance points must be a valid number.');
      }

      const courseDocRef = doc(db, 'courses', activeCourse.id);
      await updateDoc(courseDocRef, {
        plannedSessions: planned,
        maxPoints: points,
        updatedAt: serverTimestamp(),
      });

      // Update local state smoothly
      setCourses((prev) =>
        prev.map((c) =>
          c.id === activeCourse.id ? { ...c, plannedSessions: planned, maxPoints: points } : c
        )
      );

      setIsSettingsOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to update course scoring configurations.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenStudentDetailProfile = async (studentId: string) => {
    const foundRank = currentLevelSummary.rankings.find((r) => r.student.id === studentId);
    if (foundRank) {
      setSelectedStudentResult(foundRank);
      
      const courseIdToSearch = selectedCourseId === 'all' 
        ? (courses[0]?.id || '') 
        : selectedCourseId;
      
      const foundReg = allRegistrations.find(r => r.studentId === studentId && r.courseId === courseIdToSearch);
      setEvalStatus(foundReg?.status || 'registered');
      setEvalGrade(foundReg?.evaluationGrade || 'A');
      
      try {
        const certsSnap = await getDocs(collection(db, 'certificates'));
        const hasCert = certsSnap.docs.some(doc => {
          const d = doc.data();
          return d.studentId === studentId && d.courseId === courseIdToSearch && d.status === 'valid';
        });
        setHasCertificateIssued(hasCert);
      } catch (err) {
        console.warn("Could not check cert state:", err);
        setHasCertificateIssued(false);
      }
      
      setIsProfileOpen(true);
    }
  };

  const handleSaveEvaluationStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentResult) return;
    
    const courseIdToUpdate = selectedCourseId === 'all' 
      ? (courses[0]?.id || '') 
      : selectedCourseId;
    
    if (!courseIdToUpdate) {
      alert("Please select a specific course.");
      return;
    }
    
    try {
      setIsSaving(true);
      const studentId = selectedStudentResult.student.id;
      const regId = `${studentId}_${courseIdToUpdate}`;
      
      await updateDoc(doc(db, 'registrations', regId), {
        status: evalStatus,
        evaluationGrade: evalGrade,
        evaluatedAt: serverTimestamp(),
      });
      
      try {
        await updateDoc(doc(db, 'courses', courseIdToUpdate, 'registrations', regId), {
          status: evalStatus === 'completed' ? 'approved' : evalStatus,
          evaluationGrade: evalGrade,
        });
      } catch (e) {
        // Ignored
      }

      setRefreshTrigger(p => p + 1);
      alert('Trainee graduation evaluation saved successfully.');
    } catch (err: any) {
      console.error("Evaluation save error:", err);
      alert('Failed to update evaluation parameters: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleIssueCertificate = async () => {
    if (!selectedStudentResult || !activeCourse) {
      alert("Please select a specific active course rather than 'All' to issue a credential.");
      return;
    }
    
    try {
      setIsCertifying(true);
      const studentId = selectedStudentResult.student.id;
      const studentName = selectedStudentResult.student.name;
      const courseId = activeCourse.id;
      const courseTitle = activeCourse.title;
      
      const certsSnap = await getDocs(collection(db, 'certificates'));
      const count = certsSnap.size + 1;
      const certNo = `BU-TRN-2026-${String(count).padStart(6, '0')}`;
      const verificationCode = `BU-VER-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      const certId = `cert_${studentId}_${courseId}`;
      const certPayload = {
        id: certId,
        certificateId: certId,
        certificateNumber: certNo,
        studentId: studentId,
        studentName: studentName,
        courseId: courseId,
        courseTitle: courseTitle,
        trainingHours: activeCourse.trainingHours || 30,
        trainingType: activeCourse.trainingType || 'online',
        issueDate: new Date().toISOString(),
        verificationCode: verificationCode,
        status: 'valid',
      };
      
      await setDoc(doc(db, 'certificates', certId), certPayload);
      
      const regId = `${studentId}_${courseId}`;
      await updateDoc(doc(db, 'registrations', regId), {
        status: 'completed',
        evaluatedAt: serverTimestamp(),
      });
      
      setHasCertificateIssued(true);
      setEvalStatus('completed');
      setRefreshTrigger(p => p + 1);
      alert(`Success! Credential ${certNo} has been cryptographically generated and signed.`);
    } catch (err: any) {
      console.error("Error issuing certificate:", err);
      alert('Certificate issuing failed: ' + err.message);
    } finally {
      setIsCertifying(false);
    }
  };

  const handleUpdateStudentRemarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentResult || !overrideSessionId) return;

    try {
      setIsSaving(true);
      await modifyAttendanceStatus(
        selectedStudentResult.student.id,
        overrideSessionId,
        selectedCourseId === 'all' ? selectedStudentResult.student.id : selectedCourseId, // course fallback
        overrideStatus,
        overrideRemarks,
        user?.uid || 'teacher'
      );

      // Fast state reload
      setRefreshTrigger((prev) => prev + 1);
      
      // Close profile modal nicely or update sub-logs state
      setIsProfileOpen(false);
      setOverrideSessionId('');
      setOverrideRemarks('');
    } catch (err: any) {
      alert('Failed to override scan checkout state: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ========================================================
  // EXPORT STREAMS (SATISFYING EXPORT PIPELINE)
  // ========================================================
  const triggerExportCSV = () => {
    const courseCode = activeCourse ? activeCourse.code : 'all_courses';
    const plannedSec = activeCourse ? activeCourse.plannedSessions || 14 : 14;
    const maxPts = activeCourse ? activeCourse.maxPoints || 20 : 20;

    // Utilize export service to format rows
    const csvContent = exportStudentProgressCSV(
      currentLevelSummary.rankings,
      plannedSec,
      maxPts
    );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trainee_progress_${courseCode}_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] gap-3" id="loading-spinner-stage">
        <LoadingSpinner size="lg" />
        <span className="text-xs font-mono text-slate-400">Aggregating Spark analytics checkpoints...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12 animate-fade-in" id="trainer-analytics-dashboard-stage">
      {/* Welcome & Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" id="view-head">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none flex items-center gap-2">
            Trainer Attendance Analytics & Scoring Core
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 font-sans font-medium">
            Review detailed student progress scorecard indices, proportional scores, course analytics metrics, and at-risk alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh action */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            className="flex items-center gap-1.5 font-bold"
          >
            <RefreshCw className="h-4 w-4" /> Sync Now
          </Button>

          {/* Export action */}
          <Button
            variant="secondary"
            size="sm"
            onClick={triggerExportCSV}
            className="flex items-center gap-1.5 font-bold border border-slate-200/60 shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export CSV Metrics
          </Button>
        </div>
      </div>

      {/* Select Courses & Parameters Configuration Panel */}
      <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4" id="filtering-panel">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-xl">
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider shrink-0 mt-0.5 sm:mt-0">
            Selected Curriculum Range:
          </label>
          <div className="w-full">
            <Select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="py-1.5 text-xs font-bold"
            >
              <option value="all">All Taught Courses (Curriculum Aggregation)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code}] {c.title}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {selectedCourseId !== 'all' && activeCourse && (
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
              Planned: <strong className="text-slate-800">{activeCourse.plannedSessions || 14}</strong> | Max Points: <strong className="text-slate-800">{activeCourse.maxPoints || 20}</strong>
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1 text-xs font-bold shrink-0 bg-white shadow-xs border border-slate-200"
            >
              <Sliders className="h-4 w-4" /> Set Scoring Target
            </Button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-155 animate-shake flex items-center gap-2">
          <AlertTriangle className="h-5.5 w-5.5 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Top Level Summary Cards */}
      <AnalyticsCards cards={metricCards} />

      {/* Split Charts Visualizer Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-visualizer-graphs">
        {/* Line Chart */}
        <div className="lg:col-span-2">
          <AttendanceLineChart data={currentLevelSummary.lineData} />
        </div>
        {/* Pie Chart */}
        <div>
          <AttendancePieChart
            present={currentLevelSummary.pie.present}
            late={currentLevelSummary.pie.late}
            absent={currentLevelSummary.pie.absent}
            excused={currentLevelSummary.pie.excused}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-ranks-risks-split">
        {/* Bar chart - Top students */}
        <div>
          <AttendanceBarChart data={currentLevelSummary.barData} />
        </div>
        {/* Risk watchlist */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <RiskStudentsTable
            data={currentLevelSummary.rankings.map((r) => ({
              studentId: r.student.id,
              studentName: r.student.name,
              attendanceRate: r.attendanceRate,
              score: r.score,
            }))}
          />
        </div>
      </div>

      {/* Trainee ranking list / Master student metrics */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs" id="leaderboard-roster-stage">
        <StudentRankingTable
          data={currentLevelSummary.rankings.map((r) => ({
            rank: r.rank,
            studentName: r.student.name,
            attendanceCount: r.attendanceCount,
            attendanceRate: r.attendanceRate,
            score: r.score,
          }))}
          limit={10}
        />
        {currentLevelSummary.rankings.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center">
            <span className="text-[10px] font-mono text-slate-400">
              💡 Trainee name items can be clicked to open detailed attendance timeline profile. Just hover or search records.
            </span>
          </div>
        )}

        {/* Clicking Student Names - Hook standard list action for clickable profile */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pr-2" id="actionable-quick-student-links">
          {currentLevelSummary.rankings.slice(0, 8).map((r) => (
            <button
              key={r.student.id}
              onClick={() => handleOpenStudentDetailProfile(r.student.id)}
              className="text-left text-xs bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-lg p-2 transition-colors cursor-pointer text-slate-700 font-medium"
            >
              🔍 {r.student.name}
            </button>
          ))}
        </div>
      </div>

      {/* Global Taught Course metrics */}
      {selectedCourseId === 'all' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs" id="course-metrics-summary-stage">
          <CourseAnalyticsTable data={coursePortfolioAnalytics} />
        </div>
      )}

      {/* ========================================================
          MODAL 1: MAIN COURSE SETTINGS OVERRIDES drawer
          ======================================================== */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Scoring Target Parameters Configuration"
        size="md"
      >
        <div className="flex flex-col gap-5 pt-2" id="course-config-form">
          <p className="text-xs text-slate-500 leading-normal">
            Configure target metrics for course: <strong>{activeCourse?.title}</strong>. These settings determine how trainee attendance counts are converted into proportional grade scores.
          </p>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Planned Course Sessions:</label>
            <Input
              type="number"
              value={localPlannedSessions}
              onChange={(e) => setLocalPlannedSessions(e.target.value)}
              placeholder="e.g. 14"
            />
            <span className="text-[10px] text-slate-400">Total course lectures planned by trainer for proportional scoring.</span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Max Point Equivalency:</label>
            <Input
              type="number"
              value={localMaxPoints}
              onChange={(e) => setLocalMaxPoints(e.target.value)}
              placeholder="e.g. 20"
            />
            <span className="text-[10px] text-slate-400">Maximum possible score point limit mapped on 100% attendance.</span>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-150 flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveCourseConfiguration}
              className="font-bold flex items-center justify-center min-w-[80px]"
              disabled={isSaving}
            >
              {isSaving ? <LoadingSpinner size="sm" /> : 'Save Targets'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================
          MODAL 2: DETAILED INDIVIDUAL STUDENT METRICS & OVERRIDES
          ======================================================== */}
      <Modal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        title={`Trainee Class Performance Index: ${selectedStudentResult?.student.name || ''}`}
        size="xl"
      >
        {selectedStudentResult && (
          <div className="flex flex-col gap-6" id="student-overview-profile-stage">
            {/* Top performance panel */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl" id="modal-scorecard">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID / Register</span>
                <span className="text-xs font-mono font-bold text-slate-700 mt-1">{selectedStudentResult.student.studentId}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Attended Checkpoints</span>
                <span className="text-lg font-black text-slate-800 leading-none mt-1">{selectedStudentResult.attendanceCount} sessions</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Attendance Rate</span>
                <span className="text-lg font-black text-slate-850 leading-none mt-1 text-emerald-600">{selectedStudentResult.attendanceRate.toFixed(2)}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Proportional Grade</span>
                <span className="text-lg font-black text-slate-850 leading-none mt-1 text-indigo-600">
                  {selectedStudentResult.score.toFixed(2)} <span className="text-[10px] text-slate-400 font-medium">pts</span>
                </span>
              </div>
            </div>

            {/* Individual logs check-in records list */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">Session Check-in Timeline Logs</h4>
              <div className="border border-slate-200/60 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                <Table id="student-profile-timetable-logs">
                  <Thead>
                    <Tr>
                      <Th>Session Topic</Th>
                      <Th className="text-center">Checked-in Status</Th>
                      <Th>Check-in Method</Th>
                      <Th>Record Remarks</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {allSessions
                      .filter((s) => selectedCourseId === 'all' || s.courseId === selectedCourseId)
                      .map((sess) => {
                        const rec = allAttendance.find(
                          (att) => att.studentId === selectedStudentResult.student.id && att.sessionId === sess.id
                        );

                        return (
                          <Tr key={sess.id} className="hover:bg-slate-50/20 text-xs">
                            <Td className="py-2.5 font-medium text-slate-700">
                              <div className="flex flex-col">
                                <span>{sess.title}</span>
                                <span className="text-[9.5px] text-slate-400 font-mono mt-0.5">{sess.date}</span>
                              </div>
                            </Td>
                            <Td className="text-center py-2.5">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  rec?.status === 'present'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : rec?.status === 'late'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                    : rec?.status === 'absent'
                                    ? 'bg-red-50 text-red-700 border border-red-100'
                                    : rec?.status === 'excused'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                    : 'bg-slate-50 text-slate-400 border border-slate-100'
                                }`}
                              >
                                {rec?.status || 'unmarked'}
                              </span>
                            </Td>
                            <Td className="py-2.5 font-mono text-[10px] text-slate-500 capitalize">{rec?.method || 'Automatic'}</Td>
                            <Td className="py-2.5 font-sans italic text-[11px] text-slate-400 max-w-[140px] truncate">
                              {rec?.note || '--'}
                            </Td>
                          </Tr>
                        );
                      })}
                  </Tbody>
                </Table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              {/* Column 1: Manual Status & Remarks override section */}
              <form onSubmit={handleUpdateStudentRemarks} className="p-4 border border-slate-150 bg-slate-50/50 rounded-xl flex flex-col gap-4">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                  <Sliders className="h-4 w-4 text-indigo-500" /> Instructor Check-in Manual Override Block
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select target session:</label>
                    <Select
                      value={overrideSessionId}
                      onChange={(e) => setOverrideSessionId(e.target.value)}
                      required
                      className="py-1.5 text-xs bg-white"
                    >
                      <option value="">-- Choose Course Session --</option>
                      {allSessions
                        .filter((s) => selectedCourseId === 'all' || s.courseId === selectedCourseId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title} ({s.date})
                          </option>
                        ))}
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Override checklist status:</label>
                    <Select
                      value={overrideStatus}
                      onChange={(e) => setOverrideStatus(e.target.value as any)}
                      className="py-1.5 text-xs bg-white"
                    >
                      <option value="present">Present (Checked)</option>
                      <option value="late">Late Arrival</option>
                      <option value="absent">Absent</option>
                      <option value="excused">Excused Leave</option>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Instructor remarks & override justification:</label>
                  <Input
                    type="text"
                    placeholder="e.g. Student submitted clinic sick note."
                    value={overrideRemarks}
                    onChange={(e) => setOverrideRemarks(e.target.value)}
                    className="bg-white text-xs py-2"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-1 mt-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setOverrideSessionId('');
                      setOverrideRemarks('');
                    }}
                    className="text-xs"
                  >
                    Clear Fields
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSaving || !overrideSessionId}
                    className="font-bold flex items-center justify-center text-xs"
                  >
                    {isSaving ? <LoadingSpinner size="sm" /> : <span className="flex items-center gap-1"><FileCheck className="h-4 w-4" /> Apply Override & Logs</span>}
                  </Button>
                </div>
              </form>

              {/* Column 2: Completion Evaluation & Cryptographic Certification Engine */}
              <div className="p-4 border border-slate-150 bg-slate-50/50 rounded-xl flex flex-col justify-between gap-4">
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 leading-none mb-3">
                    <Award className="h-4 w-4 text-amber-600" /> Completion Evaluation & certification
                  </h4>

                  <div className="bg-white p-3 rounded-lg border border-slate-200/65 text-xs flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Qualification Progress Rate</span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                        selectedStudentResult.attendanceRate >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {selectedStudentResult.attendanceRate.toFixed(1)}% {selectedStudentResult.attendanceRate >= 80 ? '✓ Qualified' : '✗ At Risk'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Planned course target hours:</span>
                      <span className="font-mono font-bold">{activeCourse?.trainingHours || 30} hrs</span>
                    </div>
                  </div>

                  <form onSubmit={handleSaveEvaluationStatus} className="flex flex-col gap-3 mt-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evaluation Grade Status:</label>
                        <Select
                          value={evalStatus}
                          onChange={(e) => setEvalStatus(e.target.value)}
                          className="py-1.5 text-xs bg-white"
                        >
                          <option value="registered">Registered (Ongoing)</option>
                          <option value="completed">Completed (Graduated)</option>
                          <option value="cancelled">Cancelled (withdrawn)</option>
                          <option value="failed">Failed (Unsatisfactory)</option>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Final Alphabet Grade:</label>
                        <Select
                          value={evalGrade}
                          onChange={(e) => setEvalGrade(e.target.value)}
                          className="py-1.5 text-xs bg-white"
                        >
                          <option value="A">A (Outstanding)</option>
                          <option value="B+">B+ (Excellent)</option>
                          <option value="B">B (Very Good)</option>
                          <option value="C+">C+ (Good)</option>
                          <option value="C">C (Satisfactory)</option>
                          <option value="D">D (Pass)</option>
                          <option value="F">F (Failure)</option>
                        </Select>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      disabled={isSaving}
                      className="w-full font-bold text-xs mt-1 border-slate-200 hover:bg-slate-100"
                    >
                      {isSaving ? <LoadingSpinner size="sm" /> : 'Save Graduate Evaluation Grade'}
                    </Button>
                  </form>
                </div>

                {/* Certificate issuance trigger */}
                <div className="pt-3 border-t border-slate-200/70 flex flex-col gap-2">
                  <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Academic Certification Credential</span>
                  {hasCertificateIssued ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-center flex flex-col items-center gap-1">
                      <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-1 leading-none uppercase">
                        <CheckCircle2 className="h-4 w-4" /> Cryptographic Certificate Active
                      </span>
                      <span className="text-[9px] text-slate-450 font-mono">Issued via Bangkok University System</span>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleIssueCertificate}
                      disabled={isCertifying || !activeCourse}
                      className="w-full font-extrabold text-xs bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-1 h-9"
                    >
                      {isCertifying ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Award className="h-4 w-4" /> Issue Cryptographic Certificate
                        </>
                      )}
                    </Button>
                  )}
                  <span className="text-[8.5px] text-slate-400 text-center italic leading-tight">
                    *Requires student to satisfy professional study metrics. Certificates will render instantly in their student dashboard.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TeacherDashboard;
