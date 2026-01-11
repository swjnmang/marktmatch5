"use client";

import { useEffect, useState } from "react";

interface PeriodTimerProps {
  deadline: number | null | undefined;
  onExpire?: () => void;
  className?: string;
}

export function PeriodTimer({ deadline, onExpire, className = "" }: PeriodTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    if (!deadline) {
      setTimeLeft(null);
      setHasExpired(false);
      return;
    }

    const updateTime = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        if (!hasExpired) {
          setHasExpired(true);
          if (onExpire) {
            onExpire();
          }
        }
      } else {
        setTimeLeft(remaining);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [deadline, hasExpired, onExpire]);

  if (timeLeft === null) {
    return null;
  }

  const totalSeconds = Math.floor(timeLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Color coding based on time remaining
  let colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (totalSeconds === 0) {
    colorClasses = "bg-red-50 text-red-700 border-red-300";
  } else if (totalSeconds < 60) {
    colorClasses = "bg-red-50 text-red-700 border-red-200";
  } else if (totalSeconds < 300) {
    colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-mono text-lg font-bold ${colorClasses} ${className}`}>
      <span className="text-2xl">⏱️</span>
      <div className="flex flex-col">
        <span className="text-xs font-normal opacity-75">Zeit verbleibend</span>
        <span className="text-xl">{formatted}</span>
      </div>
    </div>
  );
}
