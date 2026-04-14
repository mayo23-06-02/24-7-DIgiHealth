import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'solid' | 'glass' | 'outline' | 'gradient';
  className?: string;
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  variant = 'solid', 
  className = '', 
  noPadding = false 
}) => {
  const baseStyles = 'rounded-lg transition-all duration-300 overflow-hidden';
  
  const variants = {
    solid: 'bg-white border border-slate-100',
    glass: 'bg-white/70 backdrop-blur-xl border border-white/50',
    outline: 'bg-transparent border-2 border-slate-100 hover:border-primary/20',
    gradient: 'bg-linear-to-br from-white to-slate-50 border border-slate-100'
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${noPadding ? '' : 'p-6'} ${className}`}>
      {children}
    </div>
  );
};

export default Card;
