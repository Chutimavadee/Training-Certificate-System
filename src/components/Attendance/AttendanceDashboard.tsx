import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { Attendance, StudentProfile, Course, Session, QrSession } from '../../types';
import {
  generateOnDemandAbsents,
  checkAndAutoCloseSession,
  modifyAttendanceStatus,
  bulkModifyAttendanceStatus,
  prepareAttendanceExportData
} from '../../utils/attendanceService';

import { AttendanceSummaryCards } from './AttendanceSummaryCards';
import { AttendanceFilters, StatusFilterType, SortByType, SortOrderType } from './AttendanceFilters';
import { AttendanceTable } from './AttendanceTable';
import { BulkActionToolbar } from './BulkActionToolbar';
import { StudentProfileDrawer } from './StudentProfileDrawer';
import { ManualOverrideModal } from './ManualOverrideModal';
import { CountdownTimer } from './CountdownTimer';
import { QRCodeDisplay } from './QRCodeDisplay';
import { RealtimeStatusPanel } from './RealtimeStatusPanel';

import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Sparkles, CalendarDays, PlusCircle, PlayCircle, ShieldCheck, Download, CheckSquare } from 'lucide-react';

interface AttendanceDashboardProps {
  courses: Course[];
  selectedCourseId: string;
  setSelectedCourseId: (id: string) => void;
  sessions: Session[];
  selectedSessionId: string;
  setSelectedSessionId: (id: string) => void;
  registeredStudents: StudentProfile[];
  attendanceRecords: Attendance[];
  activeQrSession: QrSession | null;
  isPaused: boolean;
  onTogglePause: () => void;
  onEndSession: () => void;
  onStartQrSession: () => void;
  lateMinutes: number;
  setLateMinutes: (m: number) => void;
  onManualRefresh: () => void;
  setSuccessMessage: (msg: string | null) => void;
  setErrorMessage: (msg: string | null) => void;
}

export const AttendanceDashboard: React.FC<AttendanceDashboardProps> = ({
  courses,
  selectedCourseId,
  setSelectedCourseId,
  sessions,
  selectedSessionId,
  setSelectedSessionId,
  registeredStudents,
  attendanceRecords,
  activeQrSession,
  isPaused,
  onTogglePause,
  onEndSession,
  onStartQrSession,
  lateMinutes,
  setLateMinutes,
  onManualRefresh,
  setSuccessMessage,
  setErrorMessage,
}) => {
  // Query Filter & Sorting States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [sortBy, setSortBy] = useState<SortByType>('name');
  const [sortOrder, setSortOrder] = useState<SortOrderType>('asc');

  // Bulk operation lists
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Drawer / Modals interactive state
  const [selectedStudentForDrawer, setSelectedStudentForDrawer] = useState<StudentProfile | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [selectedStudentForOverride, setSelectedStudentForOverride] = useState<StudentProfile | null>(null);
  const [currentOverrideRecord, setCurrentOverrideRecord] = useState<Attendance | null>(null);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);

  // Active items mapping
  const activeCourse = courses.find((c) => c.id === selectedCourseId) || null;
  const activeSession = sessions.find((s) => s.id === selectedSessionId) || null;

  // 1. ENGINE RUN: On-Demand Auto Absenting Engine
  useEffect(() => {
    if (selectedCourseId && selectedSessionId && registeredStudents.length > 0) {
      const triggerAutoAbsent = async () => {
        try {
          await generateOnDemandAbsents(selectedCourseId, selectedSessionId, registeredStudents, attendanceRecords);
        } catch (e: any) {
          console.error('[OnDemand Auto Absent Error]', e);
        }
      };
      triggerAutoAbsent();
    }
  }, [selectedSessionId, registeredStudents.length, attendanceRecords.length]);

  // 2. ENGINE RUN: Auto-Close Session Engine
  useEffect(() => {
    if (selectedCourseId && activeSession) {
      const triggerAutoClose = async () => {
        const hasClosed = await checkAndAutoCloseSession(selectedCourseId, activeSession);
        if (hasClosed) {
          setSuccessMessage('This session time boundary exceeded! Auto marked completed.');
          onManualRefresh();
        }
      };
      triggerAutoClose();
    }
  }, [selectedSessionId, activeSession]);

  // Handle manual individual override saving
  const handleSaveManualOverride = async (
    status: 'present' | 'late' | 'absent' | 'excused' | 'manual',
    note: string
  ) => {
    if (!selectedStudentForOverride || !selectedCourseId || !selectedSessionId) return;
    try {
      const instructorId = auth.currentUser?.uid || 'instructor';
      await modifyAttendanceStatus(
        selectedStudentForOverride.id,
        selectedSessionId,
        selectedCourseId,
        status,
        note,
        instructorId
      );
      setSuccessMessage(`Manual override applied for: ${selectedStudentForOverride.name}`);
      onManualRefresh();
    } catch (err: any) {
      setErrorMessage(`Override failed to commit: ${err.message}`);
    }
  };

  // Backward compatibility status updater for older table integrations if invoked
  const handleStatusChangeLegacy = async (
    studentId: string,
    newStatus: 'present' | 'late' | 'absent' | 'excused' | 'manual',
    note: string
  ) => {
    if (!selectedCourseId || !selectedSessionId) return;
    try {
      const instructorId = auth.currentUser?.uid || 'instructor';
      await modifyAttendanceStatus(
        studentId,
        selectedSessionId,
        selectedCourseId,
        newStatus,
        note,
        instructorId
      );
      setSuccessMessage(`Status overridden in ledger.`);
      onManualRefresh();
    } catch (err: any) {
      setErrorMessage(`Failed to change status: ${err.message}`);
    }
  };

  // Handle bulk updates from bottom toolbar
  const handleApplyBulkAction = async (status: 'present' | 'excused', note: string) => {
    if (selectedStudentIds.length === 0 || !selectedCourseId || !selectedSessionId) return;
    try {
      const instructorId = auth.currentUser?.uid || 'instructor';
      await bulkModifyAttendanceStatus(
        selectedStudentIds,
        selectedSessionId,
        selectedCourseId,
        status,
        note,
        instructorId
      );
      setSuccessMessage(`Successfully applied bulk mark [${status}] to ${selectedStudentIds.length} students.`);
      setSelectedStudentIds([]);
      onManualRefresh();
    } catch (err: any) {
      setErrorMessage(`Bulk modification failure: ${err.message}`);
    }
  };

  // Prepare & trigger developer-facing console log layout prep for CSV/Excel
  const handleExportConsolePrep = () => {
    const formattedData = prepareAttendanceExportData(registeredStudents, attendanceRecords);
    console.log('[EXPORT PREPARATION MODULE - DATA READY FOR CSV/EXCEL]', formattedData);
    setSuccessMessage(
      `Prepared checklist matrix for exporting (${formattedData.length} entries). Pipeline data structure formatted in dev logs console.`
    );
  };

  // Metric aggregates for dynamic rendering
  const presentCount = attendanceRecords.filter((r) => r.status === 'present' || r.status === 'manual').length;
  const lateCount = attendanceRecords.filter((r) => r.status === 'late').length;
  const absentCount = attendanceRecords.filter((r) => r.status === 'absent').length;
  const excusedCount = attendanceRecords.filter((r) => r.status === 'excused').length;

  return (
    <div className="flex flex-col gap-6" id="attendance-dashboard-main-component">
      
      {/* Selection Cards Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" id="selections-grid">
        <div className="lg:col-span-3">
          {/* Active Status Display Panel */}
          {activeSession ? (
            <RealtimeStatusPanel
              courseTitle={activeCourse?.title || 'Training Program Class'}
              sessionTitle={activeSession.title}
              startTime={activeSession.startTime}
              endTime={activeSession.endTime}
              isPaused={isPaused}
              lateMinutes={lateMinutes}
              onLateMinutesChange={setLateMinutes}
              onTogglePause={onTogglePause}
              onEndSession={onEndSession}
              attendanceActive={!!activeQrSession}
              sessionStatus={activeSession.status}
            />
          ) : (
            <Card className="border-slate-200 shadow-xs h-full flex flex-col justify-center">
              <CardContent className="p-6 text-center text-slate-400 font-sans text-xs">
                Please select a Course and Session to proceed with Realtime Streaming Controls.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Course & Session Selector Widget */}
        <Card className="border-slate-200 shadow-xs" id="quick-selectors-card">
          <CardContent className="p-4 flex flex-col gap-3">
            <span className="text-[10px] uppercase font-mono bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded w-fit">
              Select Room Scope
            </span>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Target Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedSessionId('');
                }}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg h-8 px-2 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Choose Course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Academic Session</label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                disabled={!selectedCourseId}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg h-8 px-2 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">-- Choose Session Block --</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.date})
                  </option>
                ))}
              </select>
            </div>

            {/* Main CTA start button */}
            {activeSession && !activeQrSession && (
              <Button
                onClick={onStartQrSession}
                className="w-full h-8 text-xs font-bold bg-blue-600 top-1 mt-1.5"
              >
                <PlayCircle className="w-4 h-4 mr-1" /> Start Dynamic QR Session
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR Broadcaster Panel if Active */}
      {activeSession && activeQrSession && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 border border-blue-100 bg-blue-50/20 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-2">
            <h5 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
              Live QR Display
            </h5>
            <QRCodeDisplay
              courseId={selectedCourseId}
              sessionId={selectedSessionId}
              qrSecret={activeQrSession.qrSecret}
              isPaused={isPaused}
            />
          </div>

          <div className="md:col-span-2 flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <h5 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                Rolling HMAC validation Broadcaster
              </h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                Trainees must scan this code using their in-app scanners. The code encrypts metadata utilizing high-integrity TOTP offset bounds (15-sec refreshing keys) preventing spoofing, screenshot trading, or offsite enrollment.
              </p>
              
              <CountdownTimer
                onRefresh={onManualRefresh}
                isPaused={isPaused}
              />
            </div>

            {/* Export Preparation Trigger */}
            <div className="flex items-center gap-2 pt-4 border-t border-slate-200/50">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportConsolePrep}
                className="text-xs border-slate-300 font-bold bg-white text-slate-700 hover:bg-slate-50 rounded-xl"
              >
                <Download className="w-4 h-4 mr-1 text-slate-500" /> Prepare Export Streams (CSV/Sheets)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Roster Live metrics summary layout */}
      {activeSession && (
        <>
          <AttendanceSummaryCards
            totalStudents={registeredStudents.length}
            presentCount={presentCount}
            lateCount={lateCount}
            absentCount={absentCount}
            excusedCount={excusedCount}
          />

          {/* Table filters panel block */}
          <AttendanceFilters
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            isTeacher={false}
          />

          {/* Roster interactive listing */}
          <AttendanceTable
            students={registeredStudents}
            attendanceRecords={attendanceRecords}
            onStatusChange={handleStatusChangeLegacy}
            isTeacher={true}
            selectedStudentIds={selectedStudentIds}
            onSelectStudentChange={setSelectedStudentIds}
            onStudentClick={(student) => {
              setSelectedStudentForDrawer(student);
              setDrawerOpen(true);
            }}
            onManualOverrideClick={(student, record) => {
              setSelectedStudentForOverride(student);
              setCurrentOverrideRecord(record);
              setOverrideModalOpen(true);
            }}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </>
      )}

      {/* Floating Toolbar for Checked Rows */}
      <BulkActionToolbar
        selectedCount={selectedStudentIds.length}
        onClearSelection={() => setSelectedStudentIds([])}
        onApplyBulkAction={handleApplyBulkAction}
      />

      {/* Student Audit Detail Profile Drawer */}
      <StudentProfileDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setSelectedStudentForDrawer(null);
          setDrawerOpen(false);
        }}
        student={selectedStudentForDrawer}
        attendanceRecords={attendanceRecords}
        sessions={sessions}
        course={activeCourse}
      />

      {/* Manual Status Overwriting Modal */}
      <ManualOverrideModal
        isOpen={overrideModalOpen}
        onClose={() => {
          setSelectedStudentForOverride(null);
          setCurrentOverrideRecord(null);
          setOverrideModalOpen(false);
        }}
        student={selectedStudentForOverride}
        currentRecord={currentOverrideRecord}
        onSave={handleSaveManualOverride}
      />
    </div>
  );
};

export default AttendanceDashboard;
