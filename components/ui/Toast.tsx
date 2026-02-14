
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

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
    default: 'bg-white text-gray-900 border-gray-100 shadow-2xl shadow-gray-200/50',
    success: 'bg-green-50 text-green-900 border-green-100 shadow-2xl shadow-green-100/50',
    destructive: 'bg-red-50 text-red-900 border-red-100 shadow-2xl shadow-red-100/50',
    warning: 'bg-yellow-50 text-yellow-900 border-yellow-100 shadow-2xl shadow-yellow-100/50',
  };

  const icons = {
    default: <Info className="w-5 h-5 text-primary" />,
    success: <CheckCircle className="w-5 h-5 text-green-600" />,
    destructive: <AlertCircle className="w-5 h-5 text-red-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
  };

  return (
    <div className={`
      flex items-start gap-3 p-4 rounded-2xl border w-full max-w-sm pointer-events-auto
      toast-slide-in relative overflow-hidden transition-all duration-300 transform translate-x-0
      ${variants[variant]}
    `} dir="rtl">
      <div className="shrink-0 mt-0.5">{icons[variant]}</div>
      <div className="flex-1 gap-1 text-right">
        {title && <h3 className="font-black text-sm">{title}</h3>}
        {description && <p className="text-xs font-bold opacity-90 leading-relaxed mt-1">{description}</p>}
      </div>
      <button onClick={() => onDismiss(id)} className="shrink-0 rounded-lg p-1.5 hover:bg-black/5 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
