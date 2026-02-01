
import React from 'react';

interface PriceTagProps {
  amount: number;
  className?: string;
  iconSize?: number;
}

export const SaudiRiyalIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`lucide lucide-saudi-riyal ${className}`}
  >
    <path d="m20 19.5-5.5 1.2"/>
    <path d="M14.5 4v11.22a1 1 0 0 0 1.242.97L20 15.2"/>
    <path d="m2.978 19.351 5.549-1.363A2 2 0 0 0 10 16V2"/>
    <path d="M20 10 4 13.5"/>
  </svg>
);

export const PriceTag: React.FC<PriceTagProps> = ({ amount, className = "", iconSize = 18 }) => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return (
    <div className={`flex items-center gap-1 font-black leading-none ${className}`}>
      <span>{formattedAmount}</span>
      <SaudiRiyalIcon size={iconSize} className="text-primary opacity-80" />
    </div>
  );
};
