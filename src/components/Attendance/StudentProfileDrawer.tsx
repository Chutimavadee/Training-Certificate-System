import React from 'react';
import { X, CalendarDays, CheckCircle, Clock, AlertCircle, FileSpreadsheet, ListTodo, UserCheck, Mail, ShieldAlert } from 'lucide-react';
import { Attendance, StudentProfile, Session, Course } from '../../types';

interface StudentProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  attendanceRecords: Attendance[]; // Records of the current course or filtered sessions
  sessions: Session[];            // Course sessions
  course: Course | null | undefined;
}

export const StudentProfileDrawer: React.FC<StudentProfileDrawerProps> = ({
  isOpen,
  onClose,
  student,
  attendanceRecords,
  sessions,
  course,
}) => {
  if (!isOpen || !student) return null;

  // Filter attendance records specific to this student
  const studentRecords = attendanceRecords.filter((r) => r.studentId === student.id);

  // Statistics calculation
  const totalSessions = sessions.length;
  const matchRecord = (sid: string) => studentRecords.find((r) => r.sessionId === sid);

  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let excusedCount = 0;

  sessions.forEach((s) => {
    const r = matchRecord(s.id);
    const status = r?.status || 'absent';
    if (status === 'present' || status === 'manual') presentCount++;
    else if (status === 'late') lateCount++;
    else if (status === 'excused') excusedCount++;
    else absentCount++;
  });

  const attendanceRate = totalSessions > 0
    ? Math.round(((presentCount + lateCount) / totalSessions) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-[60] animate-in fade-in duration-200"
      id="student-profile-drawer"
    >
      {/* Click outside backdrop triggers close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Drawer Body */}
      <div
        className="relative w-full max-w-lg bg-white h-screen shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        id="student-drawer-body"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-tight">Trainee Audit Profile</h4>
              <p className="text-[10px] text-slate-300 uppercase tracking-wider font-mono">
                {course?.code || 'CRSE'} Classroom Analytics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6" id="student-drawer-scrollbox">
          {/* Section 1: Detailed Profile Card */}
          <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-black text-blue-700 text-lg shadow-inner">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-extrabold text-slate-800">{student.name}</span>
                <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5 h-4">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {student.email}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-200/60 pt-3 flex items-center justify-between text-xs text-slate-600">
              <span className="font-bold text-slate-400 font-sans uppercase text-[10px]">Student Identifier</span>
              <span className="font-mono bg-slate-200/70 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                {student.studentId || 'STD-UNASSN'}
              </span>
            </div>
          </div>

          {/* Section 2: Course Progress Indicator */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Performance Rate</span>
            <div className="grid grid-cols-4 gap-2.5">
              <div className="p-2.5 border border-slate-100 bg-emerald-50 text-emerald-800 rounded-xl flex flex-col items-center">
                <span className="text-lg font-black">{presentCount}</span>
                <span className="text-[9px] font-bold uppercase text-emerald-600">Present</span>
              </div>
              <div className="p-2.5 border border-slate-100 bg-amber-50 text-amber-800 rounded-xl flex flex-col items-center">
                <span className="text-lg font-black">{lateCount}</span>
                <span className="text-[9px] font-bold uppercase text-amber-600">Late</span>
              </div>
              <div className="p-2.5 border border-slate-100 bg-red-50/70 text-red-800 rounded-xl flex flex-col items-center">
                <span className="text-lg font-black">{absentCount}</span>
                <span className="text-[9px] font-bold uppercase text-red-600">Absent</span>
              </div>
              <div className="p-2.5 border border-slate-100 bg-purple-50 text-purple-800 rounded-xl flex flex-col items-center">
                <span className="text-lg font-black">{excusedCount}</span>
                <span className="text-[9px] font-bold uppercase text-purple-600">Excused</span>
              </div>
            </div>

            {/* Attendance Progress Percentage */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Attendance Percentage</span>
                <span className="font-black text-slate-800 text-sm">{attendanceRate}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    attendanceRate >= 80 ? 'bg-emerald-500' : attendanceRate >= 60 ? 'bg-amber-400' : 'bg-red-500'
                  }`}
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
              <p className="text-[9px] text-slate-400 leading-normal mt-0.5">
                Minimum certification compliance threshold is usually 80%.
              </p>
            </div>
          </div>

          {/* Section 3: Attendance History Timelines */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ListTodo className="w-4 h-4 text-slate-500" /> Attendance Timeline
            </span>

            <div className="flex flex-col gap-3 border-l-2 border-slate-100 pl-3.5 ml-2.5" id="timeline-stack">
              {sessions.map((sess) => {
                const rec = matchRecord(sess.id);
                const status = rec?.status || 'absent';
                const remarks = rec?.note;

                return (
                  <div key={sess.id} className="relative flex flex-col gap-1 pb-1.5" id={`timeline-sess-${sess.id}`}>
                    {/* Ring indicator anchor */}
                    <span
                      className={`absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-white ring-1 ring-slate-100
                        ${(status === 'present' || status === 'manual') ? 'bg-emerald-500' : ''}
                        ${status === 'late' ? 'bg-amber-500' : ''}
                        ${status === 'excused' ? 'bg-purple-500' : ''}
                        ${status === 'absent' ? 'bg-red-500' : ''}
                      `}
                    />

                    {/* Content */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-700">{sess.title}</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border
                          ${(status === 'present' || status === 'manual') ? 'bg-emerald-50/70 text-emerald-700 border-emerald-100' : ''}
                          ${status === 'late' ? 'bg-amber-50/70 text-amber-700 border-amber-100' : ''}
                          ${status === 'excused' ? 'bg-purple-50/70 text-purple-700 border-purple-100' : ''}
                          ${status === 'absent' ? 'bg-red-50/70 text-red-700 border-red-100' : ''}
                        `}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Course Session Date: {sess.date} ({sess.startTime} - {sess.endTime})</span>
                      {rec?.checkinTime && (
                        <span className="font-mono text-slate-500">
                          In: {new Date(rec.checkinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {remarks && (
                      <div className="mt-1 p-2 bg-slate-50 border border-slate-200/80 rounded-lg text-[10px] text-slate-600 font-medium flex items-start gap-1">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-500 uppercase text-[8px]">Overridden Notes</span>
                          <span>{remarks}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {sessions.length === 0 && (
                <div className="text-xs text-slate-400 py-3 font-mono">
                  No active classroom hours initialized under this directory scope.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfileDrawer;
