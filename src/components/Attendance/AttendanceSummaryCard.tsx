import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Users, UserCheck, UserX, Percent } from 'lucide-react';
import { motion } from 'motion/react';

interface AttendanceSummaryCardProps {
  presentCount: number;
  totalRegistered: number;
}

export const AttendanceSummaryCard: React.FC<AttendanceSummaryCardProps> = ({
  presentCount,
  totalRegistered,
}) => {
  const remaining = Math.max(0, totalRegistered - presentCount);
  const percentage = totalRegistered > 0 ? Math.round((presentCount / totalRegistered) * 100) : 0;

  const statBoxes = [
    {
      title: 'Trainees Present',
      value: presentCount,
      desc: 'Sourced via secure QR scan / manual',
      icon: UserCheck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Trainees Remaining',
      value: remaining,
      desc: 'Awaiting dynamic token scan',
      icon: UserX,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      title: 'Trainee Attendance Rate',
      value: `${percentage}%`,
      desc: 'Target is 80% for auto-issue',
      icon: Percent,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      title: 'Core Registered Trainees',
      value: totalRegistered,
      desc: 'Approved class participants count',
      icon: Users,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="attendance-summary-cards-grid">
      {statBoxes.map((box, index) => {
        const IconComponent = box.icon;
        return (
          <Card key={index} className={`border ${box.color.split(' ')[2]} shadow-sm`} id={`summary-box-${index}`}>
            <CardContent className="p-4 flex items-center gap-4">
              <span className={`p-2.5 rounded-xl border shrink-0 ${box.color.split(' ')[0]} ${box.color.split(' ')[1]}`}>
                <IconComponent className="w-5 h-5" />
              </span>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-slate-400 capitalize block truncate">
                  {box.title}
                </span>
                <p className="text-xl font-extrabold text-slate-800 tracking-tight leading-tight mt-0.5">
                  {box.value}
                </p>
                <span className="text-[9px] text-slate-400 block truncate mt-0.5">
                  {box.desc}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AttendanceSummaryCard;
