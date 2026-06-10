import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Users, CheckCircle, Clock, AlertCircle, FileSpreadsheet, Percent } from 'lucide-react';

interface AttendanceSummaryCardsProps {
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
}

export const AttendanceSummaryCards: React.FC<AttendanceSummaryCardsProps> = ({
  totalStudents,
  presentCount,
  lateCount,
  absentCount,
  excusedCount,
}) => {
  const attendanceRate = totalStudents > 0
    ? Math.round(((presentCount + lateCount) / totalStudents) * 100)
    : 0;

  const cardData = [
    {
      id: 'summary-total',
      title: 'Total Enrolled',
      value: totalStudents,
      description: 'Registered trainees',
      icon: Users,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      id: 'summary-present',
      title: 'Checked-in Present',
      value: presentCount,
      description: 'On-time checking status',
      icon: CheckCircle,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-100',
    },
    {
      id: 'summary-late',
      title: 'Late Arrival',
      value: lateCount,
      description: 'Exceeded threshold window',
      icon: Clock,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100',
    },
    {
      id: 'summary-absent',
      title: 'Absent / Unregistered',
      value: absentCount,
      description: 'No active session token',
      icon: AlertCircle,
      bgColor: 'bg-red-50/70',
      iconColor: 'text-red-600',
      borderColor: 'border-red-100',
    },
    {
      id: 'summary-excused',
      title: 'Excused Leave',
      value: excusedCount,
      description: 'Medical or approved leaves',
      icon: FileSpreadsheet,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100',
    },
    {
      id: 'summary-rate',
      title: 'Attendance Rate',
      value: `${attendanceRate}%`,
      description: '(Present + Late) ratio',
      icon: Percent,
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" id="attendance-summary-cards-grid">
      {cardData.map((card) => {
        const IconComponent = card.icon;
        return (
          <Card
            key={card.id}
            id={card.id}
            className={`border ${card.borderColor} shadow-xs hover:shadow-sm transition-all`}
          >
            <CardContent className="p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 font-sans tracking-wide uppercase">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded-lg ${card.bgColor} ${card.iconColor}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
              </div>

              <div>
                <span className="text-2xl font-black text-slate-800 tracking-tight">
                  {card.value}
                </span>
                <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">
                  {card.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AttendanceSummaryCards;
