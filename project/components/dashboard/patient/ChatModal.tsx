"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BiSend,
  BiPaperclip,
  BiLoaderCircle,
  BiCheck,
  BiCheckDouble,
  BiX,
  BiDotsVerticalRounded,
  BiImageAdd,
  BiSmile,
  BiMicrophone,
} from "react-icons/bi";
import Image from "next/image";

interface Message {
  id: string;
  text: string;
  sender: "patient" | "practitioner";
  timestamp: Date;
  status: "sending" | "sent" | "delivered" | "read";
  imageUrl?: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  practitionerName: string;
  practitionerAvatar?: string;
  consultationId: string;
}

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export default function ChatModal({
  isOpen,
  onClose,
  practitionerName,
  practitionerAvatar,
  consultationId,
}: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello, how are you feeling today?",
      sender: "practitioner",
      timestamp: new Date(Date.now() - 3600000),
      status: "read",
    },
    {
      id: "2",
      text: "I've reviewed your latest blood pressure logs and they look a bit high. Let's discuss.",
      sender: "practitioner",
      timestamp: new Date(Date.now() - 1800000),
      status: "read",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string, imageUrl?: string) => {
    if (!text.trim() && !imageUrl) return;
    setIsSending(true);

    const tempId = Date.now().toString();
    const newMessage: Message = {
      id: tempId,
      text: text.trim(),
      sender: "patient",
      timestamp: new Date(),
      status: "sending",
      imageUrl,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");

    // Simulate Network Latency & Success
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, status: "sent" } : msg,
        ),
      );
      setIsSending(false);

      // Simulating Doctor Response
      setTimeout(() => {
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "Thank you for the update. I'll take a look at those details shortly.",
          sender: "practitioner",
          timestamp: new Date(),
          status: "read",
        };
        setMessages((prev) => [...prev, botResponse]);
      }, 2000);
    }, 1000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate image upload preview
    const reader = new FileReader();
    reader.onload = (e) => {
      sendMessage("", e.target?.result as string);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      width="2xl"
      title={`Consultation with Dr. ${practitionerName}`}
      hideHeader
    >
      <div className="relative bg-white w-full h-[85vh] md:h-[700px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-10 py-8 border-b border-slate-50 shrink-0">
          <div className="flex items-center gap-5">
            <Button
              onClick={onClose}
              variant="secondary"
              className="w-12 h-12 p-0 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 group transition-all !min-w-0"
            >
              <BiX
                size={28}
                className="group-hover:rotate-90 transition-transform"
              />
            </Button>
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 overflow-hidden ring-4 ring-white shadow-none transition-transform hover:scale-105">
                <img
                  src={
                    practitionerAvatar ||
                    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200"
                  }
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight leading-none mb-1 font-grotesk">
                Dr. {practitionerName}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-500  tracking-normal">
                  Active Consultation
                </span>
                <span className="text-slate-200">|</span>
                <span className="text-xs font-bold text-slate-400  tracking-normal">
                  {consultationId}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="white"
              className="w-12 h-12 p-0 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all active:scale-90 shadow-none !min-w-0"
            >
              <BiDotsVerticalRounded size={24} />
            </Button>
          </div>
        </div>

        {/* Messages Loop */}
        <div className="flex-1 overflow-y-auto px-10 py-10 space-y-8 custom-scrollbar bg-slate-50/20">
          <div className="flex justify-center mb-10">
            <span className="px-5 py-2 bg-white border border-slate-100 rounded-full text-xs font-bold text-slate-400  tracking-normal shadow-none">
              Secure End-to-End Encryption Enabled
            </span>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "patient" ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2`}
            >
              <div
                className={`max-w-[80%] rounded-[32px] p-6 text-sm font-medium relative group ${
                  msg.sender === "patient"
                    ? "bg-primary text-white rounded-tr-none shadow-none shadow-primary/20"
                    : "bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-none"
                }`}
              >
                {msg.imageUrl && (
                  <div className="relative mb-4 rounded-2xl overflow-hidden border-2 border-white/20 shadow-none">
                    <img
                      src={msg.imageUrl}
                      alt="Shared attachment"
                      className="w-full max-h-[300px] object-cover"
                    />
                  </div>
                )}
                {msg.text && (
                  <p className="leading-relaxed text-base font-bold tracking-tight">
                    {msg.text}
                  </p>
                )}

                <div
                  className={`flex items-center gap-2 mt-4 ${msg.sender === "patient" ? "justify-end text-white/60" : "justify-start text-slate-300"}`}
                >
                  <span className="text-[9px] font-bold  tracking-normal">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {msg.sender === "patient" && (
                    <div className="flex">
                      {msg.status === "sending" ? (
                        <BiLoaderCircle className="animate-spin" size={14} />
                      ) : msg.status === "sent" ? (
                        <BiCheck size={14} className="opacity-60" />
                      ) : msg.status === "delivered" ? (
                        <BiCheckDouble size={14} className="opacity-60" />
                      ) : msg.status === "read" ? (
                        <BiCheckDouble size={14} className="text-emerald-300" />
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Action Input */}
        <div className="p-8 border-t border-slate-50 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button
                variant="white"
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 p-0 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-95 shadow-none !min-w-0"
              >
                <BiImageAdd size={24} />
              </Button>
              <Button
                variant="white"
                className="w-14 h-14 p-0 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-95 shadow-none !min-w-0"
              >
                <BiMicrophone size={24} />
              </Button>
            </div>

            <div className="flex-1 flex items-center gap-3 bg-slate-50 rounded-[28px] border border-slate-100 px-6 py-2 transition-all focus-within:bg-white focus-within:shadow-none focus-within:shadow-slate-200/50 focus-within:border-primary/20">
              <Button
                variant="ghost"
                className="p-0 !min-w-0 text-slate-300 hover:text-gray-500 transition-colors bg-transparent border-none"
              >
                <BiSmile size={24} />
              </Button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage(inputText)}
                placeholder="Describe your symptoms or ask a question..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-800 placeholder:text-slate-300 py-3 outline-none"
              />
              <Button
                variant="primary"
                onClick={() => sendMessage(inputText)}
                disabled={isSending || !inputText.trim()}
                className={`w-12 h-12 p-0 rounded-2xl flex items-center justify-center transition-all !min-w-0 ${
                  inputText.trim()
                    ? "bg-primary text-white shadow-none shadow-primary/20 hover:scale-105 active:scale-90"
                    : "bg-slate-200 text-white cursor-not-allowed"
                }`}
              >
                <BiSend
                  size={22}
                  className={isSending ? "animate-pulse" : ""}
                />
              </Button>
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />
          <p className="text-center mt-6 text-[9px] font-bold text-slate-300  tracking-normal">
            Only you and Dr. {practitionerName.split(" ")[0]} can see this
            medical conversation.
          </p>
        </div>
      </div>
    </Modal>
  );
}
