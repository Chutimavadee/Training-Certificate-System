import { logEmail, logReportExport, logError } from './loggerService';

// Read the GAS Appscript Web App URL from client environments
const GAS_URL = import.meta.env.VITE_GAS_WEBAPP_URL || '';

export interface AttendanceEmailPayload {
  studentName: string;
  courseName: string;
  sessionName: string;
  attendanceStatus: string;
  checkInTime: string;
  studentEmail: string;
}

export interface CertificateEmailPayload {
  studentName: string;
  courseName: string;
  certificateNumber: string;
  downloadLink: string;
  studentEmail: string;
}

export interface CourseReportEmailPayload {
  courseName: string;
  summaryText: string;
  recipients: string[];
}

export interface GoogleSheetsSyncPayload {
  sheetName: 'Attendance' | 'Scores' | 'Certificates';
  headers: string[];
  rows: any[][];
}

/**
 * Service to execute Google Apps Script integrations via HTTP POST
 */
export async function invokeGAS(payload: any): Promise<{ success: boolean; message: string }> {
  if (!GAS_URL) {
    console.info("GAS webhook is unconfigured. Simulated execution succeeded quietly.", payload);
    return { 
      success: true, 
      message: "Simulation Success: Configure VITE_GAS_WEBAPP_URL inside your environment settings to pipe data live to Google Apps Script." 
    };
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`GAS endpoint returned status code: ${response.status}`);
    }

    const json = await response.json();
    return {
      success: !!json.success,
      message: json.message || 'Apps Script completed action successfully.'
    };
  } catch (err: any) {
    console.error("GAS execution failed direct request:", err);
    await logError("GAS_INTEGRATION", `HTTP fetch failed: ${err.message}`);
    throw err;
  }
}

/**
 * Send Attendance confirmation email via GAS
 */
export async function sendAttendanceEmail(data: AttendanceEmailPayload): Promise<boolean> {
  const type = 'ATTENDANCE_CHECKIN';
  try {
    const result = await invokeGAS({
      action: 'send_attendance_email',
      studentName: data.studentName,
      courseName: data.courseName,
      sessionName: data.sessionName,
      attendanceStatus: data.attendanceStatus,
      checkInTime: data.checkInTime,
      recipient: data.studentEmail
    });

    const isSimulated = !GAS_URL;
    await logEmail(type, data.studentEmail, isSimulated ? 'simulated' : (result.success ? 'sent' : 'failed'));
    return result.success;
  } catch (error) {
    await logEmail(type, data.studentEmail, 'failed');
    return false;
  }
}

/**
 * Send Certificate award email via GAS
 */
export async function sendCertificateEmail(data: CertificateEmailPayload): Promise<boolean> {
  const type = 'CERTIFICATE_ISSUED';
  try {
    const result = await invokeGAS({
      action: 'send_certificate_email',
      studentName: data.studentName,
      courseName: data.courseName,
      certificateNumber: data.certificateNumber,
      downloadLink: data.downloadLink,
      recipient: data.studentEmail
    });

    const isSimulated = !GAS_URL;
    await logEmail(type, data.studentEmail, isSimulated ? 'simulated' : (result.success ? 'sent' : 'failed'));
    return result.success;
  } catch (error) {
    await logEmail(type, data.studentEmail, 'failed');
    return false;
  }
}

/**
 * Send Course summary / general notification announcement via GAS
 */
export async function sendCourseReportEmail(data: CourseReportEmailPayload): Promise<{ sentCount: number; failedCount: number }> {
  let sentCount = 0;
  let failedCount = 0;
  
  for (const recipient of data.recipients) {
    try {
      const result = await invokeGAS({
        action: 'send_course_report_email',
        courseName: data.courseName,
        summaryText: data.summaryText,
        recipient: recipient
      });
      
      const isSimulated = !GAS_URL;
      await logEmail('COURSE_SUMMARY', recipient, isSimulated ? 'simulated' : (result.success ? 'sent' : 'failed'));
      if (result.success || isSimulated) {
        sentCount++;
      } else {
        failedCount++;
      }
    } catch {
      await logEmail('COURSE_SUMMARY', recipient, 'failed');
      failedCount++;
    }
  }

  return { sentCount, failedCount };
}

/**
 * Push structured sheet metrics into specific target sheets (Attendance, Scores, Certificates)
 */
export async function syncToGoogleSheets(payload: GoogleSheetsSyncPayload): Promise<boolean> {
  try {
    const result = await invokeGAS({
      action: 'sync_sheets',
      sheetName: payload.sheetName,
      headers: payload.headers,
      rows: payload.rows
    });
    
    await logReportExport(`GOOGLE_SHEETS_${payload.sheetName.toUpperCase()}`, payload.rows.length);
    return result.success;
  } catch (error: any) {
    console.error("Failed to sync to Google Sheets:", error);
    await logError("GAS_SHEETS_SYNC", error.message);
    return false;
  }
}
