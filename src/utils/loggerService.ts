import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';

export interface EmailLog {
  id?: string;
  emailType: string;
  recipient: string;
  status: 'sent' | 'failed' | 'simulated';
  sentAt: any;
}

export interface ReportExportLog {
  id?: string;
  exportType: string;
  exportedBy: string;
  exportDate: any;
  recordCount: number;
}

export interface AuditLog {
  id?: string;
  userId: string;
  action: string;
  module: string;
  timestamp: any;
}

export interface ErrorLog {
  id?: string;
  module: string;
  errorMessage: string;
  timestamp: any;
  user: string;
}

/**
 * Log an email sent transaction to Firestore 'email_logs'
 */
export async function logEmail(emailType: string, recipient: string, status: 'sent' | 'failed' | 'simulated'): Promise<void> {
  try {
    await addDoc(collection(db, 'email_logs'), {
      emailType,
      recipient,
      status,
      sentAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Logging email to Firestore failed:', err);
  }
}

/**
 * Log a report export action to Firestore 'report_exports'
 */
export async function logReportExport(exportType: string, recordCount: number): Promise<void> {
  try {
    const userEmail = auth.currentUser?.email || 'unknown_user';
    await addDoc(collection(db, 'report_exports'), {
      exportType,
      exportedBy: userEmail,
      exportDate: serverTimestamp(),
      recordCount,
    });
  } catch (err) {
    console.warn('Logging report export failed:', err);
  }
}

/**
 * Centralized Audit Logger to Firestore 'audit_logs'
 */
export async function logAudit(action: string, module: string): Promise<void> {
  try {
    const userId = auth.currentUser?.email || auth.currentUser?.uid || 'anonymous';
    await addDoc(collection(db, 'audit_logs'), {
      userId,
      action,
      module,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Logging audit log failed:', err);
  }
}

/**
 * Error Monitoring Log Service to Firestore 'error_logs'
 */
export async function logError(module: string, errorMessage: string): Promise<void> {
  try {
    const userMail = auth.currentUser?.email || 'unsigned_user';
    await addDoc(collection(db, 'error_logs'), {
      module,
      errorMessage,
      timestamp: serverTimestamp(),
      user: userMail,
    });
  } catch (err) {
    console.warn('Logging error log failed:', err);
  }
}
