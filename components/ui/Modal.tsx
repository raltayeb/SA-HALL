
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className={`bg-card w-full rounded-3xl shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] ${className || 'max-w-md'}`}>
        <div className="flex items-center justify-between border-b p-5 shrink-0 bg-gray-50/50 rounded-t-3xl">
          <h3 className="text-lg font-black text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 transition-colors text-gray-500 hover:text-red-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
