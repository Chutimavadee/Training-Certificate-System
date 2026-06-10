import React, { useState } from 'react';
import { db } from '../../firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { syncToGoogleSheets } from '../../utils/gasService';
import { logAudit, logError } from '../../utils/loggerService';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Database, CloudLightning, RefreshCw, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';

export const GoogleSheetsSyncPanel: React.FC = () => {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'err'; msg: string } | null>(null);

  const rawUrl = import.meta.env.VITE_GAS_WEBAPP_URL || '';
  const isSetup = rawUrl.startsWith('https://script.google.com');

  // 1. Sync Attendance Report
  const handleSyncAttendance = async () => {
    setSyncing('attendance');
    setFeedback(null);
    try {
      const attSnap = await getDocs(collection(db, 'attendance'));
      const studentSnap = await getDocs(collection(db, 'students'));
      const courseSnap = await getDocs(collection(db, 'courses'));

      // Lookups maps
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
          d.status === 'present' ? 1.0 : (d.status === 'late' ? 0.8 : 0.0)
        ];
      });

      const success = await syncToGoogleSheets({
        sheetName: 'Attendance',
        headers,
        rows
      });

      if (success) {
        await logAudit('Synced Attendance records directly into Google Sheets via GAS Web App', 'INTEGRATION');
        setFeedback({
          type: 'success',
          msg: `Sync completed! Transferred ${rows.length} rows to "Attendance" sheet on active Google Sheet.`
        });
      } else {
        throw new Error("Google Apps Script pipeline flagged failure.");
      }
    } catch (err: any) {
      logError('SYNC_ATTENDANCE_SHEETS', err.message);
      setFeedback({ type: 'err', msg: `Database sync pipeline failed: ${err.message}` });
    } finally {
      setSyncing(null);
    }
  };

  // 2. Sync Scores (Syllabus performance ranks metrics)
  const handleSyncScores = async () => {
    setSyncing('scores');
    setFeedback(null);
    try {
      const studentSnap = await getDocs(collection(db, 'students'));
      const courseSnap = await getDocs(collection(db, 'courses'));
      const attSnap = await getDocs(collection(db, 'attendance'));

      // Prepare lookups
      const courseMap = new Map(courseSnap.docs.map(d => [d.id, d.data()]));
      const attMap: Record<string, any[]> = {};
      attSnap.docs.forEach(docItem => {
        const d = docItem.data();
        if (!attMap[d.studentId]) attMap[d.studentId] = [];
        attMap[d.studentId].push(d);
      });

      const headers = ['Rank', 'Student ID', 'Student Name', 'Email', 'Attended Sessions', 'Planned Sessions', 'Attendance Rate (%)', 'Score', 'Max Points', 'Status'];

      let idx = 1;
      const rows = studentSnap.docs.map(docItem => {
        const d = docItem.data();
        const logs = attMap[d.id] || [];
        const presentLogs = logs.filter(l => l.status === 'present' || l.status === 'late');
        const count = presentLogs.length;
        const totalSessions = 5; // Fixed course session target metric helper
        const attRate = totalSessions > 0 ? (count / totalSessions) * 100 : 0;
        const score = presentLogs.reduce((acc, current) => acc + (current.status === 'present' ? 5 : 4), 0);
        const maxScoreIdx = totalSessions * 5;

        return [
          idx++,
          d.studentId || '--',
          d.name || '--',
          d.email || '--',
          count,
          totalSessions,
          parseFloat(attRate.toFixed(2)),
          score,
          maxScoreIdx,
          attRate >= 80 ? 'Qualified' : 'At Risk'
        ];
      });

      const success = await syncToGoogleSheets({
        sheetName: 'Scores',
        headers,
        rows
      });

      if (success) {
        await logAudit('Synced syllabus scores details directly to Google Sheets central workspace', 'INTEGRATION');
        setFeedback({
          type: 'success',
          msg: `Sync completed! Transferred ${rows.length} rows to "Scores" database on active Google Sheet.`
        });
      } else {
        throw new Error("Google Apps Script pipeline flagged failure.");
      }
    } catch (err: any) {
      logError('SYNC_SCORES_SHEETS', err.message);
      setFeedback({ type: 'err', msg: `Database sync pipeline failed: ${err.message}` });
    } finally {
      setSyncing(null);
    }
  };

  // 3. Sync Certificates registers
  const handleSyncCertificates = async () => {
    setSyncing('certificates');
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

      const success = await syncToGoogleSheets({
        sheetName: 'Certificates',
        headers,
        rows
      });

      if (success) {
        await logAudit('Synced physical generated certificates directly to Google Sheets verify ledger', 'INTEGRATION');
        setFeedback({
          type: 'success',
          msg: `Sync completed! Transferred ${rows.length} rows to "Certificates" index on active Google Sheet.`
        });
      } else {
        throw new Error("Google Apps Script pipeline flagged failure.");
      }
    } catch (err: any) {
      logError('SYNC_CERTIFICATES_SHEETS', err.message);
      setFeedback({ type: 'err', msg: `Database sync pipeline failed: ${err.message}` });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <Card id="google-sheets-panel" className="bg-white border-slate-200">
      <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 leading-none">
          <Database className="h-4.5 w-4.5 text-indigo-600" /> Google Sheets Sync Node
        </CardTitle>
        <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase flex items-center gap-0.5 border ${
          isSetup ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-150 animate-pulse'
        }`}>
          <CloudLightning className="h-3 w-3" />
          {isSetup ? 'Connected Mode' : 'Simulated Gateway'}
        </span>
      </CardHeader>
      <CardContent className="pt-5 flex flex-col gap-4">
        <p className="text-xs text-slate-500 leading-relaxed font-normal">
          Push, organize, and mirror local Firestore datasets directly into secure Spreadsheet registers. Apps Script serves as a proxy to append rows seamlessly.
        </p>

        {feedback && (
          <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs leading-normal font-semibold ${
            feedback.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />}
            <span>{feedback.msg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {/* Btn 1: Attendance */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 bg-slate-50 border border-slate-150 rounded-xl gap-4">
            <div className="leading-none">
              <span className="text-xs font-black text-slate-800 block">Attendance Ledger (Sheet 1)</span>
              <span className="text-[9.5px] text-slate-450 mt-1 block">Full check-in, late arrival benchmarks, timestamps</span>
            </div>
            <Button
              id="sync-attendance-btn"
              variant="outline"
              size="sm"
              disabled={syncing !== null}
              onClick={handleSyncAttendance}
              className="text-xs font-extrabold h-9 px-4 border-slate-200 bg-white hover:bg-slate-100 text-indigo-700 hover:text-indigo-800"
            >
              {syncing === 'attendance' ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : 'Push Attendance Data'}
            </Button>
          </div>

          {/* Btn 2: Scores */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 bg-slate-50 border border-slate-150 rounded-xl gap-4">
            <div className="leading-none">
              <span className="text-xs font-black text-slate-800 block">Evaluated Scores (Sheet 2)</span>
              <span className="text-[9.5px] text-slate-450 mt-1 block">Student rates, points accumulation, status risk tags</span>
            </div>
            <Button
              id="sync-scores-btn"
              variant="outline"
              size="sm"
              disabled={syncing !== null}
              onClick={handleSyncScores}
              className="text-xs font-extrabold h-9 px-4 border-slate-200 bg-white hover:bg-slate-100 text-indigo-700 hover:text-indigo-800"
            >
              {syncing === 'scores' ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : 'Push Scores Data'}
            </Button>
          </div>

          {/* Btn 3: Certificates */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 bg-slate-50 border border-slate-150 rounded-xl gap-4">
            <div className="leading-none">
              <span className="text-xs font-black text-slate-800 block">Signed Certificates (Sheet 3)</span>
              <span className="text-[9.5px] text-slate-450 mt-1 block">Credential number, verified links, completion timestamps</span>
            </div>
            <Button
              id="sync-certificates-btn"
              variant="outline"
              size="sm"
              disabled={syncing !== null}
              onClick={handleSyncCertificates}
              className="text-xs font-extrabold h-9 px-4 border-slate-200 bg-white hover:bg-slate-100 text-indigo-700 hover:text-indigo-800"
            >
              {syncing === 'certificates' ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : 'Push Certificates Data'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
