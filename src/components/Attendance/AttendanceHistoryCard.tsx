import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { BookOpen, CalendarDays, Percent, Star, FileText, CheckCircle, Clock, AlertCircle, FileSpreadsheet, Activity } from 'lucide-react';
import { Attendance, Course, Session } from '../../types';

interface AttendanceHistoryCardProps {
  courses: Course[];
  sessionsMap: Record<string, { title: string; date: string; startTime?: string; endTime?: string }>;
  attendanceRecords: Attendance[];
  studentId: string;
}

export const AttendanceHistoryCard: React.FC<AttendanceHistoryCardProps> = ({
  courses,
  sessionsMap,
  attendanceRecords,
  studentId,
}) => {
  // Filter attendance specific to this student
  const studentLogs = attendanceRecords.filter((r) => r.studentId === studentId);

  // Group stats by course
  const courseSummaries = courses.map((course) => {
    // Collect student records belonging to this course
    const courseLogs = studentLogs.filter((r) => r.courseId === course.id);
    
    // Total checks for present / late
    const attendedCount = courseLogs.filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'manual').length;
    const excusedCount = courseLogs.filter((r) => r.status === 'excused').length;
    
    // We count total unique sessions this course had which student has been evaluated on
    const evaluatedLogs = courseLogs.length;

    const rate = evaluatedLogs > 0
      ? Math.round((attendedCount / evaluatedLogs) * 100)
      : 0;

    return {
      courseId: course.id,
      code: course.code,
      title: course.title,
      totalSessions: evaluatedLogs,
      attended: attendedCount,
      excused: excusedCount,
      rate,
      scorePlaceholder: rate >= 80 ? 'A (Excellent)' : rate >= 70 ? 'B (Good)' : rate >= 50 ? 'C (Needs Work)' : 'F (Risk)',
    };
  });

  return (
    <div className="flex flex-col gap-6" id="student-attendance-history-view">
      
      {/* 1. Header Summaries */}
      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-blue-600 animate-pulse" /> My Course Attendance Summaries
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="student-course-summary-grid">
          {courseSummaries.map((summary) => (
            <Card key={summary.courseId} className="border-slate-200 shadow-xs hover:shadow-sm" id={`course-summary-${summary.courseId}`}>
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono text-slate-400 font-bold tracking-widest uppercase">
                    {summary.code}
                  </span>
                  <span className="text-sm font-black text-slate-800 leading-snug truncate">
                    {summary.title}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-b border-slate-100 py-3 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total Checked Sessions</span>
                    <span className="font-extrabold text-slate-700">{summary.totalSessions} Sessions</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total Attendance</span>
                    <span className="font-extrabold text-slate-700">{summary.attended} Checked-in ({summary.excused} excused)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-slate-500">Attendance Rate</span>
                  </div>
                  <span className={`font-black text-sm px-2 py-0.5 rounded ${
                    summary.rate >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {summary.rate}%
                  </span>
                </div>

                {/* Score Placeholder */}
                <div className="flex items-center justify-between text-[11px] bg-slate-50/70 p-2 border border-slate-150/50 rounded-lg">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-slate-400 font-bold">Current Score Placeholder:</span>
                  </div>
                  <span className="font-mono font-bold text-blue-600">{summary.scorePlaceholder}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {courseSummaries.length === 0 && (
            <div className="col-span-full text-center p-8 bg-slate-50 border border-slate-200 text-slate-400 font-mono text-xs rounded-xl">
              You are not registered in any approved courses yet.
            </div>
          )}
        </div>
      </div>

      {/* 2. List Timeline */}
      <Card className="border-slate-200 shadow-xs" id="chronological-timeline-card">
        <CardContent className="p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <CalendarDays className="w-4.5 h-4.5 text-blue-600" />
              Verified Attendance Stamp Ledger
            </h3>
            <p className="text-xs text-slate-500">Historical chronological summary of check-ins registered across all training events.</p>
          </div>

          <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
            {studentLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-mono text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/10">
                No verified check-in events found for this session context.
              </div>
            ) : (
              studentLogs.map((item) => {
                const session = sessionsMap[item.sessionId] || { title: 'Training Session Block', date: '--', startTime: '--', endTime: '--' };
                const course = courses.find((c) => c.id === item.courseId);

                // Format safe checkin date
                let dStr = item.timestamp ? new Date(item.timestamp).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }) : '--';

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-slate-50 border border-slate-150/40 rounded-xl hover:bg-slate-50/30 transition-all gap-4"
                  >
                    <div className="flex flex-col gap-1 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                          {course?.code || 'CS-302'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{session.date}</span>
                      </div>
                      <span className="text-xs font-black text-slate-800 leading-snug">{session.title}</span>
                      <span className="text-[10px] text-slate-400">Checked-In At: <span className="font-mono text-slate-600 font-semibold">{dStr}</span></span>
                    </div>

                    <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0 w-full sm:w-auto">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border
                        ${(item.status === 'present' || item.status === 'manual') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : ''}
                        ${item.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-100' : ''}
                        ${item.status === 'excused' ? 'bg-purple-50 text-purple-700 border-purple-100' : ''}
                        ${item.status === 'absent' ? 'bg-red-50 text-red-700 border-red-100' : ''}
                      `}>
                        {item.status}
                      </span>

                      {item.note && (
                        <span className="text-[9px] text-slate-500 font-medium bg-white border border-slate-200 rounded px-1.5 py-0.5 truncate max-w-[200px]">
                          Remark: {item.note}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default AttendanceHistoryCard;
