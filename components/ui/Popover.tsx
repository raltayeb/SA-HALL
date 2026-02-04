
import React, { useState, useRef, useEffect } from 'react';

interface PopoverProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Popover: React.FC<PopoverProps> = ({ children, align = 'start', open, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        handleOpenChange(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggle = () => handleOpenChange(!isOpen);

  // We find the trigger and content by type name or by convention (first is trigger, second is content)
  const childrenArray = React.Children.toArray(children);
  const trigger = childrenArray[0];
  const content = childrenArray[1];

  return (
    <div className="relative inline-block w-full" ref={popoverRef}>
      <div onClick={toggle} className="w-full">
        {trigger}
      </div>
      {isOpen && (
        <div className={`
          absolute z-[200] mt-2 bg-white border border-gray-100 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden
          ${align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'}
        `}>
          <div onClick={(e) => e.stopPropagation()}>
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

export const PopoverTrigger: React.FC<{ children: React.ReactNode, asChild?: boolean }> = ({ children }) => {
  return <div className="cursor-pointer">{children}</div>;
};

export const PopoverContent: React.FC<{ children: React.ReactNode, className?: string, align?: string }> = ({ children, className }) => {
  return <div className={className}>{children}</div>;
};
