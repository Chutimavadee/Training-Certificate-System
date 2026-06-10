import React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';
import { Award, Trophy } from 'lucide-react';

interface StudentRankRow {
  rank: number;
  studentName: string;
  attendanceCount: number;
  attendanceRate: number;
  score: number;
}

interface StudentRankingTableProps {
  data: StudentRankRow[];
  limit?: number;
}

export const StudentRankingTable: React.FC<StudentRankingTableProps> = ({ data, limit = 10 }) => {
  const displayedData = data.slice(0, limit);

  return (
    <div className="flex flex-col gap-4" id="student-ranking-table-box">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Trainee Leaderboard Ranking
        </h3>
        <span className="text-xs font-semibold text-slate-400">
          Showing Top {displayedData.length} Students
        </span>
      </div>

      <Table id="leaderboard-ranking-table">
        <Thead>
          <Tr>
            <Th className="w-[80px]">Rank</Th>
            <Th>Student Name</Th>
            <Th className="text-center">Attended Sessions</Th>
            <Th className="text-right">Attendance Rate</Th>
            <Th className="text-right">Equivalent Score</Th>
          </Tr>
        </Thead>
        <Tbody>
          {displayedData.length === 0 ? (
            <Tr>
              <Td colSpan={5} className="text-center text-slate-400 font-mono text-xs py-8">
                No ranking roster found. Ensure students are registered and have logs.
              </Td>
            </Tr>
          ) : (
            displayedData.map((row) => (
              <Tr
                key={row.rank}
                className={
                  row.rank === 1
                    ? 'bg-amber-50/30'
                    : row.rank === 2
                    ? 'bg-slate-50/50'
                    : row.rank === 3
                    ? 'bg-orange-50/20'
                    : ''
                }
              >
                <Td className="font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    {row.rank === 1 ? (
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-800 text-xs shadow-sm">
                        🥇
                      </span>
                    ) : row.rank === 2 ? (
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 text-slate-800 text-xs shadow-sm">
                        🥈
                      </span>
                    ) : row.rank === 3 ? (
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-orange-100 text-orange-850 text-xs shadow-sm">
                        🥉
                      </span>
                    ) : (
                      <span className="pl-2 text-xs text-slate-400">#{row.rank}</span>
                    )}
                  </div>
                </Td>
                <Td className="font-semibold text-slate-700 text-sm">{row.studentName}</Td>
                <Td className="text-center font-mono text-sm font-semibold text-slate-600">
                  {row.attendanceCount}
                </Td>
                <Td className="text-right font-mono text-sm font-bold text-emerald-600">
                  {row.attendanceRate.toFixed(2)}%
                </Td>
                <Td className="text-right font-mono text-sm font-bold text-blue-600">
                  {row.score.toFixed(2)}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
};

export default StudentRankingTable;
