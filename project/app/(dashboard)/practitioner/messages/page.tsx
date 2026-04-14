'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import { BiSend, BiSearch, BiSmile, BiPaperclip, BiVideo, BiPhone, BiLoaderAlt } from 'react-icons/bi';

import ChatWindow from '@/components/chat/ChatWindow';
import { useAuthContext } from '@/components/auth/AuthProvider';

const RISK_DOT: Record<string, string> = { red: 'bg-rose-500', amber: 'bg-amber-400', green: 'bg-emerald-500', unknown: 'bg-slate-300' };

export default function PractitionerMessagesPage() {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [initialPatientId, setInitialPatientId] = useState<string | null>(searchParams.get('patient'));

  const fetchUnifiedList = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch active conversations
      const convRes = await fetch('/api/conversations');
      let convData = convRes.ok ? await convRes.json() : [];

      // 2. Fetch official patient list
      const patientRes = await fetch('/api/practitioner/patients');
      const patientData = patientRes.ok ? (await patientRes.json()).data : [];

      // 3. Merge: If a patient exists in the official list but no conversation yet, add as placeholder
      patientData.forEach((p: any) => {
        const hasConv = convData.find((c: any) => c.patientId === p.id || c.doctor === p.fullName);
        if (!hasConv) {
          convData.push({
            id: `new-${p.id}`,
            patientId: p.id,
            doctor: p.fullName, // Using existing field name 'doctor' for consistency in the list items
            avatar: `https://ui-avatars.com/api/?name=${p.fullName.replace(' ', '+')}&background=4493b8&color=fff`,
            lastMessage: 'Clinical channel opened.',
            timestamp: '',
            unread: 0,
            riskColor: p.riskColor || 'unknown',
            isPlaceholder: true
          });
        }
      });

      setConversations(convData);
      
      // Handle initial patient auto-select
      if (initialPatientId) {
        const match = convData.find((c: any) => c.patientId === initialPatientId || c.id === `new-${initialPatientId}`);
        if (match) {
          if (match.isPlaceholder) {
            handleStartConversation(initialPatientId);
          } else {
            setActiveChatId(match.id.toString());
          }
          setInitialPatientId(null); // only once
        }
      }
    } catch { /* silent */ }
    setIsLoading(false);
  }, [initialPatientId]);

  const handleStartConversation = async (patientId: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId }) // Note: patientId here is the other party
      });
      if (res.ok) {
        const data = await res.json();
        await fetchUnifiedList();
        setActiveChatId(data.conversationId);
      }
    } catch { /* silent */ }
  };

  useEffect(() => { fetchUnifiedList(); }, [fetchUnifiedList]);

  const filtered = conversations.filter(c => !search || c.doctor.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full h-[calc(100vh-120px)] flex gap-0 rounded-3xl border border-slate-200 overflow-hidden shadow-sm bg-white">
      {/* Left: Conversations List */}
      <div className="w-[300px] shrink-0 border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 mb-3">Messages</h2>
          <div className="relative">
            <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search conversations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <BiLoaderAlt className="animate-spin mb-4" size={32} />
                <p className="text-[10px] uppercase font-black tracking-widest">Synchronizing Channels...</p>
             </div>
          ) : filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => {
                if (conv.isPlaceholder) {
                  handleStartConversation(conv.patientId);
                } else {
                  setActiveChatId(conv.id?.toString());
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-slate-50 ${activeChatId?.toString() === conv.id?.toString() ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-slate-50'}`}
            >
              <div className="relative shrink-0">
                <Avatar name={conv.doctor} size="sm" />
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${RISK_DOT[conv.riskColor || 'unknown']}`} title={`Clinical Risk: ${conv.riskColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className={`text-sm font-bold truncate ${activeChatId?.toString() === conv.id?.toString() ? 'text-primary' : 'text-slate-800'}`}>{conv.doctor}</p>
                    {conv.isPlaceholder && (
                      <span className="shrink-0 text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase font-black">Patient List</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-1">{conv.timestamp}</span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage}</p>
              </div>
              {conv.unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {conv.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Chat Window */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChatId && !activeChatId.startsWith('new-') ? (
           <ChatWindow conversationId={activeChatId} />
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-12 text-center">
              <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm flex items-center justify-center text-slate-300 mb-6">
                 <BiSend size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2 uppercase">Clinical Comms Hub</h3>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed font-medium">Select a patient from your clinical list to continue Secure Direct Messaging or initiate a Video Consultation.</p>
           </div>
        )}
      </div>
    </div>
  );
}
