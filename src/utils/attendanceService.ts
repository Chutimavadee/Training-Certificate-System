import { auth, db } from '../firebase/firebase';
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
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { Attendance, StudentProfile, Session } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * On-Demand Auto Absenting:
 * Matches active roster against current attendance record keys in Firestore.
 * Creates absent records for students without any checkout/checkin logs.
 */
export async function generateOnDemandAbsents(
  courseId: string,
  sessionId: string,
  registeredStudents: StudentProfile[],
  existingRecords: Attendance[]
): Promise<void> {
  if (!courseId || !sessionId || registeredStudents.length === 0) return;

  const path = 'attendance';
  try {
    const existingStudentIds = new Set(existingRecords.map((r) => r.studentId));
    const missingStudents = registeredStudents.filter((s) => !existingStudentIds.has(s.id));

    if (missingStudents.length === 0) return;

    const batch = writeBatch(db);
    const now = new Date();

    for (const student of missingStudents) {
      const attId = `${student.id}_${sessionId}`;
      const attDocRef = doc(db, 'attendance', attId);
      
      const payload: Attendance = {
        id: attId,
        attendanceId: attId,
        sessionId,
        studentId: student.id,
        courseId,
        status: 'absent',
        timestamp: now.toISOString(),
        checkinTime: null,
        method: 'system',
        note: 'Auto-absent (System)',
        createdBy: 'system',
        updatedAt: now.toISOString(),
        generatedBy: 'system',
        generatedAt: now.toISOString(),
      };

      batch.set(attDocRef, payload);
    }

    await batch.commit();
    console.log(`Auto Absent: Generated absent marks for ${missingStudents.length} trainees.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Auto-Close Session Check:
 * Compares current local time to session endTime. If elapsed, updates session doc to 'completed'.
 */
export async function checkAndAutoCloseSession(courseId: string, session: Session): Promise<boolean> {
  if (!courseId || !session || !session.endTime) return false;
  if (session.status === 'completed' || session.status === 'closed') return false;

  try {
    const [hours, minutes] = session.endTime.split(':').map(Number);
    const sessionEndDate = new Date(session.date);
    sessionEndDate.setHours(hours, minutes, 0, 0);

    const now = new Date();
    if (now > sessionEndDate) {
      const sessionRef = doc(db, 'courses', courseId, 'sessions', session.id);
      await updateDoc(sessionRef, { status: 'completed' });
      return true;
    }
  } catch (error) {
    console.error('Failed to auto close session:', error);
  }
  return false;
}

/**
 * Manual Attendance Override:
 * Overwrites individual trainee status and appends notes/remarks.
 */
export async function modifyAttendanceStatus(
  studentId: string,
  sessionId: string,
  courseId: string,
  newStatus: 'present' | 'late' | 'absent' | 'excused' | 'manual',
  note: string,
  instructorId: string
): Promise<void> {
  const path = `attendance/${studentId}_${sessionId}`;
  try {
    const attId = `${studentId}_${sessionId}`;
    const attDocRef = doc(db, 'attendance', attId);
    const now = new Date();

    const payload: Attendance = {
      id: attId,
      attendanceId: attId,
      sessionId,
      studentId,
      courseId,
      status: newStatus,
      timestamp: now.toISOString(),
      checkinTime: newStatus === 'absent' ? null : now.toISOString(),
      method: newStatus === 'manual' ? 'manual' : 'manual',
      note: note || `Manually marked ${newStatus}`,
      createdBy: instructorId || 'teacher',
      updatedAt: now.toISOString(),
    };

    await setDoc(attDocRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Bulk Override Action:
 * Marks selected student logs in a batch.
 */
export async function bulkModifyAttendanceStatus(
  studentIds: string[],
  sessionId: string,
  courseId: string,
  newStatus: 'present' | 'excused',
  note: string,
  instructorId: string
): Promise<void> {
  if (studentIds.length === 0) return;
  const path = 'attendance';
  try {
    const batch = writeBatch(db);
    const now = new Date();

    for (const studentId of studentIds) {
      const attId = `${studentId}_${sessionId}`;
      const attDocRef = doc(db, 'attendance', attId);

      const payload: Attendance = {
        id: attId,
        attendanceId: attId,
        sessionId,
        studentId,
        courseId,
        status: newStatus,
        timestamp: now.toISOString(),
        checkinTime: now.toISOString(),
        method: 'manual',
        note: note || `Bulk marked ${newStatus}`,
        createdBy: instructorId || 'teacher',
        updatedAt: now.toISOString(),
      };

      batch.set(attDocRef, payload);
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export interface ExportAttendanceRecord {
  orderNumber: number;
  studentId: string;
  studentName: string;
  email: string;
  status: string;
  checkinTime: string;
  remarks: string;
  lastUpdated: string;
}

/**
 * Prepares roster structure for CSV/Excel/Sheets export pipelines.
 */
export function prepareAttendanceExportData(
  students: StudentProfile[],
  attendanceRecords: Attendance[]
): ExportAttendanceRecord[] {
  return students.map((student, index) => {
    const record = attendanceRecords.find((r) => r.studentId === student.id);
    
    let checkinTimeStr = '--';
    if (record?.checkinTime) {
      checkinTimeStr = new Date(record.checkinTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }

    let lastUpdatedStr = '--';
    if (record?.updatedAt) {
      lastUpdatedStr = new Date(record.updatedAt).toLocaleString();
    } else if (record?.timestamp) {
      lastUpdatedStr = new Date(record.timestamp).toLocaleString();
    }

    return {
      orderNumber: index + 1,
      studentId: student.studentId || '--',
      studentName: student.name || 'Anonymous',
      email: student.email || '--',
      status: record?.status || 'absent',
      checkinTime: checkinTimeStr,
      remarks: record?.note || '--',
      lastUpdated: lastUpdatedStr,
    };
  });
}
