import React, { useState, useEffect } from 'react';
import { BiVideo, BiPhoneCall, BiLoaderAlt } from 'react-icons/bi';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useSearchParams } from 'next/navigation';
import CallModal from './CallModal';

export default function CallButton({ 
  consultationId, 
  conversationId, 
  role 
}: { 
  consultationId?: string, 
  conversationId?: string, 
  role: string 
}) {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [autoJoinAvailable, setAutoJoinAvailable] = useState(false);
  const [roomInfo, setRoomInfo] = useState<{url: string, token: string, callId: string} | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    // Check for autoStart query param for testing immediate calls
    const autoStart = searchParams.get('autoStart');
    if (autoStart === 'true') {
        startCall('video');
    }
  }, []); // Only on mount

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!consultationId && !conversationId) return;
      try {
          const endpoint = consultationId 
            ? `/api/chat/call/status/${consultationId}`
            : `/api/chat/call/status/direct/${conversationId}`;

          const res = await fetch(endpoint);
          const data = await res.json();
          if (data.active && !callActive && !modalOpen) {
            setAutoJoinAvailable(true);
            setRoomInfo({ url: data.roomUrl, token: '', callId: data.callId });
          } else if (!data.active) {
            setAutoJoinAvailable(false);
          }
      } catch (err) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [consultationId, conversationId, callActive, modalOpen]);

  const startCall = async (type: 'video' | 'voice') => {
    setStatusLoading(true);
    try {
        const res = await fetch('/api/chat/call/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consultationId, conversationId, type, userId: user?.id })
        });
        const data = await res.json();
        if (data.roomUrl) {
            setRoomInfo({ url: data.roomUrl, token: data.token, callId: data.callId });
            setCallActive(true);
            setModalOpen(true);
            setAutoJoinAvailable(false);
        } else if (data.error) {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setStatusLoading(false);
    }
  };

  const endCall = async () => {
      if (roomInfo?.callId) {
          await fetch('/api/chat/call/end', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callId: roomInfo.callId })
          });
      }
      setCallActive(false);
      setModalOpen(false);
      setRoomInfo(null);
  };

  return (
    <>
      <div className="flex gap-2">
        {autoJoinAvailable && !modalOpen && (
           <button 
              onClick={() => { setModalOpen(true); setCallActive(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-all shadow-lg animate-pulse"
           >
              JOIN ACTIVE CALL
           </button>
        )}

        {!autoJoinAvailable && (
            <>
                <button 
                   onClick={() => startCall('voice')} 
                   disabled={statusLoading}
                   className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                >
                   {statusLoading ? <BiLoaderAlt className="animate-spin" /> : <BiPhoneCall size={20} />}
                </button>
                <button 
                   onClick={() => startCall('video')} 
                   disabled={statusLoading}
                   className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                >
                   {statusLoading ? <BiLoaderAlt className="animate-spin" /> : <BiVideo size={20} />}
                </button>
            </>
        )}
      </div>

      {modalOpen && roomInfo && (
          <CallModal 
              roomUrl={roomInfo.url} 
              token={roomInfo.token} 
              onClose={endCall} 
          />
      )}
    </>
  );
}
