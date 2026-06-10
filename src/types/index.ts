export type UserRole = 'teacher' | 'student' | 'admin';

export interface BaseEntity {
  id: string;
  createdAt: any; // Firestore Timestamp or ServerTimestamp
}

export interface TeacherProfile extends BaseEntity {
  email: string;
  name: string;
  role: 'teacher';
  department?: string;
}

export interface StudentProfile extends BaseEntity {
  email: string;
  name: string;
  role: 'student';
  studentId: string;
}

export interface Course extends BaseEntity {
  code: string;
  title: string;
  description: string;
  teacherId: string; // References TeacherProfile.id
  startDate: string; // ISO yyyy-mm-dd
  endDate: string; // ISO yyyy-mm-dd
  plannedSessions?: number;
  maxPoints?: number;
  trainingHours?: number;
  trainingType?: 'onsite' | 'online' | 'hybrid';
  availableSeats?: number;
  meetingLink?: string;
}

export interface Session extends BaseEntity {
  courseId: string; // References Course.id
  title: string;
  date: string; // ISO yyyy-mm-dd
  qrCodeKey: string;
  startTime: string; // ISO HH:MM or similar
  endTime: string;
  status?: 'upcoming' | 'active' | 'completed' | 'closed';
  meetingLink?: string; // Optional links for session-level Zoom/Meet overrides
}

export interface Registration {
  id: string; // often `${studentId}_${courseId}`
  registrationId?: string; // standard database identification
  courseId: string;
  studentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'registered' | 'cancelled' | 'completed' | 'failed';
  registeredAt: any;
  registrationDate?: any; // unified fields
}

export interface Attendance {
  id: string; // often `${studentId}_${sessionId}`
  attendanceId?: string; // standard database identification
  sessionId: string;
  studentId: string;
  courseId: string;
  status: 'present' | 'late' | 'absent' | 'excused' | 'manual';
  timestamp: any;
  checkinTime?: any; // unified fields
  method?: 'qr' | 'manual' | 'system';
  tokenUsed?: string;
  note?: string; // teacher override remarks
  createdBy?: string; // creator UID or 'system'
  updatedAt?: any;
  generatedBy?: string; // system-generated absent records indicator
  generatedAt?: any; // system-generated absent timestamp
}

export interface QrSession extends BaseEntity {
  sessionId: string;
  courseId: string;
  qrSecret: string;
  qrInterval: 15;
  active: boolean;
}

export interface AttendanceLog {
  id?: string;
  studentId: string;
  sessionId: string;
  scanTime: any;
  token: string;
  result: string;
}

export interface AttendanceHours {
  id: string; // usually `${studentId}_${sessionId}`
  studentId: string;
  courseId: string;
  sessionId: string;
  checkinTime: any; // Timestamp or ISO string
  checkoutTime: any; // Timestamp or ISO string
  durationMinutes: number;
}

export interface Certificate extends BaseEntity {
  certificateId: string;
  certificateNumber: string; // e.g. BU-TRN-2026-000001
  courseId: string;
  studentId: string;
  issueDate: any; // Timestamp or serverTimestamp
  verificationCode: string; // Random secure non-guessable string
  status: 'valid' | 'revoked' | 'expired';
  revocationReason?: string;
  revokedAt?: any;
  credentialUrl?: string; // fallback matching older indices
  qrVerificationUrl?: string; // fallback matching older indices
}

export interface OperationLog {
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  timestamp: string;
  error: string | null;
}
