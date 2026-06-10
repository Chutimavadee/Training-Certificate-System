import React, { useState } from 'react';
import { db } from '../../firebase/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { logReportExport, logAudit, logError } from '../../utils/loggerService';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Download, CheckCircle2, AlertCircle } from 'lucide-react';

interface ExportCenterProps {
  onExportSuccess?: () => void;
}

export const ExportCenter: React.FC<ExportCenterProps> = ({ onExportSuccess }) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // General CSV download initiator
  const triggerCSVDownload = (filename: string, headers: string[], rows: any[][]) => {
    try {
      // 1. Prefix BOM for Excel double-byte UTF-8 character readability
      const BOM = '\uFEFF';
      const csvStr = [
        headers.join(','),
        ...rows.map(row => 
          row.map(val => {
            if (val === null || val === undefined) return '""';
            const strVal = String(val).replace(/"/g, '""'); // Double escaping
            return `"${strVal}"`;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([BOM + csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("CSV Download Blob trigger issue:", err);
      throw err;
    }
  };

  // 1. Export Attendance Logs
  const performAttendanceExport = async () => {
    setDownloading('attendance');
    setFeedback(null);
    try {
      const attSnap = await getDocs(collection(db, 'attendance'));
      const studentSnap = await getDocs(collection(db, 'students'));
      const courseSnap = await getDocs(collection(db, 'courses'));

      // Create maps for efficient lookups
      const studentMap = new Map(studentSnap.docs.map(d => [d.id, d.data()]));
      const courseMap = new Map(courseSnap.docs.map(d => [d.id, d.data()]));

      const headers = ['Student ID', 'Student Name', 'Course Name', 'Session Name', 'Attendance Status', 'Check-in Time', 'Score'];

      const rows = attSnap.docs.map(docItem => {
        const d = docItem.data();
        const std = studentMap.get(d.studentId);
        const crse = courseMap.get(d.courseId);

        let checkinStr = '--';
        if (d.checkinTime) {
          checkinStr = new Date(d.checkinTime).toISOString().replace('T', ' ').substring(0, 19);
        }

        return [
          std?.studentId || d.studentId || '--',
          std?.name || 'Anonymous',
          crse?.title || 'Unknown Course',
          d.sessionId || '--',
          d.status || 'absent',
          checkinStr,
          d.status === 'present' ? '1.0' : (d.status === 'late' ? '0.8' : '0.0')
        ];
      });

      triggerCSVDownload(
        `BU_Attendance_Dump_${Date.now()}.csv`, 
        headers, 
        rows
      );

      await logReportExport('ATTENDANCE_REPORT', rows.length);
      await logAudit('Exported Cumulative Attendance Register as CSV format', 'REPORTING');
      setFeedback({ type: 'success', message: `Export of ${rows.length} attendance checklist records finished successfully.` });
      if (onExportSuccess) onExportSuccess();
    } catch (err: any) {
      logError('EXPORT_ATTENDANCE_CSV', err.message);
      setFeedback({ type: 'error', message: `CSV compile failed: ${err.message}` });
    } finally {
      setDownloading(null);
    }
  };

  // 2. Export Registered Students List
  const performStudentExport = async () => {
    setDownloading('student');
    setFeedback(null);
    try {
      const studentSnap = await getDocs(collection(db, 'students'));
      const headers = ['Student ID', 'Student Name', 'Email Address', 'Creation Time'];

      const rows = studentSnap.docs.map(docItem => {
        const d = docItem.data();
        return [
          d.studentId || '--',
          d.name || 'Anonymous Student',
          d.email || d.id || '--',
          d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '--'
        ];
      });

      triggerCSVDownload(
        `BU_Students_Roster_${Date.now()}.csv`, 
        headers, 
        rows
      );

      await logReportExport('STUDENT_REPORT', rows.length);
      await logAudit('Exported Student Directory database as CSV format', 'REPORTING');
      setFeedback({ type: 'success', message: `Export of ${rows.length} matriculated trainee entries finished successfully.` });
      if (onExportSuccess) onExportSuccess();
    } catch (err: any) {
      logError('EXPORT_STUDENT_CSV', err.message);
      setFeedback({ type: 'error', message: `CSV compile failed: ${err.message}` });
    } finally {
      setDownloading(null);
    }
  };

  // 3. Export Course Directory Info
  const performCourseExport = async () => {
    setDownloading('course');
    setFeedback(null);
    try {
      const courseSnap = await getDocs(collection(db, 'courses'));
      const headers = ['Course ID', 'Course Code', 'Course Title', 'Planned Hours', 'Training Type'];

      const rows = courseSnap.docs.map(docItem => {
        const d = docItem.data();
        return [
          d.id,
          d.code || '--',
          d.title || '--',
          d.trainingHours || 30,
          d.trainingType || 'online'
        ];
      });

      triggerCSVDownload(
        `BU_Course_Database_${Date.now()}.csv`, 
        headers, 
        rows
      );

      await logReportExport('COURSE_REPORT', rows.length);
      await logAudit('Exported Academic Course Catalogue structure as CSV format', 'REPORTING');
      setFeedback({ type: 'success', message: `Export of ${rows.length} teaching courses catalogs finished successfully.` });
      if (onExportSuccess) onExportSuccess();
    } catch (err: any) {
      logError('EXPORT_COURSE_CSV', err.message);
      setFeedback({ type: 'error', message: `CSV compile failed: ${err.message}` });
    } finally {
      setDownloading(null);
    }
  };

  // 4. Export Issued Certificate Credentials
  const performCertificateExport = async () => {
    setDownloading('certificate');
    setFeedback(null);
    try {
      const certSnap = await getDocs(collection(db, 'certificates'));
      const headers = ['Certificate Number', 'Student Name', 'Course Name', 'Issue Date', 'Verification Status'];

      const rows = certSnap.docs.map(docItem => {
        const d = docItem.data();
        return [
          d.certificateNumber || d.id || '--',
          d.studentName || '--',
          d.courseTitle || '--',
          d.issueDate ? new Date(d.issueDate).toLocaleDateString() : '--',
          d.status || 'valid'
        ];
      });

      triggerCSVDownload(
        `BU_Signed_Certificates_${Date.now()}.csv`, 
        headers, 
        rows
      );

      await logReportExport('CERTIFICATE_REPORT', rows.length);
      await logAudit('Exported Issued Signed Academic Certificates logs as CSV format', 'REPORTING');
      setFeedback({ type: 'success', message: `Export of ${rows.length} approved certificate registers finished successfully.` });
      if (onExportSuccess) onExportSuccess();
    } catch (err: any) {
      logError('EXPORT_CERTIFICATE_CSV', err.message);
      setFeedback({ type: 'error', message: `CSV compile failed: ${err.message}` });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Card id="export-center-panel" className="bg-white border-slate-200">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 leading-none">
          <Download className="h-4.5 w-4.5 text-blue-600" /> Administrative Export Center
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5 flex flex-col gap-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          Instantly compile and dump verified data ledgers compiled from the school's central database. All export formats are encoded in <strong className="text-slate-800 font-bold">UTF-8</strong> (compatible with excel, google sheets, and libreoffice).
        </p>

        {feedback && (
          <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs leading-normal animate-slide-in-up ${
            feedback.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800 font-medium' : 'bg-rose-50 border-rose-100 text-rose-800 font-medium'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Btn 1: Attendance */}
          <Button
            id="export-attendance-btn"
            variant="outline"
            size="sm"
            onClick={performAttendanceExport}
            disabled={downloading !== null}
            className="flex items-center justify-between px-3.5 py-3 h-11 border-slate-200 text-xs text-slate-700 hover:bg-slate-50 font-bold w-full"
          >
            <span>Attendance Log Report</span>
            <Download className="h-4 w-4 text-slate-400" />
          </Button>

          {/* Btn 2: Trainees */}
          <Button
            id="export-students-btn"
            variant="outline"
            size="sm"
            onClick={performStudentExport}
            disabled={downloading !== null}
            className="flex items-center justify-between px-3.5 py-3 h-11 border-slate-200 text-xs text-slate-700 hover:bg-slate-50 font-bold w-full"
          >
            <span>Trainee Roster Report</span>
            <Download className="h-4 w-4 text-slate-400" />
          </Button>

          {/* Btn 3: Courses */}
          <Button
            id="export-courses-btn"
            variant="outline"
            size="sm"
            onClick={performCourseExport}
            disabled={downloading !== null}
            className="flex items-center justify-between px-3.5 py-3 h-11 border-slate-200 text-xs text-slate-700 hover:bg-slate-50 font-bold w-full"
          >
            <span>Teaching Courses Catalogue</span>
            <Download className="h-4 w-4 text-slate-400" />
          </Button>

          {/* Btn 4: Certificates */}
          <Button
            id="export-certificates-btn"
            variant="outline"
            size="sm"
            onClick={performCertificateExport}
            disabled={downloading !== null}
            className="flex items-center justify-between px-3.5 py-3 h-11 border-slate-200 text-xs text-slate-700 hover:bg-slate-50 font-bold w-full"
          >
            <span>Issued Academic Certificates</span>
            <Download className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
