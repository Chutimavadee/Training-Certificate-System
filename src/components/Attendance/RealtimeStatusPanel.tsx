import React from 'react';
import { Play, Pause, Square, AlertCircle, ShieldAlert, BadgeCheck } from 'lucide-react';
import { Button } from '../ui/Button';

interface RealtimeStatusPanelProps {
  courseTitle: string;
  sessionTitle: string;
  startTime: string;
  endTime: string;
  isPaused: boolean;
  lateMinutes: number;
  onLateMinutesChange: (mins: number) => void;
  onTogglePause: () => void;
  onEndSession: () => void;
  attendanceActive: boolean;
  sessionStatus?: 'upcoming' | 'active' | 'completed' | 'closed';
}

export const RealtimeStatusPanel: React.FC<RealtimeStatusPanelProps> = ({
  courseTitle,
  sessionTitle,
  startTime,
  endTime,
  isPaused,
  lateMinutes,
  onLateMinutesChange,
  onTogglePause,
  onEndSession,
  attendanceActive,
  sessionStatus = 'upcoming',
}) => {
  return (
    <div className="flex flex-col gap-4 border border-slate-200 bg-white p-5 rounded-2xl shadow-sm" id="realtime-status-control-panel">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Core Description Column */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-widest">
            {courseTitle}
          </span>
          <h2 className="text-lg font-extrabold text-slate-800 leading-tight">
            {sessionTitle}
          </h2>
          <span className="text-xs text-slate-500 font-medium mt-1">
            Planned Schedule: <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[11px]">{startTime} - {endTime}</code>
          </span>
        </div>

        {/* Operational Status Badges */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border select-none
            ${sessionStatus === 'upcoming' ? 'bg-slate-50 text-slate-500 border-slate-200' : ''}
            ${sessionStatus === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' : ''}
            ${sessionStatus === 'completed' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : ''}
            ${sessionStatus === 'closed' ? 'bg-red-50 text-red-700 border-red-200' : ''}
          `}>
            Session {sessionStatus}
          </span>

          {attendanceActive ? (
            isPaused ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse border border-amber-200">
                <Pause className="w-3.5 h-3.5 fill-current" /> SECURED PAUSED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 animate-pulse border border-emerald-200">
                <Play className="w-3.5 h-3.5 fill-current" /> SECURED BROADCASTING
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              <Square className="w-3.5 h-3.5 fill-current" /> OFFLINE INACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Interactive options & late threshold selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4 items-center">
        {/* Dropdown to adjust late threshold */}
        <div className="flex flex-col gap-1 w-full max-w-sm">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Tardy/Late grace period threshold
          </label>
          <div className="flex items-center gap-2">
            <select
              value={lateMinutes}
              onChange={(e) => onLateMinutesChange(Number(e.target.value))}
              disabled={!attendanceActive}
              className="flex-grow text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg h-9 px-2 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer disabled:opacity-60"
            >
              <option value="5">5 Minutes (Strict academic rules)</option>
              <option value="15">15 Minutes (Standard grace period)</option>
              <option value="30">30 Minutes (Relaxed session guidelines)</option>
              <option value="60">60 Minutes (Lecture mode threshold)</option>
            </select>
          </div>
          <span className="text-[9px] text-slate-400">
            Trainees check-in in excess of {lateMinutes} mins after start will be registered as <span className="font-bold text-amber-500">LATE</span>.
          </span>
        </div>

        {/* Action Toggles */}
        <div className="flex flex-wrap items-center justify-end gap-2 w-full">
          {attendanceActive ? (
            <>
              {/* Force Pause */}
              <Button
                variant={isPaused ? 'primary' : 'outline'}
                onClick={onTogglePause}
                className="text-xs h-9 font-bold px-4 hover:shadow"
              >
                {isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1 bg-transparent fill-current" /> Resume Check-in
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 mr-1 bg-transparent fill-current" /> Freeze Broadcast
                  </>
                )}
              </Button>

              {/* End / Finalize */}
              <Button
                variant="destructive"
                onClick={onEndSession}
                className="text-xs h-9 font-bold px-4 hover:shadow"
              >
                <Square className="w-3.5 h-3.5 mr-1 bg-transparent fill-current" /> Finalize Enrollment
              </Button>
            </>
          ) : (
            <div className="p-2 sm:p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-[10px] md:text-xs text-blue-800 leading-normal font-semibold flex items-start gap-2 max-w-sm">
              <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>Configure session parameters & start block above to broadcast security handshake.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealtimeStatusPanel;
