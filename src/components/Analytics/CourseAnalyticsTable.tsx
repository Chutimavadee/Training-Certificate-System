import React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';
import { BookOpen } from 'lucide-react';

export interface CourseAnalyticsRow {
  courseId: string;
  courseCode: string;
  courseName: string;
  plannedSessions: number;
  completedSessions: number;
  attendanceRate: number; // class averages
  averageScore: number;
  maxPoints: number;
}

interface CourseAnalyticsTableProps {
  data: CourseAnalyticsRow[];
}

export const CourseAnalyticsTable: React.FC<CourseAnalyticsTableProps> = ({ data }) => {
  return (
    <div className="flex flex-col gap-4 animate-fade-in" id="course-analytics-table-container">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-500" />
          Taught Course Metrics Summary
        </h3>
      </div>

      <Table id="teacher-course-analytics-table">
        <Thead>
          <Tr>
            <Th>Course</Th>
            <Th className="text-center">Planned Sessions</Th>
            <Th className="text-center">Held Sessions</Th>
            <Th className="text-right">Average Attendance</Th>
            <Th className="text-right">Average Score</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.length === 0 ? (
            <Tr>
              <Td colSpan={5} className="text-center text-slate-400 font-mono text-xs py-8">
                No course portfolio analytics resolved. Please add courses and start lesson sessions.
              </Td>
            </Tr>
          ) : (
            data.map((row) => (
              <Tr key={row.courseId} className="hover:bg-slate-50/50">
                <Td className="py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-slate-800 leading-tight">
                      {row.courseName}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit border border-blue-100">
                      {row.courseCode}
                    </span>
                  </div>
                </Td>
                <Td className="text-center font-mono text-xs text-slate-650">{row.plannedSessions}</Td>
                <Td className="text-center font-mono text-xs text-slate-650">{row.completedSessions}</Td>
                <Td className="text-right py-3.5">
                  <div className="flex flex-col items-end">
                    <span className={`text-sm font-bold font-mono ${row.attendanceRate >= 80 ? 'text-emerald-650' : 'text-amber-650'}`}>
                      {row.attendanceRate.toFixed(1)}%
                    </span>
                    <div className="w-16 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.attendanceRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, row.attendanceRate)}%` }}
                      />
                    </div>
                  </div>
                </Td>
                <Td className="text-right font-mono text-sm font-bold text-blue-650">
                  {row.averageScore.toFixed(2)} <span className="text-[10px] text-slate-400 font-medium">/ {row.maxPoints}</span>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
};

export default CourseAnalyticsTable;
