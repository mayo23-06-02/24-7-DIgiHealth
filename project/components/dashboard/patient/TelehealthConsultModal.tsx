"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BiVideo,
  BiVideoOff,
  BiMicrophone,
  BiMicrophoneOff,
  BiPhoneOff,
  BiMessageDetail,
  BiUserCircle,
  BiExpand,
  BiVolumeFull,
  BiVolumeMute,
  BiX,
  BiSend,
  BiPaperclip,
  BiDotsVerticalRounded,
  BiUser,
  BiPlus,
  BiMenu,
  BiHeart,
  BiShieldQuarter,
  BiLinkExternal,
  BiInfoCircle,
} from "react-icons/bi";
import Button from "@/components/ui/Button";

interface Message {
  id: string;
  sender: "doctor" | "patient";
  text: string;
  timestamp: string;
}

interface TelehealthConsultModalProps {
  doctor: {
    name: string;
    specialisation: string;
    avatarUrl?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TelehealthConsultModal({
  doctor,
  isOpen,
  onClose,
}: TelehealthConsultModalProps) {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [callTime, setCallTime] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "doctor",
      text: "Hello, how are you feeling today?",
      timestamp: "10:02 AM",
    },
    {
      id: "2",
      sender: "patient",
      text: "Hi doctor, I am feeling a bit better, but still have that chest pain.",
      timestamp: "10:03 AM",
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      timer = setInterval(() => {
        setCallTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isChatOpen]);

  if (!isOpen || !doctor) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg: Message = {
      id: Date.now().toString(),
      sender: "patient",
      text: newMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages([...messages, msg]);
    setNewMessage("");

    // Simulate doctor response
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        sender: "doctor",
        text: "I see. Let's take a closer look at those symptoms together.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, response]);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-700 bg-slate-900 flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-500">
      {/* Main Video Section */}
      <div className="relative flex-1 flex flex-col bg-slate-800">
        {/* Top Indicators */}
        <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-none">
          <div className="flex items-center gap-3 bg-slate-900/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 ">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-white text-xs font-bold  tracking-normal">
              Live • {formatTime(callTime)}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 ">
            <BiShieldQuarter className="text-emerald-500" />
            <span className="text-white/60 text-[9px] font-bold  tracking-normal">
              End-to-End Encrypted
            </span>
          </div>
        </div>

        {/* Doctor Video Surface (Large) */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden group">
          <img
            src={
              doctor.avatarUrl ||
              "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=1200"
            }
            className={`w-full h-full object-cover transition-all duration-1000 ${isVideoOn ? "scale-100 blur-0" : "scale-110 blur-2xl grayscale opacity-50"}`}
            alt="Doctor View"
          />

          {!isVideoOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-40 h-40 rounded-full border-4 border-primary/30 flex items-center justify-center bg-slate-900/60 backdrop-blur-3xl shadow-3xl">
                <span className="text-primary text-6xl font-bold">Dr.</span>
              </div>
              <div className="text-center">
                <h2 className="text-white text-2xl font-bold tracking-tight font-grotesk">
                  {doctor.name}
                </h2>
                <p className="text-white/40 text-xs  font-bold tracking-normal mt-2">
                  Connecting camera signal...
                </p>
              </div>
            </div>
          )}

          {/* Doctor Overlay Info */}
          <div className="absolute bottom-10 left-10 p-6 bg-slate-900/40 backdrop-blur-3xl rounded-[32px] border border-white/10  max-w-[280px] pointer-events-none transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
            <h3 className="text-white text-lg font-bold tracking-tight font-grotesk">
              {doctor.name}
            </h3>
            <p className="text-primary-light text-xs font-bold  tracking-normal">
              {doctor.specialisation}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                <BiInfoCircle />
              </div>
              <p className="text-white/60 text-xs font-medium leading-relaxed">
                Discussing irregular cardiovascular feedback from smartwatch.
              </p>
            </div>
          </div>
        </div>

        {/* Patient Video Surface (PiP) */}
        <div className="absolute top-24 right-10 w-48 h-64 rounded-[32px] overflow-hidden border-4 border-slate-900 shadow-3xl z-30 group cursor-move">
          {/* Simulation of patient video */}
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400"
            className="w-full h-full object-cover grayscale-[0.2]"
            alt="Patient View"
          />
          <div className="absolute inset-0 bg-primary/10" />
          <div className="absolute top-4 left-4 bg-slate-900/60 backdrop-blur-md px-2 py-1 rounded-lg text-white text-[8px] font-bold  tracking-normal">
            You (Patient)
          </div>

        {/* Patient Video Surface (PiP) */}
        <div className="absolute top-24 right-10 w-48 h-64 rounded-[32px] overflow-hidden border-4 border-slate-900 shadow-3xl z-30 group cursor-move">
          {/* Simulation of patient video */}
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400"
            className="w-full h-full object-cover grayscale-[0.2]"
            alt="Patient View"
          />
          <div className="absolute inset-0 bg-primary/10" />
          <div className="absolute top-4 left-4 bg-slate-900/60 backdrop-blur-md px-2 py-1 rounded-lg text-white text-[8px] font-bold  tracking-normal">
            You (Patient)
          </div>

          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              className="text-white p-0 !min-w-0 bg-transparent border-none"
            >
              <BiExpand size={24} />
            </Button>
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="h-32 bg-linear-to-t from-slate-900 to-transparent flex items-center justify-center gap-6 relative z-40">
          <Button
            onClick={() => setIsMicOn(!isMicOn)}
            variant="ghost"
            className={`w-14 h-14 p-0 rounded-full flex items-center justify-center transition-all active:scale-90 !min-w-0 ${isMicOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500 text-white shadow-rose-500/40"}`}
          >
            {isMicOn ? (
              <BiMicrophone size={24} />
            ) : (
              <BiMicrophoneOff size={24} />
            )}
          </Button>

          <Button
            onClick={() => setIsVideoOn(!isVideoOn)}
            variant="ghost"
            className={`w-14 h-14 p-0 rounded-full flex items-center justify-center transition-all active:scale-90 !min-w-0 ${isVideoOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500 text-white shadow-rose-500/40"}`}
          >
            {isVideoOn ? <BiVideo size={24} /> : <BiVideoOff size={24} />}
          </Button>

          <Button
            variant="secondary"
            onClick={onClose}
            className="w-20 h-16 bg-rose-500 hover:bg-rose-600 text-white rounded-[24px] flex items-center justify-center  shadow-rose-500/40 transition-all active:scale-95 group !min-w-0 border-none"
          >
            <BiPhoneOff
              size={32}
              className="group-hover:rotate-12 transition-transform"
            />
          </Button>

          <Button
            onClick={() => setIsChatOpen(!isChatOpen)}
            variant="ghost"
            className={`relative w-14 h-14 p-0 rounded-full flex items-center justify-center transition-all active:scale-90 !min-w-0 ${isChatOpen ? "bg-primary text-white shadow-primary/40" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            <BiMessageDetail size={24} />
            {!isChatOpen && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
                2
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={() => setIsMuted(!isMuted)}
            className="w-14 h-14 p-0 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all active:scale-90 !min-w-0"
          >
            {isMuted ? <BiVolumeMute size={24} /> : <BiVolumeFull size={24} />}
          </Button>
        </div>
      </div>

      {/* Chat Sidebar */}
      {isChatOpen && (
        <div className="w-full md:w-[400px] h-full bg-white flex flex-col shadow-3xl animate-in slide-in-from-right-20 duration-500 relative z-50">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <BiMessageDetail size={24} />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800 tracking-tight leading-none mb-1 font-grotesk">
                  Session Chat
                </h4>
                <p className="text-xs font-bold text-slate-400  tracking-normal">
                  Dr. {doctor.name.split(" ")[1]}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setIsChatOpen(false)}
              className="w-10 h-10 p-0 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 !min-w-0 border-none bg-transparent"
            >
              <BiX size={24} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "patient" ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-[24px] text-sm font-medium ${msg.sender === "patient" ? "bg-primary text-white rounded-tr-none" : "bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-none"}`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] font-bold text-slate-300 mt-2  tracking-normal">
                  {msg.timestamp}
                </span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-6 border-t border-slate-100 bg-white"
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-[24px] border border-slate-100 focus-within:border-primary/30 transition-all">
              <Button
                type="button"
                variant="ghost"
                className="text-slate-400 hover:text-primary transition-colors p-0 !min-w-0 border-none bg-transparent"
              >
                <BiPaperclip size={20} />
              </Button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-800 outline-none"
              />
              <Button
                type="submit"
                variant="primary"
                className="w-10 h-10 p-0 bg-primary text-white rounded-xl flex items-center justify-center shadow-none shadow-primary/20 active:scale-90 transition-transform !min-w-0"
              >
                <BiSend size={20} />
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Session Info Sidebar (Left) */}
      <div className="hidden lg:flex absolute top-1/2 -translate-y-1/2 left-6 z-40 flex-col gap-4">
        <div className="bg-slate-900/60 backdrop-blur-3xl p-5 rounded-[32px] border border-white/10  space-y-6 w-72 transform -translate-x-full opacity-0 hover:translate-x-0 hover:opacity-100 transition-all duration-700 delay-500">
          <h5 className="text-xs font-bold text-white/40  tracking-normal mb-4 font-grotesk">
            Patient Intelligence
          </h5>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl">
              <span className="text-xs font-bold text-white/60">
                Heart Rate
              </span>
              <span className="text-sm font-bold text-rose-400">102 BPM</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl">
              <span className="text-xs font-bold text-white/60">B.P</span>
              <span className="text-sm font-bold text-emerald-400">120/80</span>
            </div>
          </div>
          <div className="pt-4 border-t border-white/10">
            <h6 className="text-xs font-bold text-primary-light  tracking-normal mb-2 font-grotesk">
              Prescription Sync
            </h6>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <BiShieldQuarter />
              </div>
              <p className="text-xs font-bold text-white/60">
                Lipitor 20mg active for refill sync during this session.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
