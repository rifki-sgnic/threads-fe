import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'error' | 'success' | 'info';
  title?: string;
  requestId?: string;
}

export function Alert({
  variant = 'error',
  title,
  requestId,
  children,
  className,
  ...props
}: AlertProps) {
  const icons = {
    error: <AlertCircle className="h-5 w-5 text-destructive shrink-0" />,
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
  };

  const variants = {
    error: 'border-destructive/30 bg-destructive/10 text-destructive dark:text-red-400',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-sm',
        variants[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1 space-y-1">
        {title && <p className="font-semibold leading-none tracking-tight">{title}</p>}
        {children && <div className="text-xs opacity-90">{children}</div>}
        {requestId && (
          <p className="text-[10px] font-mono opacity-70 mt-1">
            Request ID: {requestId}
          </p>
        )}
      </div>
    </div>
  );
}
