import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Database, 
  Mail, 
  ShieldCheck, 
  Save, 
  RefreshCw, 
  Terminal, 
  AlertOctagon, 
  Copy, 
  Check, 
  HardDriveUpload,
  Layers
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';

// Import newly created modular UI blocks
import { ExportCenter } from '../components/Production/ExportCenter';
import { ReportHistoryTable } from '../components/Production/ReportHistoryTable';
import { EmailCenter } from '../components/Production/EmailCenter';
import { GoogleSheetsSyncPanel } from '../components/Production/GoogleSheetsSyncPanel';
import { AuditLogTable } from '../components/Production/AuditLogTable';

export interface ErrorLogInfo {
  id: string;
  module: string;
  errorMessage: string;
  timestamp: any;
  user: string;
}

export const DeploymentSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'integrations' | 'notifications' | 'audit' | 'scaffolds'>('integrations');
  const [exportTrigger, setExportTrigger] = useState(0);
  
  // States for Error Log trace
  const [errorLogs, setErrorLogs] = useState<ErrorLogInfo[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(true);
  const [copiedScript, setCopiedScript] = useState(false);

  // States for interactive backup checklist (local storage persistent for quick sandbox walkthroughs)
  const [backupLogs, setBackupLogs] = useState({
    firestore: false,
    sheets: false,
    csv: false
  });

  const loadErrorLogs = async () => {
    try {
      setLoadingErrors(true);
      const q = query(
        collection(db, 'error_logs'),
        orderBy('timestamp', 'desc'),
        limit(15)
      );
      const snap = await getDocs(q);
      const items: ErrorLogInfo[] = snap.docs.map(row => {
        const d = row.data();
        return {
          id: row.id,
          module: d.module || 'SYSTEM',
          errorMessage: d.errorMessage || 'Unknown exception logged.',
          timestamp: d.timestamp,
          user: d.user || 'anonymous'
        };
      });
      setErrorLogs(items);
    } catch {
      // Ignored
    } finally {
      setLoadingErrors(false);
    }
  };

  useEffect(() => {
    loadErrorLogs();
    
    // Resolve dynamic backup checklist checkbox states
    const saved = localStorage.getItem('bu_backup_checklist');
    if (saved) {
      try {
        setBackupLogs(JSON.parse(saved));
      } catch {
        // Ignored
      }
    }
  }, []);

  const toggleBackupCheck = (key: 'firestore' | 'sheets' | 'csv') => {
    const next = { ...backupLogs, [key]: !backupLogs[key] };
    setBackupLogs(next);
    localStorage.setItem('bu_backup_checklist', JSON.stringify(next));
  };

  const handleTriggerErrorSimulation = async () => {
    try {
      await addDoc(collection(db, 'error_logs'), {
        module: 'SANDBOX_SIMULATION',
        errorMessage: 'Simulated trial error logged to verify real-time log ingestion alerts.',
        timestamp: serverTimestamp(),
        user: 'trainer@bu.ac.th'
      });
      await loadErrorLogs();
    } catch (e) {
      // Ignored
    }
  };

  // Google Apps Script source code template for teacher copy-paste panel
  const appsScriptCode = `/**
 * BANGKOK UNIVERSITY - TRAINING MANAGEMENT SYSTEM
 * GOOGLE APPS SCRIPT WEB APP GATEWAY (CORS COMPLIANT)
 */

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === 'send_attendance_email') {
      return handleAttendanceEmail(payload);
    } else if (action === 'send_certificate_email') {
      return handleCertificateEmail(payload);
    } else if (action === 'send_course_report_email') {
      return handleCourseReportEmail(payload);
    } else if (action === 'sync_sheets') {
      return handleSyncSheets(payload);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Unknown API action call parameter: ' + action
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Processing error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Sends a transactional email when attendance checklist is saved
 */
function handleAttendanceEmail(payload) {
  const subject = payload.studentName + " - Attendance check-in verified!";
  const body = "Dear " + payload.studentName + ",\\n\\n" +
               "Your check-in session for the course \\"" + payload.courseName + "\\" was logged successfully.\\n\\n" +
               "Session: " + payload.sessionName + "\\n" +
               "Check-in Time: " + payload.checkInTime + "\\n" +
               "Marked Standing: " + payload.attendanceStatus.toUpperCase() + "\\n\\n" +
               "Best regards,\\nBangkok University Certification Portal Office";

  MailApp.sendEmail(payload.recipient, subject, body);
  return sendJsonResult(true, "Check-in notice emailed to student " + payload.recipient);
}

/**
 * Sends an email on certificate completion
 */
function handleCertificateEmail(payload) {
  const subject = "Award Notification: Your Certificate is ready on EduCert Portal";
  const body = "Dear " + payload.studentName + ",\\n\\n" +
               "Congratulations! You have satisfied the required metrics for the course: " + payload.courseName + ".\\n\\n" +
               "Your Certificate Number is: " + payload.certificateNumber + "\\n" +
               "Verification link: " + payload.downloadLink + "\\n\\n" +
               "You can download and verify your certified copy anytime at your student cabinet dashboard.\\n\\n" +
               "Outstanding job!\\nDean of Computer Engineering, Bangkok University";

  MailApp.sendEmail(payload.recipient, subject, body);
  return sendJsonResult(true, "Certificate award emailed successfully to student " + payload.recipient);
}

/**
 * Sends generic course broadcasts
 */
function handleCourseReportEmail(payload) {
  MailApp.sendEmail({
    to: payload.recipient,
    subject: "Announcement: " + payload.courseName,
    htmlBody: payload.summaryText
  });
  return sendJsonResult(true, "Course Summary broadcasted to student " + payload.recipient);
}

/**
 * Handles appending spreadsheet records
 */
function handleSyncSheets(payload) {
  const activeSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = activeSpreadSheet.getSheetByName(payload.sheetName);

  if (!sheet) {
    sheet = activeSpreadSheet.insertSheet(payload.sheetName);
  }

  // Clear previous data and write fresh records with headers
  sheet.clear();
  sheet.appendRow(payload.headers);

  if (payload.rows && payload.rows.length > 0) {
    const range = sheet.getRange(2, 1, payload.rows.length, payload.headers.length);
    range.setValues(payload.rows);
  }

  return sendJsonResult(true, "Mirrored " + payload.rows.length + " database cells inside Sheet: " + payload.sheetName);
}

function sendJsonResult(success, message) {
  const out = JSON.stringify({ success: success, message: message });
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput("Connect state active. Webhook is online.").setMimeType(ContentService.MimeType.TEXT);
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6" id="ops-room-wrapper">
      
      {/* 1. Header display */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck className="h-5.5 w-5.5 text-blue-600" />
            System Operations Room & Integration Hub
          </h1>
          <p className="text-xs text-slate-500">
            Securely configure cryptographic gateways, push spreadsheets, inspect logs, trigger backups, and audit logins.
          </p>
        </div>
      </div>

      {/* 2. Top Tabs toggles bar */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto shrink-0 pb-1" id="ops-rooms-tabs">
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'integrations'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Database className="h-4 w-4 inline mr-1" /> Spreadsheet Syncer
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'notifications'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Mail className="h-4 w-4 inline mr-1" /> Email Notifications
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Terminal className="h-4 w-4 inline mr-1" /> Security Audit & Diagnostics
        </button>
        <button
          onClick={() => setActiveTab('scaffolds')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'scaffolds'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Layers className="h-4 w-4 inline mr-1" /> Apps Script Code Box
        </button>
      </div>

      {/* 3. Render contents depending on active tab */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="panel-integrations-tab">
          
          <div className="flex flex-col gap-6">
            <GoogleSheetsSyncPanel />
            <ExportCenter onExportSuccess={() => setExportTrigger(p => p + 1)} />
          </div>

          <div className="flex flex-col gap-6 font-normal">
            
            <ReportHistoryTable key={exportTrigger} />

            {/* Interactive Backup strategist panel */}
            <Card id="backup-checklist-panel" className="bg-white border-slate-205">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-sm font-black text-slate-850 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                  <HardDriveUpload className="h-4.5 w-4.5 text-blue-600" /> Administrative Backup Planner
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex flex-col gap-3">
                <p className="text-[11px] text-slate-550 leading-relaxed">
                  Safely maintain compliance files and historical data registers off-site. Tick off target milestones as backups complete.
                </p>

                <div className="flex flex-col gap-2.5 mt-1.5">
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs text-slate-705 font-bold cursor-pointer hover:bg-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={backupLogs.firestore} 
                      onChange={() => toggleBackupCheck('firestore')}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <div>
                      <span>Scheduled Daily Firestore Backup</span>
                      <p className="text-[9px] text-slate-400 font-medium normal-case mt-0.5">Automate backups to Google Drive or download Firestore collections as raw JSON documents.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs text-slate-705 font-bold cursor-pointer hover:bg-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={backupLogs.sheets} 
                      onChange={() => toggleBackupCheck('sheets')}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <div>
                      <span>Mirror Synced Spreadsheet Archives</span>
                      <p className="text-[9px] text-slate-400 font-medium normal-case mt-0.5">Use Google Sheets Version History tool to capture historical, read-only copies of sync runs.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-55 rounded-xl border border-slate-150 text-xs text-slate-705 font-bold cursor-pointer hover:bg-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={backupLogs.csv} 
                      onChange={() => toggleBackupCheck('csv')}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <div>
                      <span>Monthly Offline Manual CSV Dump</span>
                      <p className="text-[9px] text-slate-400 font-medium normal-case mt-0.5">Download full dataset checklists registers inside a local offline hard drive folder.</p>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div id="panel-notifications-tab">
          <EmailCenter />
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-normal" id="panel-audit-tab">
          
          <div className="lg:col-span-8">
            <AuditLogTable />
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Live Error Monitoring & Logs Ingestion feed */}
            <div id="error-logs-card" className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col h-full max-h-[500px]">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 leading-none">
                  <AlertOctagon className="h-4.5 w-4.5 text-rose-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Error Monitoring logs</h4>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleTriggerErrorSimulation}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-black uppercase rounded cursor-pointer transition-colors"
                    title="Insert simulated log"
                  >
                    Test Log
                  </button>
                  <button
                    onClick={loadErrorLogs}
                    className="p-1 cursor-pointer rounded hover:bg-slate-50 text-slate-500"
                  >
                    <RefreshCw className={`h-4.5 w-4.5 ${loadingErrors ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto min-h-[220px]">
                {loadingErrors ? (
                  <div className="h-full flex items-center justify-center p-12 text-xs font-mono text-slate-400 gap-1">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-500" /> Ingesting exception codes...
                  </div>
                ) : errorLogs.length === 0 ? (
                  <div className="p-12 text-center text-xs font-mono text-slate-400">
                    Excellent! No system errors captured in database logs.
                  </div>
                ) : (
                  <Table id="error-logs-table">
                    <Thead>
                      <Tr>
                        <Th>Failing scope</Th>
                        <Th>ISO Date</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {errorLogs.map(log => {
                        let formattedDate = '--';
                        if (log.timestamp?.toDate) {
                          formattedDate = log.timestamp.toDate().toLocaleString();
                        } else if (log.timestamp) {
                          formattedDate = new Date(log.timestamp).toLocaleString();
                        }

                        return (
                          <Tr key={log.id}>
                            <Td className="py-2 px-3 align-top">
                              <span className="text-[10px] font-bold text-rose-800 font-mono block uppercase">
                                {log.module}
                              </span>
                              <span className="text-[11px] text-slate-600 mt-1 block font-medium leading-tight select-all">
                                {log.errorMessage}
                              </span>
                              <span className="text-[9px] text-slate-400 block mt-1">Logged by: {log.user}</span>
                            </Td>
                            <Td className="py-2 px-3 text-[10px] text-slate-450 align-top whitespace-nowrap">
                              {formattedDate}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {activeTab === 'scaffolds' && (
        <div id="panel-scaffolds-tab" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-4 font-normal">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Google Apps Script Web App Template scaffold</h4>
              <p className="text-xs text-slate-500 mt-0.5">Instructional blueprint to host the email broadcaster and Google sheet syncers on Google Apps Script.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="text-xs font-bold flex items-center gap-1.5 h-9 border-slate-200 hover:bg-slate-50"
            >
              {copiedScript ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
              {copiedScript ? 'Scaffold Copied!' : 'Copy Script Template'}
            </Button>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-150 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-extrabold uppercase text-[10px] tracking-wider block mb-1">CORS and security publication handbook:</strong>
              When publishing your Google Apps Script script as a Web App, ensure to configure the permissions:
              <ul className="list-disc list-inside mt-1.5 flex flex-col gap-1 shrink-0 font-medium text-[11px]">
                <li>Execute the app as: <strong className="font-extrabold">"Me (trainer/dean account)"</strong></li>
                <li>Who has access: <strong className="font-extrabold">"Anyone"</strong></li>
                <li>Deploy as Web App, retrieve the production deployment Exec URL ending in <span className="font-mono bg-amber-100 px-1 py-0.5 rounded leading-none">/exec</span> and paste it in <span className="font-mono bg-amber-100 px-1 py-0.5 rounded leading-none">VITE_GAS_WEBAPP_URL</span>.</li>
              </ul>
            </div>
          </div>

          <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-[10.5px] leading-relaxed rounded-xl overflow-x-auto border border-slate-800 max-h-[440px] select-all">
            {appsScriptCode}
          </pre>
        </div>
      )}

    </div>
  );
};
export default DeploymentSettingsPage;
