import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastVariant = 'default' | 'success' | 'destructive';

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, title, description, variant = 'default', onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const variants = {
    default: 'bg-card text-card-foreground border-border',
    success: 'bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-100 dark:border-green-900',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const icons = {
    default: <Info className="w-5 h-5 text-primary" />,
    success: <CheckCircle className="w-5 h-5 text-green-600" />,
    destructive: <AlertCircle className="w-5 h-5 text-destructive" />,
  };

  return (
    <div className={`
      flex items-start gap-3 p-4 rounded-lg border shadow-lg w-full max-w-sm pointer-events-auto
      toast-slide-in relative overflow-hidden backdrop-blur-sm
      ${variants[variant]}
    `}>
      <div className="shrink-0 mt-0.5">{icons[variant]}</div>
      <div className="flex-1 gap-1">
        {title && <h3 className="font-semibold text-sm">{title}</h3>}
        {description && <p className="text-sm opacity-90 leading-relaxed">{description}</p>}
      </div>
      <button onClick={() => onDismiss(id)} className="shrink-0 rounded-md p-1 hover:bg-black/5 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};