import React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';
import { Button } from '../ui/Button';
import { Clock, CheckSquare, XCircle, AlertTriangle, UserCheck, Shield, HelpCircle, FileSpreadsheet, Keyboard, Edit3, Eye } from 'lucide-react';
import { Attendance, StudentProfile } from '../../types';
import { StatusFilterType, SortByType, SortOrderType } from './AttendanceFilters';

interface AttendanceTableProps {
  students: StudentProfile[];
  attendanceRecords: Attendance[];
  onStatusChange: (studentId: string, newStatus: 'present' | 'late' | 'absent' | 'excused' | 'manual', note: string) => void | Promise<void>;
  isTeacher: boolean;
  selectedStudentIds?: string[];
  onSelectStudentChange?: (selectedIds: string[]) => void;
  onStudentClick?: (student: StudentProfile) => void;
  onManualOverrideClick?: (student: StudentProfile, currentRecord: Attendance | null) => void;
  searchQuery?: string;
  statusFilter?: StatusFilterType;
  sortBy?: SortByType;
  sortOrder?: SortOrderType;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  students,
  attendanceRecords,
  onStatusChange,
  isTeacher,
  selectedStudentIds = [],
  onSelectStudentChange,
  onStudentClick,
  onManualOverrideClick,
  searchQuery = '',
  statusFilter = 'all',
  sortBy = 'name',
  sortOrder = 'asc',
}) => {
  // 1. Merge Students with their respective Attendance logs
  const mergedList = students.map((student, index) => {
    const record = attendanceRecords.find((r) => r.studentId === student.id);
    
    // Status resolution (default to absent)
    const status = record?.status || 'absent';
    
    // Format checkin display
    let checkTimeStr = '--';
    let rawCheckTime: Date | null = null;
    if (record?.checkinTime) {
      const d = (record.checkinTime.seconds) ? new Date(record.checkinTime.seconds * 1000) : new Date(record.checkinTime);
      checkTimeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      rawCheckTime = d;
    } else if (record?.timestamp) {
      const d = (record.timestamp.seconds) ? new Date(record.timestamp.seconds * 1000) : new Date(record.timestamp);
      checkTimeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      rawCheckTime = d;
    }

    // Last Updated display
    let lastUpdatedStr = '--';
    let rawLastUpdatedTime: Date | null = null;
    if (record?.updatedAt) {
      const d = (record.updatedAt.seconds) ? new Date(record.updatedAt.seconds * 1000) : new Date(record.updatedAt);
      lastUpdatedStr = d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      rawLastUpdatedTime = d;
    } else if (record?.timestamp) {
      const d = (record.timestamp.seconds) ? new Date(record.timestamp.seconds * 1000) : new Date(record.timestamp);
      lastUpdatedStr = d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      rawLastUpdatedTime = d;
    }

    return {
      student,
      studentId: student.studentId || '',
      dbId: student.id,
      name: student.name || '',
      email: student.email || '',
      status,
      checkTime: checkTimeStr,
      rawCheckTime,
      remarks: record?.note || '',
      lastUpdated: lastUpdatedStr,
      rawLastUpdatedTime,
      method: record?.method || 'none',
      record: record || null,
    };
  });

  // 2. Query text filters (Name or Student ID)
  let filteredList = mergedList.filter((item) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      item.name.toLowerCase().includes(term) ||
      item.studentId.toLowerCase().includes(term) ||
      item.email.toLowerCase().includes(term)
    );
  });

  // 3. Status quick filters (present / late / absent / excused / manual)
  if (statusFilter !== 'all') {
    filteredList = filteredList.filter((item) => {
      if (statusFilter === 'manual') {
        return item.status === 'manual' || item.method === 'manual';
      }
      return item.status === statusFilter;
    });
  }

  // 4. Sort columns cleanly
  filteredList.sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'studentId') {
      comparison = a.studentId.localeCompare(b.studentId);
    } else if (sortBy === 'checkinTime') {
      const timea = a.rawCheckTime ? a.rawCheckTime.getTime() : 0;
      const timeb = b.rawCheckTime ? b.rawCheckTime.getTime() : 0;
      comparison = timea - timeb;
    } else if (sortBy === 'status') {
      comparison = a.status.localeCompare(b.status);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Bulk Actions Checkbox Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectStudentChange) return;
    if (e.target.checked) {
      // Add all currently visible student dbIds to selection
      onSelectStudentChange(filteredList.map((item) => item.dbId));
    } else {
      onSelectStudentChange([]);
    }
  };

  const handleSelectOne = (studentDbId: string, checked: boolean) => {
    if (!onSelectStudentChange) return;
    if (checked) {
      onSelectStudentChange([...selectedStudentIds, studentDbId]);
    } else {
      onSelectStudentChange(selectedStudentIds.filter((id) => id !== studentDbId));
    }
  };

  const isAllSelected = filteredList.length > 0 && selectedStudentIds.length === filteredList.length;

  return (
    <div className="flex flex-col gap-4 border border-slate-200 bg-white p-5 rounded-2xl shadow-sm" id="attendance-list-table-panel">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
            Class Roster & Realtime Stream
          </h3>
          <p className="text-xs text-slate-500">
            View real-time check-in logs. Click full names to see individual attendance timeline analytics.
          </p>
        </div>

        {/* Counter badge */}
        <span className="text-[10px] font-mono font-black uppercase text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
          Loaded Trainees: {filteredList.length}
        </span>
      </div>

      <div className="overflow-x-auto w-full">
        <Table id="attendance-live-feed-table">
          <Thead>
            <Tr>
              {isTeacher && (
                <Th className="w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </Th>
              )}
              <Th className="w-16">#</Th>
              <Th>Student ID</Th>
              <Th>Student Name</Th>
              <Th>Status</Th>
              <Th>Clock In</Th>
              <Th>Remarks</Th>
              <Th>Last Updated</Th>
              <Th className="text-right">Audit & Controls</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredList.length === 0 ? (
              <Tr>
                <Td colSpan={isTeacher ? 9 : 8} className="text-center py-12 text-slate-400 font-mono text-xs">
                  No matching registered trainees located in current workspace context.
                </Td>
              </Tr>
            ) : (
              filteredList.map((row, idx) => {
                const isSelected = selectedStudentIds.includes(row.dbId);
                return (
                  <Tr
                    key={row.dbId}
                    className={`transition-colors duration-150 ${
                      isSelected ? 'bg-blue-50/20' : 'hover:bg-slate-50/40'
                    }`}
                  >
                    {/* Checkbox columns */}
                    {isTeacher && (
                      <Td className="w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(row.dbId, e.target.checked)}
                          className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </Td>
                    )}

                    {/* Order Number column */}
                    <Td className="font-mono text-xs text-slate-400 font-bold w-12 select-none">
                      {idx + 1}
                    </Td>

                    {/* Student ID */}
                    <Td className="font-mono text-xs text-slate-600 font-semibold select-all">
                      {row.studentId || '--'}
                    </Td>

                    {/* Student Name */}
                    <Td className="font-extrabold text-slate-800">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => onStudentClick?.(row.student)}
                          className="text-left font-sans hover:text-blue-600 hover:underline cursor-pointer focus:outline-hidden"
                        >
                          {row.name}
                        </button>
                        <span className="text-[10px] text-slate-400 font-medium font-mono truncate max-w-[170px] select-all">
                          {row.email}
                        </span>
                      </div>
                    </Td>

                    {/* Status Pill with full colors */}
                    <Td>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border select-none
                          ${(row.status === 'present' || row.status === 'manual') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : ''}
                          ${row.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-100' : ''}
                          ${row.status === 'excused' ? 'bg-purple-50 text-purple-700 border-purple-100' : ''}
                          ${row.status === 'absent' ? 'bg-red-50 text-red-700 border-red-100' : ''}
                        `}
                      >
                        {row.status}
                      </span>
                    </Td>

                    {/* Check-In clock */}
                    <Td className="font-mono text-xs text-slate-600 font-semibold">
                      {row.checkTime}
                    </Td>

                    {/* Custom note remarks column */}
                    <Td className="text-slate-500 text-xs truncate max-w-[150px]" title={row.remarks}>
                      {row.remarks || <span className="text-slate-300 font-medium">--</span>}
                    </Td>

                    {/* Last Updated Timestamp */}
                    <Td className="text-[10px] text-slate-400 font-mono font-medium whitespace-nowrap">
                      {row.lastUpdated}
                    </Td>

                    {/* Controls Actions */}
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1.5 h-8">
                        {/* Always visible View button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] px-2 h-7 rounded-lg border-slate-200 text-slate-600"
                          title="View timeline history profile"
                          onClick={() => onStudentClick?.(row.student)}
                        >
                          <Eye className="w-3.5 h-3.5 md:mr-1" /> <span className="hidden md:inline">View Timeline</span>
                        </Button>

                        {/* Trainer controls */}
                        {isTeacher && (
                          <Button
                            variant="default"
                            size="sm"
                            className="text-[10px] px-2 h-7 rounded-lg bg-blue-600"
                            title="Apply manual override remarks"
                            onClick={() => onManualOverrideClick?.(row.student, row.record)}
                          >
                            <Edit3 className="w-3.5 h-3.5 md:mr-1" /> <span className="hidden md:inline">Override</span>
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })
            )}
          </Tbody>
        </Table>
      </div>
    </div>
  );
};

export default AttendanceTable;
