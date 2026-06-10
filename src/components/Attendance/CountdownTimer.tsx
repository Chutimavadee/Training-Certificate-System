import React, { useEffect, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface CountdownTimerProps {
  intervalSeconds?: number;
  onRefresh: () => void | Promise<void>;
  isPaused?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  intervalSeconds = 15,
  onRefresh,
  isPaused = false,
}) => {
  const [timeLeft, setTimeLeft] = useState(intervalSeconds);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Trigger the TOTP rotation
          onRefresh();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [intervalSeconds, onRefresh, isPaused]);

  // Forces reset if state toggles
  useEffect(() => {
    if (isPaused) {
      setTimeLeft(intervalSeconds);
    }
  }, [isPaused, intervalSeconds]);

  const percentage = (timeLeft / intervalSeconds) * 100;

  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-inner w-full" id="countdown-timer-container">
      <div className="flex items-center justify-between w-full px-2 text-xs text-slate-500 font-mono">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span>Rotation Node</span>
        </span>
        <span className="flex items-center gap-1 font-bold text-blue-600">
          <RefreshCw className={`w-3.5 h-3.5 ${!isPaused ? 'animate-spin' : ''}`} />
          {timeLeft}s remaining
        </span>
      </div>

      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
        <motion.div
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full"
          initial={{ width: '100%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>
    </div>
  );
};

export default CountdownTimer;
