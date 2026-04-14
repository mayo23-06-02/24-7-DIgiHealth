import React, { useEffect } from 'react';
import { BiX } from 'react-icons/bi';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  width = 'md' 
}) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-7xl',
    full: 'max-w-[95vw]'
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Content */}
      <div className={`
        relative w-full ${widths[width]} bg-white rounded-lg overflow-hidden
        animate-in zoom-in-95 fade-in duration-500 transition-all
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-8 border-b border-slate-50">
          <h3 className="text-2xl font-medium text-slate-900 tracking-tight">
            {title ? (
              <>
                {title.split(' ').slice(0, -1).join(' ')}{' '}
                <span className="font-black text-primary">{title.split(' ').slice(-1)}</span>
              </>
            ) : 'Action Detail'}
          </h3>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <BiX size={24} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
