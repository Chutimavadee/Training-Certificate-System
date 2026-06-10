import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';

// Sub-components
import { AttendanceScanner } from '../components/Attendance/AttendanceScanner';
import { AttendanceDashboard } from '../components/Attendance/AttendanceDashboard';
import { AttendanceHistoryCard } from '../components/Attendance/AttendanceHistoryCard';

import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Sparkles, ShieldCheck, RefreshCw, Layers, PlusCircle, BookOpen } from 'lucide-react';
import { Attendance, StudentProfile, Course, Session, QrSession } from '../types';
import { validateTOTPToken } from '../utils/crypto';
import { sendAttendanceEmail } from '../utils/gasService';
import { logAudit, logError } from '../utils/loggerService';

export const AttendancePage: React.FC = () => {
  const { user, role, profile } = useAuth();
  
  // App context states
  const [loading, setLoading] = useState<boolean>(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  // Attendance state
  const [activeQrSession, setActiveQrSession] = useState<QrSession | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [lateMinutes, setLateMinutes] = useState<number>(15);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [registeredStudents, setRegisteredStudents] = useState<StudentProfile[]>([]);

  // Student specific stats/maps
  const [studentRecords, setStudentRecords] = useState<Attendance[]>([]);
  const [coursesMap, setCoursesMap] = useState<Record<string, { code: string; title: string }>>({});
  const [sessionsMap, setSessionsMap] = useState<Record<string, { title: string; date: string; startTime?: string; endTime?: string }>>({});

  // UI state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scanProcessing, setScanProcessing] = useState<boolean>(false);

  // Quick course/session creators (collapsible sandbox panel)
  const [showSandboxTools, setShowSandboxTools] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSessionStartTime, setNewSessionStartTime] = useState('09:00');
  const [newSessionEndTime, setNewSessionEndTime] = useState('11:00');

  // Trigger dynamic refresh on manual changes
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ==========================================
  // FEED INITIAL DATA & AUTO SETUP PIPELINES
  // ==========================================
  const triggerAutoSetupEnv = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const targetTeacherUid = user?.uid || 'temp-teacher-uid';
      const cId = 'demo-course-cloud';
      const sId = 'demo-session-lec1';

      // 1. Create a demo Course
      const courseRef = doc(db, 'courses', cId);
      await setDoc(courseRef, {
        id: cId,
        code: 'CS-302',
        title: 'Cloud Architecture & Microservices',
        description: 'Advanced dynamic microservices checkins validation system.',
        teacherId: targetTeacherUid,
        startDate: '2026-06-01',
        endDate: '2026-12-01',
        createdAt: new Date().toISOString()
      });

      // 2. Create Student profile for demo checkin testing if none exists
      const testStudentId = 'seed-student-1'; // John Doe BU
      const studentProfileRef = doc(db, 'students', testStudentId);
      await setDoc(studentProfileRef, {
        id: testStudentId,
        email: 'student@example.com',
        name: 'John Doe BU',
        studentId: 'STD-100452',
        role: 'student',
        createdAt: new Date().toISOString()
      });

      // 3. Register Student for the Course
      const regId = `${testStudentId}_${cId}`;
      const regRef = doc(db, 'courses', cId, 'registrations', regId);
      await setDoc(regRef, {
        id: regId,
        courseId: cId,
        studentId: testStudentId,
        status: 'approved',
        registeredAt: new Date().toISOString()
      });

      // 4. Create an active Session under Course
      const sessionRef = doc(db, 'courses', cId, 'sessions', sId);
      await setDoc(sessionRef, {
        id: sId,
        courseId: cId,
        title: 'Lecture 1: Serverless & Federated DB Systems',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '12:00',
        qrCodeKey: 'seed_qr_crypt_key_alpha',
        createdAt: new Date().toISOString()
      });

      // 5. Create active QrSession parameters
      const qrSecret = Math.random().toString(36).substring(2, 12).toUpperCase();
      const qrSessionRef = doc(db, 'qr_sessions', sId);
      await setDoc(qrSessionRef, {
        id: sId,
        sessionId: sId,
        courseId: cId,
        qrSecret,
        qrInterval: 15,
        active: true,
        createdAt: new Date().toISOString()
      });

      setSuccessMessage('Test sandbox course, student registration, session details, and rolling QR config initialized! Enjoy!');
      setRefreshTrigger(prev => prev + 1);
      setSelectedCourseId(cId);
      setSelectedSessionId(sId);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Setup engine failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CORE DB LIFECYCLE LOADS
  // ==========================================
  useEffect(() => {
    async function loadCoreData() {
      if (!user) return;
      try {
        setLoading(true);
        
        // 1. Fetch courses based on role
        const coursesRef = collection(db, 'courses');
        let coursesQuery;
        
        if (role === 'teacher' || role === 'admin') {
          coursesQuery = query(coursesRef, where('teacherId', '==', user.uid));
        } else {
          // If student, list courses they have registrations in!
          coursesQuery = query(coursesRef);
        }

        const coursesSnap = await getDocs(coursesQuery);
        const resolvedCourses: Course[] = [];
        const tempCoursesMap: Record<string, { code: string; title: string }> = {};

        for (const docItem of coursesSnap.docs) {
          const data = docItem.data() as Course;
          resolvedCourses.push(data);
          tempCoursesMap[data.id] = { code: data.code, title: data.title };
        }
        
        setCourses(resolvedCourses);
        setCoursesMap(tempCoursesMap);

        if (resolvedCourses.length > 0) {
          setSelectedCourseId(prev => prev || resolvedCourses[0].id);
        }

        // 2. Load all system sessions globally for historical render mappings
        const allSessionsMap: Record<string, { title: string; date: string; startTime?: string; endTime?: string }> = {};
        for (const crse of resolvedCourses) {
          const sessRef = collection(db, 'courses', crse.id, 'sessions');
          const sessSnap = await getDocs(sessRef);
          sessSnap.docs.forEach(docS => {
            const d = docS.data();
            allSessionsMap[docS.id] = {
              title: d.title,
              date: d.date,
              startTime: d.startTime,
              endTime: d.endTime
            };
          });
        }
        setSessionsMap(allSessionsMap);

        // 3. Load historical logs belonging to student
        if (role === 'student') {
          const studentUid = profile?.id || user.uid;
          const attRef = collection(db, 'attendance');
          const attQuery = query(attRef, where('studentId', '==', studentUid));
          
          const attSnap = await getDocs(attQuery);
          const hist = attSnap.docs.map(d => d.data() as Attendance);
          hist.sort((a, b) => {
            const timeA = a.timestamp?.seconds || new Date(a.timestamp).getTime();
            const timeB = b.timestamp?.seconds || new Date(b.timestamp).getTime();
            return timeB - timeA;
          });
          setStudentRecords(hist);
        }

      } catch (err: any) {
        console.error('Core loader failed:', err);
        setErrorMessage('Failed to configure system collections.');
      } finally {
        setLoading(false);
      }
    }

    loadCoreData();
  }, [user, role, profile, refreshTrigger]);

  // Load Sessions once a specific course is chosen
  useEffect(() => {
    if (!selectedCourseId) return;

    async function loadSessionsAndRoster() {
      try {
        const sessionsRef = collection(db, 'courses', selectedCourseId, 'sessions');
        const sessionsSnap = await getDocs(sessionsRef);
        const resolvedSessions = sessionsSnap.docs.map((d) => d.data() as Session);
        setSessions(resolvedSessions);

        if (resolvedSessions.length > 0) {
          setSelectedSessionId(prev => prev || resolvedSessions[0].id);
        } else {
          setSelectedSessionId('');
        }

        // Fetch Approved Course Students Roster
        const regsRef = collection(db, 'courses', selectedCourseId, 'registrations');
        const regsSnap = await getDocs(query(regsRef, where('status', '==', 'approved')));
        const registeredStudentIds = regsSnap.docs.map((d) => d.data().studentId);

        if (registeredStudentIds.length > 0) {
          const studentProfileList: StudentProfile[] = [];
          for (const sId of registeredStudentIds) {
            const sDoc = await getDoc(doc(db, 'students', sId));
            if (sDoc.exists()) {
              studentProfileList.push(sDoc.data() as StudentProfile);
            }
          }
          setRegisteredStudents(studentProfileList);
        } else {
          setRegisteredStudents([]);
        }
      } catch (err: any) {
        console.error('Loader nested error:', err);
      }
    }

    loadSessionsAndRoster();
  }, [selectedCourseId, refreshTrigger]);

  // Real-time Listener for current checking session details
  useEffect(() => {
    if (!selectedSessionId) {
      setActiveQrSession(null);
      setAttendanceRecords([]);
      return;
    }

    // 1. Bind QrSession profile listener
    const qrSub = onSnapshot(doc(db, 'qr_sessions', selectedSessionId), (d) => {
      if (d.exists()) {
        const data = d.data() as QrSession;
        setActiveQrSession(data);
        setIsPaused(!data.active);
      } else {
        setActiveQrSession(null);
      }
    });

    // 2. Bind Live check-in attendance ledger updates
    const attQuery = query(collection(db, 'attendance'), where('sessionId', '==', selectedSessionId));
    const attSub = onSnapshot(attQuery, (snap) => {
      const liveRecords = snap.docs.map((docItem) => docItem.data() as Attendance);
      setAttendanceRecords(liveRecords);
    });

    return () => {
      qrSub();
      attSub();
    };
  }, [selectedSessionId]);

  // ==========================================
  // OPERATIONAL ACTION CONTROLLERS (TRAINERS)
  // ==========================================
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode.trim() || !newCourseTitle.trim() || !user) return;

    try {
      setLoading(true);
      const newCourseId = `course_${Date.now()}`;
      await setDoc(doc(db, 'courses', newCourseId), {
        id: newCourseId,
        code: newCourseCode.trim(),
        title: newCourseTitle.trim(),
        description: 'Trainer initialized lecture class.',
        teacherId: user.uid,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });

      setNewCourseCode('');
      setNewCourseTitle('');
      setRefreshTrigger(prev => prev + 1);
      setSelectedCourseId(newCourseId);
      setSuccessMessage('New Course node added successfully!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Course generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionTitle.trim() || !selectedCourseId) return;

    try {
      setLoading(true);
      const newSessId = `session_${Date.now()}`;
      await setDoc(doc(db, 'courses', selectedCourseId, 'sessions', newSessId), {
        id: newSessId,
        courseId: selectedCourseId,
        title: newSessionTitle.trim(),
        date: newSessionDate,
        startTime: newSessionStartTime,
        endTime: newSessionEndTime,
        qrCodeKey: `key_${Math.random().toString(36).substring(3, 9)}`,
        createdAt: new Date().toISOString(),
        status: 'upcoming'
      });

      setNewSessionTitle('');
      setRefreshTrigger(prev => prev + 1);
      setSelectedSessionId(newSessId);
      setSuccessMessage('New Session block initialized under this course!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Session generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQrSession = async () => {
    if (!selectedSessionId || !selectedCourseId) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      
      const qrSecret = Math.random().toString(36).substring(2, 12).toUpperCase();
      const qrSessionRef = doc(db, 'qr_sessions', selectedSessionId);
      await setDoc(qrSessionRef, {
        id: selectedSessionId,
        sessionId: selectedSessionId,
        courseId: selectedCourseId,
        qrSecret,
        qrInterval: 15,
        active: true,
        createdAt: new Date().toISOString()
      });

      // Update session status to active
      const sessionRef = doc(db, 'courses', selectedCourseId, 'sessions', selectedSessionId);
      await updateDoc(sessionRef, { status: 'active' });

      setSuccessMessage('OTP Broadcaster activated! Course is now LIVE.');
    } catch (err: any) {
      setErrorMessage(`Activation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePause = async () => {
    if (!activeQrSession) return;
    try {
      const qrSessionRef = doc(db, 'qr_sessions', selectedSessionId);
      await updateDoc(qrSessionRef, {
        active: isPaused,
      });
      setSuccessMessage(isPaused ? 'Classroom attendance stream resumed!' : 'Dynamic scan stream paused.');
    } catch (err: any) {
      setErrorMessage(`Pause toggle failed: ${err.message}`);
    }
  };

  const handleEndSession = async () => {
    if (!selectedSessionId || !selectedCourseId) return;
    if (!window.confirm('Are you sure you want to finalize this session check-in loop?')) return;
    
    try {
      setLoading(true);
      const qrSessionRef = doc(db, 'qr_sessions', selectedSessionId);
      await updateDoc(qrSessionRef, {
        active: false,
      });

      // Update session status to completed
      const sessionRef = doc(db, 'courses', selectedCourseId, 'sessions', selectedSessionId);
      await updateDoc(sessionRef, { status: 'completed' });

      setSuccessMessage('Attendance finalized. OTP Broadcaster deactivated.');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      setErrorMessage(`Failed to end session: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherOverride = async (studentId: string, newStatus: any, note: string) => {
    if (!selectedSessionId || !selectedCourseId) return;
    try {
      const attId = `${studentId}_${selectedSessionId}`;
      const attDocRef = doc(db, 'attendance', attId);
      await setDoc(attDocRef, {
        id: attId,
        attendanceId: attId,
        sessionId: selectedSessionId,
        studentId,
        courseId: selectedCourseId,
        status: newStatus,
        timestamp: new Date().toISOString(),
        checkinTime: newStatus === 'absent' ? null : new Date().toISOString(),
        method: 'manual',
        note: note || `Manual override to ${newStatus}`,
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'instructor'
      });
      setSuccessMessage('Student log written successfully.');
    } catch (err: any) {
      setErrorMessage(`Override failed: ${err.message}`);
    }
  };

  // ==========================================
  // SCAN VERIFICATION ENGINE (STUDENTS)
  // ==========================================
  const executeScanSubmission = async (scannedPayload: string) => {
    setScanProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    let sessionKey = '';
    const studentUid = profile?.id || user?.uid || 'guest-uid';

    try {
      let payloadObj;
      try {
        payloadObj = JSON.parse(scannedPayload);
      } catch (e) {
        throw new Error('Scanned code format is invalid.');
      }

      const { courseId, sessionId, token } = payloadObj;
      sessionKey = sessionId;

      if (!courseId || !sessionId || !token) {
        throw new Error('Empty verification parameters.');
      }

      const qrSessionRef = doc(db, 'qr_sessions', sessionId);
      const qrSnap = await getDoc(qrSessionRef);

      if (!qrSnap.exists()) {
        throw new Error('No active scan session found.');
      }

      const qrSessionData = qrSnap.data() as QrSession;
      if (!qrSessionData.active) {
        throw new Error('Registration is currently paused or closed.');
      }

      const { isValid } = await validateTOTPToken(
        token,
        courseId,
        sessionId,
        qrSessionData.qrSecret,
        1
      );

      if (!isValid) {
        throw new Error('QR token has expired. Please scan the current code on screen.');
      }

      const attId = `${studentUid}_${sessionId}`;
      const checkinRef = doc(db, 'attendance', attId);
      const checkinSnap = await getDoc(checkinRef);

      if (checkinSnap.exists()) {
        throw new Error('You have already checked in for this session.');
      }

      let checkinStatus: 'present' | 'late' = 'present';
      const sessionDocRef = doc(db, 'courses', courseId, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionDocRef);
      if (sessionSnap.exists()) {
        const sData = sessionSnap.data() as Session;
        const startTimeStr = sData.startTime || '09:00';
        const [planHour, planMin] = startTimeStr.split(':').map(Number);
        
        const now = new Date();
        const startToday = new Date();
        startToday.setHours(planHour, planMin, 0, 0);

        const elapsedMinutes = (now.getTime() - startToday.getTime()) / 60000;
        if (elapsedMinutes > lateMinutes) {
          checkinStatus = 'late';
        }
      }

      await setDoc(checkinRef, {
        id: attId,
        attendanceId: attId,
        sessionId,
        studentId: studentUid,
        courseId,
        status: checkinStatus,
        timestamp: new Date().toISOString(),
        checkinTime: new Date().toISOString(),
        method: 'qr',
        tokenUsed: token,
        note: `Self check-in verified via OTP token`,
        createdBy: studentUid,
        updatedAt: new Date().toISOString()
      });

      // Post-checkin automated transactional email and security audit log
      try {
        const studentName = profile?.name || user?.displayName || 'Trainee';
        const studentEmail = profile?.email || user?.email || 'student@example.com';
        const courseName = coursesMap[courseId]?.title || 'Course';
        const sessionName = sessionsMap[sessionId]?.title || 'Session';
        const checkInTime = new Date().toLocaleTimeString();

        await sendAttendanceEmail({
          studentName,
          studentEmail,
          courseName,
          sessionName,
          attendanceStatus: checkinStatus,
          checkInTime
        });

        await logAudit(`Successful QR Self check-in verified for student ${studentName}`, 'ATTENDANCE');
      } catch (postErr: any) {
        console.warn('Attendance email/audit failed to dispatch:', postErr);
      }

      setSuccessMessage(`Check-in verified! Marked as: ${checkinStatus.toUpperCase()}`);
      setRefreshTrigger(prev => prev + 1);

    } catch (err: any) {
      console.warn('Scan verification failed:', err.message);
      setErrorMessage(err.message || 'Verification transaction failed.');
    } finally {
      setScanProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6" id="attendance-tracking-wrapper">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5.5 h-5.5 text-blue-600 animate-pulse" />
            Attendance Management Engine
          </h1>
          <p className="text-xs text-slate-500">
            Real-time enrollment handshakes, cryptographically secured by 15-second rolling TOTP keys.
          </p>
        </div>

        {/* Action controllers */}
        <div className="flex items-center gap-2.5">
          {(role === 'teacher' || role === 'admin') && (
            <Button
              onClick={() => setShowSandboxTools(!showSandboxTools)}
              variant="outline"
              size="sm"
              className="text-xs border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
            >
              <Layers className="w-4 h-4 mr-1 text-slate-500" /> 
              {showSandboxTools ? 'Hide Lab Pre-seeders' : 'Show Lab Pre-seeders'}
            </Button>
          )}
          
          <Button
            onClick={triggerAutoSetupEnv}
            variant="outline"
            size="sm"
            className="bg-blue-50/10 border-blue-200 text-blue-700 hover:bg-blue-50/30 text-xs font-black shadow-xs shrink-0"
          >
            <Sparkles className="w-4 h-4 mr-1 text-blue-600 animate-spin" /> Load Demo Sandbox
          </Button>
        </div>
      </div>

      {/* Lab Pre-seeders panel */}
      {showSandboxTools && (role === 'teacher' || role === 'admin') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 border border-slate-200/80 rounded-2xl animate-in fade-in duration-200" id="accelerated-sandbox-seeding-panel">
          {/* Form 1: Fast Course Maker */}
          <form onSubmit={handleCreateCourse} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-violet-600" />
              <span className="text-xs font-black text-violet-700 uppercase tracking-widest leading-none">Pre-seed Course Node</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <input
                type="text"
                placeholder="Course Code e.g. CS-301"
                value={newCourseCode}
                onChange={(e) => setNewCourseCode(e.target.value)}
                className="text-xs bg-white border border-slate-200 px-3 py-1.5 h-9 rounded-lg font-medium text-slate-700"
                required
              />
              <input
                type="text"
                placeholder="Course Title e.g. Advanced AI"
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                className="text-xs bg-white border border-slate-200 px-3 py-1.5 h-9 rounded-lg font-medium text-slate-700"
                required
              />
            </div>
            <Button type="submit" variant="secondary" className="text-xs h-8 font-bold text-violet-700 hover:bg-violet-50">
              Build Course Node
            </Button>
          </form>

          {/* Form 2: Fast Session Maker */}
          <form onSubmit={handleCreateSession} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-pink-600" />
              <span className="text-xs font-black text-pink-700 uppercase tracking-widest leading-none">Pre-seed Session Unit</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <input
                type="text"
                placeholder="Session Name e.g. Lecture 1"
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                className="text-xs bg-white border border-slate-200 px-3 h-8 rounded-lg font-medium text-slate-700"
                required
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="date"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="text-xs bg-white border border-slate-200 px-2 h-8 rounded-lg text-slate-700"
                  required
                />
                <input
                  type="time"
                  value={newSessionStartTime}
                  onChange={(e) => setNewSessionStartTime(e.target.value)}
                  className="text-xs bg-white border border-slate-200 px-2 h-8 rounded-lg text-slate-700"
                  required
                />
                <input
                  type="time"
                  value={newSessionEndTime}
                  onChange={(e) => setNewSessionEndTime(e.target.value)}
                  className="text-xs bg-white border border-slate-200 px-2 h-8 rounded-lg text-slate-700"
                  required
                />
              </div>
            </div>
            <Button type="submit" variant="secondary" disabled={!selectedCourseId} className="text-xs h-8 font-bold text-pink-700 hover:bg-pink-50">
              Initialize Session Unit
            </Button>
          </form>
        </div>
      )}

      {/* Global Alerts */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl" id="global-error-card">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black rounded-xl" id="global-success-card">
          {successMessage}
        </div>
      )}

      {/* Loading overlay panel */}
      {loading && (
        <div className="p-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          Synchronizing database status logs...
        </div>
      )}

      {/* INSTRUCTOR / TEACHER DASHBOARD DISPLAY */}
      {!loading && (role === 'teacher' || role === 'admin') && (
        <AttendanceDashboard
          courses={courses}
          selectedCourseId={selectedCourseId}
          setSelectedCourseId={setSelectedCourseId}
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          setSelectedSessionId={setSelectedSessionId}
          registeredStudents={registeredStudents}
          attendanceRecords={attendanceRecords}
          activeQrSession={activeQrSession}
          isPaused={isPaused}
          onTogglePause={handleTogglePause}
          onEndSession={handleEndSession}
          onStartQrSession={handleStartQrSession}
          lateMinutes={lateMinutes}
          setLateMinutes={setLateMinutes}
          onManualRefresh={() => setRefreshTrigger(p => p + 1)}
          setSuccessMessage={setSuccessMessage}
          setErrorMessage={setErrorMessage}
        />
      )}

      {/* TRAINEE / STUDENT PORTAL DISPLAY */}
      {!loading && role === 'student' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="student-interactive-workspace">
          
          {/* Scanner column */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <AttendanceScanner
              onScanSuccess={executeScanSubmission}
              loading={scanProcessing}
            />
            {scanProcessing && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="text-xs text-blue-800 font-mono font-semibold">
                  Validating OTP token offset checksum...
                </span>
              </div>
            )}
          </div>

          {/* Chronological stamps timeline card */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <AttendanceHistoryCard
              courses={courses}
              sessionsMap={sessionsMap}
              attendanceRecords={studentRecords}
              studentId={profile?.id || user?.uid || ''}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
