import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { BarChart3, TrendingUp, AlertTriangle, ArrowRight, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const ReportsPage: React.FC = () => {
  const analyticsReports = [
    { student: 'Alisa S.', course: 'CS-201', attended: '12/12', ratio: '100%', status: 'Safe' },
    { student: 'Bob Johnson', course: 'CS-201', attended: '11/12', ratio: '91%', status: 'Safe' },
    { student: 'Chutimavadee T.', course: 'DATA-101', attended: '9/10', ratio: '90%', status: 'Safe' },
    { student: 'Danny DeVito', course: 'CS-201', attended: '7/12', ratio: '58%', status: 'Warning' },
  ];

  return (
    <div className="flex flex-col gap-6" id="reports-wrapper">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Attendance Analytics & Reports</h1>
          <p className="text-sm text-slate-500">Inspect cumulative performance indicators, pass scopes, and warning flags instantly.</p>
        </div>
        <Button variant="secondary" size="sm" className="flex items-center gap-1.5 text-xs">
          <Download className="h-4 w-4" /> Export Spreadsheet
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        <Card className="flex flex-col border-emerald-100 bg-emerald-50/10">
          <CardContent className="flex items-center gap-4">
            <span className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <span className="text-[11px] font-semibold text-slate-400">Average Attendance Rate</span>
              <p className="text-2xl font-extrabold text-slate-850 leading-tight">92.4%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardContent className="flex items-center gap-4">
            <span className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <span className="text-[11px] font-semibold text-slate-400">Total Classes Conducted</span>
              <p className="text-2xl font-extrabold text-slate-850 leading-tight">36 Sessions</p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-amber-100 bg-amber-50/10">
          <CardContent className="flex items-center gap-4">
            <span className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </span>
            <div>
              <span className="text-[11px] font-semibold text-slate-400">Trainees Under Gate (80%)</span>
              <p className="text-2xl font-extrabold text-amber-700 leading-tight">5 Students</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Lists */}
      <div className="flex flex-col gap-4">
        <h3 className="text-base font-bold text-slate-800">Cumulative Trainee Attendance Summary</h3>
        <Table id="reports-statistics-table">
          <Thead>
            <Tr>
              <Th>Student Candidate</Th>
              <Th>Course Outlining</Th>
              <Th>Attended Classes</Th>
              <Th>Registry Ratio</Th>
              <Th>Passing Standing</Th>
            </Tr>
          </Thead>
          <Tbody>
            {analyticsReports.map((report, idx) => (
              <Tr key={idx}>
                <Td className="font-semibold text-slate-700 text-sm">{report.student}</Td>
                <Td className="text-xs font-mono">{report.course}</Td>
                <Td className="text-slate-400 text-xs">{report.attended}</Td>
                <Td className="font-semibold text-slate-700">{report.ratio}</Td>
                <Td>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                    ${report.status === 'Safe' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-red-50 text-red-700 animate-pulse'}
                  `}>
                    {report.status}
                  </span>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  );
};
export default ReportsPage;
