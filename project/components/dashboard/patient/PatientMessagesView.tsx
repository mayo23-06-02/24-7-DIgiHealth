"use client";

import React, { useState, useEffect, useCallback } from "react";
import Avatar from "@/components/ui/Avatar";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import {
  BiSend, BiPaperclip, BiMicrophone, BiVideo, BiPhoneCall,
  BiCheckDouble, BiWifiOff, BiChevronLeft, BiImage, BiLoaderAlt,
  BiMessageDetail, BiUserPin
} from "react-icons/bi";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAuthContext } from "@/components/auth/AuthProvider";

const QUICK_PHRASES = [
  "I need a prescription refill.",
  "Are my test results ready?",
  "I am experiencing side effects.",
  "Can we reschedule?",
  "Thank you, Doctor."
];

export default function PatientMessagesView() {
  const { user } = useAuthContext();
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        let data = await res.json();
        
        // Fetch My Doctors (consulted + favorites) ensuring they are approved contacts
        const docRes = await fetch('/api/patient/my-doctors');
        if (docRes.ok) {
          const approvedDocs = await docRes.json();
          approvedDocs.forEach((doc: any) => {
            const existing = data.find((c: any) => c.practitionerId === doc.id || c.doctor === doc.name);
            if (!existing) {
              data.push({
                isPlaceholder: true,
                id: `new-${doc.id}`,
                practitionerId: doc.id,
                doctor: doc.name,
                avatar: doc.avatarUrl || `https://ui-avatars.com/api/?name=${doc.name.replace(' ', '+')}&background=4493b8&color=fff`,
                lastMessage: 'Clinical channel ready.',
                timestamp: '',
                unread: 0,
                online: doc.isOnline
              });
            }
          });
        }
        setConversations(data);
      }
    } catch { /* silent */ }
    setIsLoading(false);
  }, []);

  const handleStartConversation = async (practitionerId: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practitionerId })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        setActiveChatId(data.conversationId);
      }
    } catch { /* silent */ }
  };

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const activeChat = conversations.find(c => c.id?.toString() === activeChatId?.toString());

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    // TODO: wire to /api/chat POST with conversationId
    setMessageInput("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden -m-4 lg:-m-8 animate-in fade-in duration-700">
      {/* OFFLINE BANNER */}
      {isOffline && (
        <div className="bg-amber-500 text-white p-2 text-center text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
          <BiWifiOff size={16} /> Connection lost. Messages will queue and send when online.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden bg-white">

        {/* CONVERSATION LIST (Sidebar) */}
        <div className={`w-full md:w-80 border-r border-slate-100 flex-col flex shrink-0 ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Secure Messages</h2>
            <p className="text-slate-500 font-medium tracking-tight mb-4 text-xs">Stay connected with your clinical care team.</p>
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <BiLoaderAlt size={28} className="text-primary animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No Messages"
                  description="Start a conversation from the Doctors page."
                  icon={<BiSend size={28} />}
                />
              </div>
            ) : (
              conversations
                .filter(c => c.doctor?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(conv => (
                  <div
                    key={conv.id}
                    className={`p-4 border-b border-slate-50 cursor-pointer transition-all flex gap-3 hover:bg-slate-50 ${activeChatId?.toString() === conv.id?.toString() ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                    onClick={() => {
                      if (conv.isPlaceholder) {
                        handleStartConversation(conv.practitionerId);
                      } else {
                        setActiveChatId(conv.id?.toString());
                      }
                    }}
                  >
                    <Avatar src={conv.avatar} name={conv.doctor} size="md" status={conv.online ? 'online' : 'offline'} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{conv.doctor}</h4>
                          {conv.isPlaceholder && (
                            <span className="shrink-0 text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase font-black">My Doctor</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold ml-2 whitespace-nowrap">{conv.timestamp}</span>
                      </div>
                      <p className={`text-xs truncate ${conv.unread > 0 ? 'text-slate-800 font-bold' : 'text-slate-500 font-medium'}`}>
                        {conv.lastMessage}
                      </p>
                    </div>
                    {conv.unread > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-2 shadow-md shadow-primary/20">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>

        {/* CHAT WINDOW */}
        {activeChatId && !activeChatId.startsWith('new-') ? (
          <div className={`flex-1 flex flex-col bg-slate-50/30 relative ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
            <ChatWindow conversationId={activeChatId} />
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-slate-50">
            <EmptyState
              title="Encrypted Bridge"
              description="Direct channels available for clinical discussion with your practitioner list."
              icon={<BiMessageDetail size={48} />}
            />
          </div>
        )}
      </div>
    </div>
  );
}
