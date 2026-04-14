import React, { useState, useRef } from 'react';
import { BiMicrophone, BiSquareRounded, BiLoaderAlt } from 'react-icons/bi';

export default function VoiceRecorder({ onSend }: { onSend: (content: string, type?: string, fileUrl?: string, fileMime?: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.current = new MediaRecorder(stream);
        mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
        
        mediaRecorder.current.onstop = async () => {
          setIsUploading(true);
          try {
              const blob = new Blob(chunks.current, { type: 'audio/webm' });
              const file = new File([blob], 'voice-message.webm', { type: 'audio/webm' });
              const formData = new FormData();
              formData.append('file', file);
              const res = await fetch('/api/chat/upload', { method: 'POST', body: formData });
              const { url } = await res.json();
              if (url) {
                  onSend('Voice Message', 'audio', url, 'audio/webm');
              }
          } catch (err) {
              console.error('Audio upload failed', err);
          } finally {
              setIsUploading(false);
              chunks.current = [];
          }
        };
        
        mediaRecorder.current.start();
        setRecording(true);
    } catch (err) {
        console.error('Mic access denied', err);
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());
    setRecording(false);
  };

  if (isUploading) {
      return (
          <div className="p-3 text-primary animate-pulse">
              <BiLoaderAlt className="animate-spin" size={24} />
          </div>
      );
  }

  return (
    <button 
       type="button"
       onClick={recording ? stopRecording : startRecording} 
       className={`p-3 rounded-full transition-all ${recording ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-slate-400 hover:text-primary hover:bg-slate-100'}`}
    >
      {recording ? <BiSquareRounded size={24} className="animate-pulse" /> : <BiMicrophone size={24} />}
    </button>
  );
}
