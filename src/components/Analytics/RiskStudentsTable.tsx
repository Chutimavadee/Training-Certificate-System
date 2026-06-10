import React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface RiskStudentRow {
  studentId: string;
  studentName: string;
  attendanceRate: number;
  score: number;
}

interface RiskStudentsTableProps {
  data: RiskStudentRow[];
}

export const RiskStudentsTable: React.FC<RiskStudentsTableProps> = ({ data }) => {
  // Filter for students below 80%
  const atRiskStudents = data.filter((s) => s.attendanceRate < 80);

  const getWarningBadge = (rate: number) => {
    if (rate < 50) {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 animate-pulse">
          🚨 Critical Danger
        </span>
      );
    } else if (rate < 70) {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200">
          ⚠️ High Risk
        </span>
      );
    } else {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
          ⚠️ Warning Status
        </span>
      );
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in" id="risk-students-table-box">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          At-Risk Attendance Watchlist
        </h3>
        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-50 text-red-700 border border-red-155">
          {atRiskStudents.length} Flagged Trainees (&lt;80%)
        </span>
      </div>

      <Table id="attendance-risk-watchlist">
        <Thead>
          <Tr>
            <Th>Trainee Name</Th>
            <Th className="text-center">Attendance Rate</Th>
            <Th className="text-center">Current Score</Th>
            <Th className="text-right">Warning Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {atRiskStudents.length === 0 ? (
            <Tr>
              <Td colSpan={4} className="text-center text-emerald-600 font-medium text-xs py-8 bg-emerald-50/20">
                <div className="flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-4.5 w-4.5" /> All registered trainees are outstanding (&gt;= 80%)!
                </div>
              </Td>
            </Tr>
          ) : (
            atRiskStudents.map((row) => (
              <Tr key={row.studentId} className="hover:bg-red-50/10">
                <Td className="font-semibold text-slate-700 text-sm">{row.studentName}</Td>
                <Td className="text-center font-mono text-sm font-bold text-red-650">
                  {row.attendanceRate.toFixed(2)}%
                </Td>
                <Td className="text-center font-mono text-sm text-slate-500">
                  {row.score.toFixed(2)}
                </Td>
                <Td className="text-right">
                  {getWarningBadge(row.attendanceRate)}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
};

export default RiskStudentsTable;
