import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { Mail, Send, CheckCircle2, AlertCircle, RefreshCw, Hourglass } from 'lucide-react';
import { sendCourseReportEmail } from '../../utils/gasService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';

export interface EmailLogEntry {
  id: string;
  emailType: string;
  recipient: string;
  status: string;
  sentAt: any;
}

export const EmailCenter: React.FC = () => {
  const [courses, setCourses] = useState<{ id: string; title: string; code: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [currentRoster, setCurrentRoster] = useState<{ email: string; name: string }[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  
  // Custom message fields
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  
  // UI parameters
  const [sending, setSending] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'err'; msg: string } | null>(null);
  
  // History collection
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Load courses on component mount
  useEffect(() => {
    async function loadCourses() {
      try {
        const snap = await getDocs(collection(db, 'courses'));
        const list = snap.docs.map(docItem => ({
          id: docItem.id,
          title: docItem.data().title || 'Untitled',
          code: docItem.data().code || 'UNT'
        }));
        setCourses(list);
        if (list.length > 0) {
          setSelectedCourseId(list[0].id);
        }
      } catch (err) {
        console.warn("Could not load course list:", err);
      }
    }
    loadCourses();
  }, []);

  // Fetch student roster whenever course changes
  useEffect(() => {
    if (!selectedCourseId) {
      setCurrentRoster([]);
      return;
    }

    async function loadRoster() {
      try {
        setLoadingRoster(true);
        const regsRef = collection(db, 'courses', selectedCourseId, 'registrations');
        const regsSnap = await getDocs(query(regsRef, where('status', '==', 'approved')));
        const studentIds = regsSnap.docs.map(docItem => docItem.data().studentId);

        if (studentIds.length === 0) {
          setCurrentRoster([]);
          return;
        }

        const list: { email: string; name: string }[] = [];
        for (const sId of studentIds) {
          const sSnap = await getDocs(query(collection(db, 'students'), where('id', '==', sId)));
          if (!sSnap.empty) {
            const data = sSnap.docs[0].data();
            list.push({
              email: data.email || 'student@example.com',
              name: data.name || 'Anonymous Student'
            });
          }
        }
        setCurrentRoster(list);
      } catch (e) {
        console.warn("Could not load course registered student profiles:", e);
      } finally {
        setLoadingRoster(false);
      }
    }
    loadRoster();
  }, [selectedCourseId]);

  const loadPastEmailLogs = async () => {
    try {
      setLoadingLogs(true);
      const q = query(
        collection(db, 'email_logs'),
        orderBy('sentAt', 'desc'),
        limit(25)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(row => {
        const d = row.data();
        return {
          id: row.id,
          emailType: d.emailType || 'GENERAL_ANN',
          recipient: d.recipient || '--',
          status: d.status || 'simulated',
          sentAt: d.sentAt
        };
      });
      setEmailLogs(items);
    } catch (err) {
      console.warn("Could not load past email audit log list:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadPastEmailLogs();
  }, []);

  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || currentRoster.length === 0 || !subject || !messageBody) {
      setStatusFeedback({ type: 'err', msg: 'Please select a valid course with registered trainees and fill the message fields.' });
      return;
    }

    setSending(true);
    setStatusFeedback(null);

    try {
      const activeCourseName = courses.find(c => c.id === selectedCourseId)?.title || 'Course';
      const emails = currentRoster.map(s => s.email);

      const htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; color: #334155;">
          <h2 style="color: #1e3a8a;">${subject}</h2>
          <p style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 20px;">
            Announcement: Course Summary Broadcast — ${activeCourseName}
          </p>
          <div style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; margin-bottom: 30px;">
            ${messageBody}
          </div>
          <p style="font-size: 11px; color: #94a3b8; border-t: 1px solid #e2e8f0; padding-top: 15px;">
            This security email transaction was completed via Bangkok University Educational Portal.
          </p>
        </div>
      `;

      const result = await sendCourseReportEmail({
        courseName: activeCourseName,
        summaryText: htmlContent,
        recipients: emails
      });

      setStatusFeedback({
        type: 'success',
        msg: `Successful broadcast completed! Sent ${result.sentCount} emails out of ${currentRoster.length} student targets.`
      });

      setSubject('');
      setMessageBody('');
      await loadPastEmailLogs();
    } catch (err: any) {
      setStatusFeedback({ type: 'err', msg: `Email broadcast error: ${err.message}` });
    } finally {
      setSending(false);
    }
  };

  return (
    <div id="email-center-dashboard" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* 1. Broadcast Message Constructor */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-xs">
        <form onSubmit={handleBroadcastAnnouncement} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Mail className="h-4.5 w-4.5" />
            </span>
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none">Course Broadcast Engine</h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Instant dispatch to all course registered candidates.</p>
            </div>
          </div>

          {statusFeedback && (
            <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 leading-relaxed font-semibold ${
              statusFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}>
              {statusFeedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />}
              <span>{statusFeedback.msg}</span>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Select Target Class:</span>
            <Select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="py-1.5 text-xs bg-slate-50 border-slate-200 rounded-lg"
              required
            >
              <option value="">-- Choose Course --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  [{c.code}] {c.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center flex flex-col items-center">
            {loadingRoster ? (
              <span className="text-[10px] text-slate-450 font-mono flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin text-blue-500" /> Compiling approved roster...
              </span>
            ) : (
              <span className="text-[10px] text-slate-600 font-mono font-semibold">
                Classroom Recipients Target: <strong className="text-blue-700 font-bold">{currentRoster.length}</strong> active student{currentRoster.length === 1 ? '' : 's'} registered.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Announcement Subject:</span>
            <Input
              type="text"
              placeholder="e.g. Schedule Update / Progress Report Confirmed"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-xs py-2 bg-white"
              required
              disabled={sending || currentRoster.length === 0}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Message Content (Syllabus summary / Instructions):</span>
            <textarea
              placeholder="Draft your course announcement body layout here..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              disabled={sending || currentRoster.length === 0}
              className="w-full text-xs min-h-[110px] p-2.5 border border-slate-200 rounded-lg bg-white font-sans focus:outline-blue-500"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={sending || currentRoster.length === 0 || !subject || !messageBody}
            className="w-full h-10 font-bold flex items-center justify-center gap-1.5"
          >
            {sending ? (
              <>
                <Hourglass className="h-4.5 w-4.5 animate-spin" /> Dispatching transmissions...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Broadcast email announcements
              </>
            )}
          </Button>
        </form>
      </div>

      {/* 2. Dispatchers Transaction Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col h-full min-h-[400px]">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 leading-none">
            <Mail className="h-4.5 w-4.5 text-blue-600" />
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Log Transmission Ledger</h4>
          </div>
          <button
            onClick={loadPastEmailLogs}
            className="p-1 cursor-pointer rounded hover:bg-slate-50 text-slate-500 hover:text-slate-850"
            title="Refresh Logs"
          >
            <RefreshCw className={`h-4 w-4 ${loadingLogs ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingLogs ? (
            <div className="h-full flex items-center justify-center p-12 text-xs font-mono text-slate-450 gap-1.5">
              <Hourglass className="h-4 w-4 animate-spin text-blue-500" /> Retrieving email transaction audits...
            </div>
          ) : emailLogs.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-slate-400">
              No outbound transit emails found in logs.
            </div>
          ) : (
            <Table id="email-logs-table">
              <Thead>
                <Tr>
                  <Th>System Event Type</Th>
                  <Th>Recipient Candidate</Th>
                  <Th>Verification Status</Th>
                  <Th>Stamp Date</Th>
                </Tr>
              </Thead>
              <Tbody>
                {emailLogs.map(log => {
                  let formattedDate = '--';
                  if (log.sentAt?.toDate) {
                    formattedDate = log.sentAt.toDate().toLocaleString();
                  } else if (log.sentAt) {
                    formattedDate = new Date(log.sentAt).toLocaleString();
                  }

                  return (
                    <Tr key={log.id}>
                      <Td className="font-bold text-xs font-mono text-indigo-700">
                        {log.emailType}
                      </Td>
                      <Td className="text-xs text-slate-600 truncate max-w-[130px]" title={log.recipient}>
                        {log.recipient}
                      </Td>
                      <Td>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-wide border ${
                          log.status === 'sent' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                            : (log.status === 'failed' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-slate-50 text-slate-700 border-slate-100')
                        }`}>
                          {log.status === 'sent' ? '✓ SENT' : (log.status === 'failed' ? '✗ FAILED' : '⚡ SIMULATED')}
                        </span>
                      </Td>
                      <Td className="text-[11px] text-slate-450">
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
  );
};
