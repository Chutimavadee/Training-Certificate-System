import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

Chart.register(...registerables);

interface LineChartData {
  sessionTitle: string;
  attendanceCount: number;
  attendanceRate: number; // percentage
}

interface AttendanceLineChartProps {
  data: LineChartData[];
}

export const AttendanceLineChart: React.FC<AttendanceLineChartProps> = ({ data }) => {
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

    const labels = data.map((d) => d.sessionTitle);
    const rates = data.map((d) => d.attendanceRate);

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Check-in Rate (%)',
            data: rates,
            borderColor: '#6366f1', // indigo-500
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#4f46e5', // indigo-600
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.25,
            fill: true,
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
            callbacks: {
              label: (context) => ` Attendance Rate: ${context.raw}%`,
            },
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
                size: 9,
              },
              color: '#64748b',
              maxRotation: 30,
              minRotation: 0,
            },
          },
          y: {
            grid: {
              color: '#f1f5f9',
            },
            min: 0,
            max: 100,
            ticks: {
              font: {
                family: 'Inter, sans-serif',
                size: 10,
              },
              color: '#64748b',
              stepSize: 20,
              callback: (value) => `${value}%`,
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
    <Card className="border border-slate-200 shadow-xs h-full" id="attendance-line-chart-card">
      <CardHeader className="pb-2 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">
          Timeline Core Attendance Rate Trend (%)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 h-[260px] flex flex-col justify-center">
        {(!data || data.length === 0) ? (
          <div className="text-center py-12 text-slate-400 font-mono text-xs flex flex-col gap-1">
            <span>No sequential course session records exists.</span>
            <span>Complete first active lesson checkpoints to load trend graphs.</span>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <canvas ref={canvasRef} id="analytics-line-canvas" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceLineChart;
