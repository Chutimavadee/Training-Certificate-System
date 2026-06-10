import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

Chart.register(...registerables);

interface AttendancePieChartProps {
  present: number;
  late: number;
  absent: number;
  excused: number;
}

export const AttendancePieChart: React.FC<AttendancePieChartProps> = ({
  present,
  late,
  absent,
  excused,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const total = present + late + absent + excused;

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destory existing chart instance
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (total === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Present', 'Late', 'Absent', 'Excused'],
        datasets: [
          {
            data: [present, late, absent, excused],
            backgroundColor: [
              '#10b981', // emerald-500
              '#f59e0b', // amber-500
              '#ef4444', // red-500
              '#8b5cf6', // purple-500
            ],
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: {
                family: 'Inter, sans-serif',
                size: 11,
                weight: 'bold',
              },
              color: '#475569', // slate-600
              padding: 15,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.raw as number;
                const percentage = Math.round((val / total) * 100);
                return ` ${context.label}: ${val} (${percentage}%)`;
              },
            },
            bodyFont: {
              family: 'Inter, sans-serif',
              size: 12,
            },
            titleFont: {
              family: 'Inter, sans-serif',
              size: 11,
              weight: 'bold',
            },
          },
        },
        cutout: '65%',
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [present, late, absent, excused, total]);

  return (
    <Card className="border border-slate-200 shadow-xs h-full" id="attendance-pie-chart-card">
      <CardHeader className="pb-2 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">
          Scan Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col justify-center items-center h-[260px]">
        {total === 0 ? (
          <div className="text-center py-12 text-slate-400 font-mono text-xs flex flex-col gap-1">
            <span>No scanning event logs discovered</span>
            <span>in current academic directory scope.</span>
          </div>
        ) : (
          <div className="relative w-full h-full max-w-[220px] max-h-[220px]">
            <canvas ref={canvasRef} id="analytics-pie-canvas" />
            <div className="absolute inset-x-0 top-[40%] flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-800 tracking-tighter">
                {total}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                Total Logs
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendancePieChart;
