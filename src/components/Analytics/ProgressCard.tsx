import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { CheckCircle2, ChevronRight, Bookmark, Award } from 'lucide-react';

interface ProgressCardProps {
  courseName: string;
  courseCode: string;
  attendanceCount: number;
  attendanceRate: number;
  attendanceScore: number;
  completedSessions: number;
  remainingSessions: number;
  totalPlannedSessions: number;
  maxPoints: number;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  courseName,
  courseCode,
  attendanceCount,
  attendanceRate,
  attendanceScore,
  completedSessions,
  remainingSessions,
  totalPlannedSessions,
  maxPoints,
}) => {
  // Cap percentage at 100
  const sessionProgressPercent = totalPlannedSessions > 0 
    ? Math.min(100, (completedSessions / totalPlannedSessions) * 100) 
    : 0;

  return (
    <Card className="border border-slate-200/80 shadow-md bg-white overflow-hidden" id="student-progress-card">
      <CardHeader className="bg-slate-50 border-b border-slate-100 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
            {courseCode}
          </span>
          <CardTitle className="text-base font-extrabold text-slate-800 tracking-tight mt-1">
            {courseName}
          </CardTitle>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            PROPORTIONAL SCORE
          </span>
          <span className="text-xl font-black text-blue-600 tracking-tight">
            {attendanceScore.toFixed(2)} <span className="text-xs font-semibold text-slate-400">/ {maxPoints}</span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6 flex flex-col gap-6">
        {/* Core Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" id="progress-summary-board">
          <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Successful Scans
            </span>
            <span className="text-lg font-black text-slate-800 mt-1">
              {attendanceCount}
            </span>
          </div>

          <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Attendance %
            </span>
            <span className={`text-lg font-black mt-1 ${attendanceRate >= 80 ? 'text-emerald-600' : 'text-red-500'}`}>
              {attendanceRate.toFixed(2)}%
            </span>
          </div>

          <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Lessons Checked
            </span>
            <span className="text-lg font-black text-slate-800 mt-1">
              {completedSessions} <span className="text-xs text-slate-400 font-medium">lessons</span>
            </span>
          </div>

          <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Remaining Target
            </span>
            <span className="text-lg font-black text-slate-800 mt-1">
              {remainingSessions} <span className="text-xs text-slate-400 font-medium">lessons</span>
            </span>
          </div>
        </div>

        {/* Attendance Rate Progress Slide */}
        <div className="flex flex-col gap-1.5" id="progress-bar-attendance">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Attendance Rating</span>
            <span className={attendanceRate >= 80 ? 'text-emerald-600' : 'text-red-500'}>{attendanceRate.toFixed(2)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                attendanceRate >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-red-500 to-amber-500'
              }`}
              style={{ width: `${Math.min(100, attendanceRate)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>Minimum Gate: 80%</span>
            <span>Current Status: {attendanceRate >= 80 ? 'Safe' : 'At Risk'}</span>
          </div>
        </div>

        {/* Sessions Completed Progress Slide */}
        <div className="flex flex-col gap-1.5" id="progress-bar-sessions">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1"><ChevronRight className="h-4 w-4 text-indigo-500" /> Course Timeline Checked</span>
            <span>{completedSessions} / {totalPlannedSessions} Sessions</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${sessionProgressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>Academic Year Target: {totalPlannedSessions} Planned Sessions</span>
            <span>{remainingSessions} left of program</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressCard;
