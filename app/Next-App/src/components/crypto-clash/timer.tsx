'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TimerIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimerProps {
  currentTime: number;
  totalTime: number;
}

export function Timer({ currentTime, totalTime }: TimerProps) {
  const formatTime = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const progress = (currentTime / totalTime) * 100;

  const getProgressColor = () => {
    if (progress < 10) return 'bg-red-600';
    if (progress < 25) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <div className="flex items-center gap-3 w-full max-w-xs">
      <Badge variant="secondary" className="flex-shrink-0 text-lg md:text-xl px-3 py-1 md:px-4 md:py-2">
        <TimerIcon className="mr-2 h-5 w-5" />
        <span className="font-mono">{formatTime(currentTime)}</span>
      </Badge>
      <div className="w-full">
        <Progress value={progress} indicatorClassName={cn('transition-colors duration-500', getProgressColor())} />
      </div>
    </div>
  );
}

    