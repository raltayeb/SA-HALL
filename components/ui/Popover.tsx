
import React, { useState, useRef, useEffect } from 'react';

interface PopoverProps {
  children: [React.ReactElement, React.ReactElement];
  align?: 'start' | 'center' | 'end';
}

export const Popover: React.FC<PopoverProps> = ({ children, align = 'start' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fix: Cast children to React.ReactElement<any> to avoid 'unknown' prop errors in cloneElement
  const [trigger, content] = React.Children.toArray(children) as [React.ReactElement<any>, React.ReactElement<any>];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerWithProps = React.cloneElement(trigger, {
    onClick: () => setIsOpen(!isOpen),
  });

  return (
    <div className="relative inline-block w-full" ref={popoverRef}>
      {triggerWithProps}
      {isOpen && (
        <div className={`
          absolute z-[110] mt-2 bg-card border rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200
          ${align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'}
        `}>
          {content}
        </div>
      )}
    </div>
  );
};

export const PopoverTrigger: React.FC<{ children: React.ReactNode, asChild?: boolean }> = ({ children }) => {
  return <>{children}</>;
};

export const PopoverContent: React.FC<{ children: React.ReactNode, className?: string, align?: string }> = ({ children, className }) => {
  return <div className={className}>{children}</div>;
};
