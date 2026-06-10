import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { X, CheckCircle, Clock, AlertCircle, FileSpreadsheet, Keyboard, FileText, ChevronDown } from 'lucide-react';
import { Attendance, StudentProfile } from '../../types';

interface ManualOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  currentRecord: Attendance | null;
  onSave: (
    status: 'present' | 'late' | 'absent' | 'excused' | 'manual',
    note: string
  ) => void | Promise<void>;
}

export const ManualOverrideModal: React.FC<ManualOverrideModalProps> = ({
  isOpen,
  onClose,
  student,
  currentRecord,
  onSave,
}) => {
  const [status, setStatus] = useState<'present' | 'late' | 'absent' | 'excused' | 'manual'>('present');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Synchronize when inputs change
  useEffect(() => {
    if (currentRecord) {
      setStatus(currentRecord.status);
      setNote(currentRecord.note || '');
    } else {
      setStatus('present');
      setNote('');
    }
  }, [currentRecord, isOpen]);

  if (!isOpen || !student) return null;

  const quickRemarks = [
    'Medical Leave',
    'Technical Issue',
    'Late Arrival',
    'Approved by Instructor',
    'External Job Training',
    'Bad weather conditions',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSave(status, note);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'present', label: 'Present', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle },
    { value: 'late', label: 'Late', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: Clock },
    { value: 'absent', label: 'Absent', color: 'text-red-600 bg-red-50 border-red-100', icon: AlertCircle },
    { value: 'excused', label: 'Excused Leave', color: 'text-purple-600 bg-purple-50 border-purple-100', icon: FileSpreadsheet },
    { value: 'manual', label: 'Teacher Admin Override', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: Keyboard },
  ] as const;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200"
      id="manual-override-dialog-box"
    >
      {/* Background click close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Modal Dialog container */}
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in scale-in duration-200"
        id="manual-override-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-950 text-white">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-blue-400">
              Database Entry Change
            </span>
            <h4 className="text-sm font-bold">Manual Attendance Override</h4>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Target Info */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400 uppercase text-[9px]">Student Name</span>
              <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded">
                ID: {student.studentId}
              </span>
            </div>
            <span className="text-sm font-black text-slate-800">{student.name}</span>
            <span className="text-[10px] text-slate-400">{student.email}</span>
          </div>

          {/* Status Selection Buttons */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500">Assign Training Status</label>
            <div className="grid grid-cols-2 gap-2" id="override-status-grid">
              {statusOptions.map((opt) => {
                const Icon = opt.icon;
                const isChosen = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-extrabold transition-all text-left cursor-pointer ${
                      isChosen ? `${opt.color} ring-2 ring-blue-500/10` : 'bg-slate-50 border-slate-200/70 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Note input */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <FileText className="w-4 h-4 text-slate-400" /> Specify Override Remarks
              </label>
              <span className="text-[9px] font-bold text-slate-400 uppercase">attendance.note</span>
            </div>
            <textarea
              placeholder="e.g. Medical excuse certificate received, verified by system..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 p-3 rounded-xl min-h-[80px] focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white focus:border-blue-500 font-medium leading-relaxed"
              required
            />
          </div>

          {/* Quick Preset Suggestions */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Note Presets</span>
            <div className="flex flex-wrap gap-1.5" id="presets-container">
              {quickRemarks.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNote(preset)}
                  className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200/80 rounded-lg transition-all cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Submits */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-xs font-extrabold h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 font-extrabold text-xs h-9"
            >
              {loading ? 'Committing...' : 'Commit Transaction'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualOverrideModal;
