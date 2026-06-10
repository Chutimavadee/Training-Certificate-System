import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { UserCheck, FileSpreadsheet, X, MessageSquarePlus, Activity } from 'lucide-react';

interface BulkActionToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onApplyBulkAction: (status: 'present' | 'excused', note: string) => void | Promise<void>;
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedCount,
  onClearSelection,
  onApplyBulkAction,
}) => {
  const [bulkNote, setBulkNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [activeStatusTarget, setActiveStatusTarget] = useState<'present' | 'excused' | null>(null);

  if (selectedCount === 0) return null;

  const handleApply = (status: 'present' | 'excused') => {
    if (!showNoteInput) {
      setActiveStatusTarget(status);
      setShowNoteInput(true);
      return;
    }

    onApplyBulkAction(status, bulkNote);
    // Reset states
    setBulkNote('');
    setShowNoteInput(false);
    setActiveStatusTarget(null);
  };

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl shadow-2xl flex flex-col gap-3 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
      id="attendance-bulk-toolbar-fixed"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Count Pill */}
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 font-extrabold text-xs px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-100" />
            {selectedCount} Selected
          </div>
          <p className="text-xs text-slate-300 font-medium">Batch Update Toolbar</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!showNoteInput ? (
            <>
              <Button
                variant="default"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 border-none font-bold text-xs h-8"
                onClick={() => handleApply('present')}
              >
                <UserCheck className="w-3.5 h-3.5 mr-1" /> Mark Present
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="bg-purple-600 text-white hover:bg-purple-500 border-none font-bold text-xs h-8"
                onClick={() => handleApply('excused')}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Mark Excused
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider animate-pulse">
                Review Bulk Note
              </span>
              <Button
                variant="default"
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 border-none font-bold text-xs h-8"
                onClick={() => handleApply(activeStatusTarget || 'present')}
              >
                Apply Marks
              </Button>
            </div>
          )}

          <button
            onClick={onClearSelection}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cancel Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slideout Bulk Note Box */}
      {showNoteInput && (
        <div className="flex items-center gap-2 border-t border-slate-800 pt-2.5 animate-in fade-in duration-200">
          <div className="relative flex-1">
            <MessageSquarePlus className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. Excused: Training event, Manual check-in batch..."
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              className="w-full text-xs bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg h-8 pl-9 pr-3 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs h-8"
            onClick={() => {
              setShowNoteInput(false);
              setActiveStatusTarget(null);
            }}
          >
            Back
          </Button>
        </div>
      )}
    </div>
  );
};

export default BulkActionToolbar;
