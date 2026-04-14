import React, { useEffect, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { BiX } from 'react-icons/bi';

export default function CallModal({ roomUrl, token, onClose }: { roomUrl: string, token?: string, onClose: () => void }) {
  const callContainerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<any>(null);

  useEffect(() => {
    if (!callContainerRef.current) return;

    callFrameRef.current = DailyIframe.createFrame(callContainerRef.current, {
        iframeStyle: {
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '16px',
            backgroundColor: '#0f172a'
        },
        showLeaveButton: true,
    });

    const joinOptions: any = { url: roomUrl };
    if (token) joinOptions.token = token;

    callFrameRef.current.join(joinOptions);

    callFrameRef.current.on('left-meeting', () => {
        onClose();
    });

    return () => {
        callFrameRef.current?.destroy();
    };
  }, [roomUrl, token, onClose]);

  return (
    <div className="fixed inset-0 z-[999] p-4 md:p-8 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
        <div className="relative w-full max-w-6xl h-full max-h-[85vh] bg-slate-900 rounded-3xl shadow-2xl flex flex-col border border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-800 shadow-sm z-10 border-b border-slate-700">
               <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white font-black uppercase tracking-widest text-xs">Live Secure Call</span>
               </div>
               <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all focus:outline-none"
               >
                  <BiX size={24} />
               </button>
            </div>
            <div className="flex-1 relative bg-black" ref={callContainerRef}>
                {/* Daily iframe mounts here */}
            </div>
        </div>
    </div>
  );
}
