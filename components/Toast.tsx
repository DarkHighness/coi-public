import React from 'react';

interface ToastProps {
  show: boolean;
  message: string;
}

export const Toast: React.FC<ToastProps> = ({ show, message }) => (
  <div className={`fixed z-50 top-20 right-4 md:top-8 md:right-8 transition-all duration-500 ease-out pointer-events-none ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="bg-theme-surface/90 backdrop-blur text-theme-primary border border-theme-primary/20 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
         <span>{message}</span>
      </div>
  </div>
);
