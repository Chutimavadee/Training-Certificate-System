import React from 'react';
import { Search, Filter, ArrowUpDown, RefreshCw, Layers } from 'lucide-react';

export type StatusFilterType = 'all' | 'present' | 'late' | 'absent' | 'excused' | 'manual';
export type SortByType = 'name' | 'studentId' | 'checkinTime' | 'status';
export type SortOrderType = 'asc' | 'desc';

interface AttendanceFiltersProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  statusFilter: StatusFilterType;
  onStatusFilterChange: (status: StatusFilterType) => void;
  sortBy: SortByType;
  onSortByChange: (sort: SortByType) => void;
  sortOrder: SortOrderType;
  onSortOrderChange: (order: SortOrderType) => void;
  coursesList?: { id: string; code: string; title: string }[];
  selectedCourseId?: string;
  onCourseChange?: (id: string) => void;
  sessionsList?: { id: string; title: string; date: string }[];
  selectedSessionId?: string;
  onSessionChange?: (id: string) => void;
  isTeacher: boolean;
}

export const AttendanceFilters: React.FC<AttendanceFiltersProps> = ({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  coursesList = [],
  selectedCourseId = '',
  onCourseChange,
  sessionsList = [],
  selectedSessionId = '',
  onSessionChange,
  isTeacher,
}) => {
  return (
    <div
      className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col gap-4"
      id="attendance-query-filters-box"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <h4 className="text-sm font-bold text-slate-700">Search, Filters & Sorting</h4>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
          Query Controller
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Search Box (Name & ID) */}
        <div className="flex flex-col gap-1.5" id="filter-search-container">
          <label className="text-xs font-bold text-slate-500">Student Profile Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Name or Student ID..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg h-9 pl-9 pr-3 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all font-medium"
            />
          </div>
        </div>

        {/* 2. Status Select Filter */}
        <div className="flex flex-col gap-1.5" id="filter-status-container">
          <label className="text-xs font-bold text-slate-500">Attendance Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as StatusFilterType)}
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg h-9 px-3 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="excused">Excused</option>
            <option value="manual">Manual Override</option>
          </select>
        </div>

        {/* 3. Sorting Mode */}
        <div className="flex flex-col gap-1.5" id="filter-sorting-container">
          <label className="text-xs font-bold text-slate-500">Sort Roster By</label>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as SortByType)}
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg h-9 px-3 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
          >
            <option value="name">Student Name</option>
            <option value="studentId">Student ID</option>
            <option value="checkinTime">Check-in Clock</option>
            <option value="status">Attendance Status</option>
          </select>
        </div>

        {/* 4. Sorting Sequence Direction (Asc/Desc) */}
        <div className="flex flex-col gap-1.5" id="filter-sequence-container">
          <label className="text-xs font-bold text-slate-500">Sorting Ordering</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSortOrderChange('asc')}
              className={`flex-1 h-9 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                sortOrder === 'asc'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Ascending
            </button>
            <button
              type="button"
              onClick={() => onSortOrderChange('desc')}
              className={`flex-1 h-9 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                sortOrder === 'desc'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Descending
            </button>
          </div>
        </div>
      </div>

      {/* Teachers: Extra quick selectors right inside the filter card if needed */}
      {isTeacher && coursesList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-50">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Course Select</span>
            <select
              value={selectedCourseId}
              onChange={(e) => onCourseChange?.(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50/50 border border-slate-200 text-slate-600 rounded-lg h-8 px-2"
            >
              {coursesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Session Select</span>
            <select
              value={selectedSessionId}
              onChange={(e) => onSessionChange?.(e.target.value)}
              disabled={sessionsList.length === 0}
              className="w-full text-xs font-semibold bg-slate-50/50 border border-slate-200 text-slate-600 rounded-lg h-8 px-2 disabled:opacity-50"
            >
              {sessionsList.length > 0 ? (
                sessionsList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.date})
                  </option>
                ))
              ) : (
                <option value="">No Sessions Pre-defined</option>
              )}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceFilters;
