"use client";
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export function LoadingSpinner({ size = 24, className }: LoadingSpinnerProps) {
  return (
    <Loader2
      style={{ width: size, height: size }}
      className={cn('animate-spin text-primary', className)}
    />
  );
}

export function FullPageLoading({ message = "Loading..."} : { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <LoadingSpinner size={48} />
      <p className="mt-4 text-lg text-muted-foreground">{message}</p>
    </div>
  );
}
