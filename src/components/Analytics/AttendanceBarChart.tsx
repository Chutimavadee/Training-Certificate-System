import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

Chart.register(...registerables);

interface BarChartData {
  name: string;
  attendanceCount: number;
}

interface AttendanceBarChartProps {
  data: BarChartData[];
}

export const AttendanceBarChart: React.FC<AttendanceBarChartProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy existing chart instance
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (!data || data.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const labels = data.map((d) => d.name);
    const counts = data.map((d) => d.attendanceCount);

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Attended Classes',
            data: counts,
            backgroundColor: 'rgba(59, 130, 246, 0.85)', // blue-500 with opacity
            hoverBackgroundColor: '#2563eb', // blue-600
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 16,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { family: 'Inter, sans-serif', size: 11, weight: 'bold' },
            bodyFont: { family: 'Inter, sans-serif', size: 12 },
            padding: 8,
            displayColors: false,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: {
                family: 'Inter, sans-serif',
                size: 10,
              },
              color: '#64748b', // slate-500
            },
          },
          y: {
            grid: {
              color: '#f1f5f9', // slate-100
            },
            ticks: {
              font: {
                family: 'Inter, sans-serif',
                size: 10,
              },
              color: '#64748b',
              stepSize: 1,
            },
            border: {
              dash: [4, 4],
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data]);

  return (
    <Card className="border border-slate-200 shadow-xs h-full" id="attendance-bar-chart-card">
      <CardHeader className="pb-2 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">
          Top Standout Trainees (Sessions Attended)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 h-[260px] flex flex-col justify-center">
        {(!data || data.length === 0) ? (
          <div className="text-center py-12 text-slate-400 font-mono text-xs flex flex-col gap-1">
            <span>No top student metrics available.</span>
            <span>Check back after trainee registrations and logs are submitted.</span>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <canvas ref={canvasRef} id="analytics-bar-canvas" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceBarChart;
