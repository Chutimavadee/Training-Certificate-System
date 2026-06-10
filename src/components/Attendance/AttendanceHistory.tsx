import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { CalendarCheck, ShieldAlert, BadgeCheck, FileText } from 'lucide-react';
import { Attendance } from '../../types';

interface AttendanceHistoryProps {
  records: Attendance[];
  coursesMap: Record<string, { code: string; title: string }>;
  sessionsMap: Record<string, { title: string; date: string }>;
}

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({
  records,
  coursesMap,
  sessionsMap,
}) => {
  return (
    <div className="flex flex-col gap-4 border border-slate-200 bg-white p-5 rounded-2xl shadow-sm" id="attendance-history-panel">
      <div>
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
          <CalendarCheck className="w-4.5 h-4.5 text-blue-600" />
          My Verified Attendance History
        </h3>
        <p className="text-xs text-slate-500">Continuous cryptographic ledger of check-ins registered.</p>
      </div>

      <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1" id="history-scroll-stage">
        {records.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-mono text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            No historical attendance logs located for this account node.
          </div>
        ) : (
          records.map((item) => {
            const course = coursesMap[item.courseId] || { code: 'CRSE', title: 'Generic Training class' };
            const session = sessionsMap[item.sessionId] || { title: 'Academic Hour block', date: '--' };

            // Render safe checkin date
            let displayDate = session.date;
            let displayTime = '';
            if (item.timestamp) {
              const d = (item.timestamp.toDate) ? item.timestamp.toDate() : new Date(item.timestamp);
              displayDate = d.toLocaleDateString([], { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
              displayTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-slate-50/60 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all gap-3"
                id={`history-entry-${item.id}`}
              >
                <div className="flex flex-col gap-0.5 max-w-sm">
                  {/* Course Details */}
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                    {course.code} - {course.title}
                  </span>
                  <span className="text-sm font-extrabold text-slate-800 leading-tight">
                    {session.title}
                  </span>
                  
                  {/* Sync Timestamp */}
                  <span className="text-[10px] text-slate-500 font-medium">
                    Verified Date: {displayDate} {displayTime && `at ${displayTime}`}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 sm:text-right w-full sm:w-auto sm:justify-end">
                  {/* Token block */}
                  {item.tokenUsed && (
                    <div className="hidden md:flex flex-col text-[9px] font-mono text-slate-400">
                      <span>SIGNATURE STAMP</span>
                      <span className="font-bold text-indigo-500 select-all max-w-[80px] truncate">
                        {item.tokenUsed.substring(0, 10)}
                      </span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 ml-auto sm:ml-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border
                      ${(item.status === 'present' || item.status === 'manual') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : ''}
                      ${item.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-100' : ''}
                      ${item.status === 'absent' ? 'bg-red-50 text-red-600 border-red-100' : ''}
                    `}>
                      {item.status}
                    </span>

                    <span className="text-[9px] font-mono tracking-widest text-slate-400 font-bold uppercase">
                      via {item.method || 'qr'} scan
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AttendanceHistory;
