"use client";

import React, { useState, useRef, useEffect } from "react";
import { BiSend, BiUser, BiBot, BiPaperclip } from "react-icons/bi";
import Avatar from "../ui/Avatar";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface ChatInterfaceProps {
  title: string;
  onSendMessage: (text: string) => void;
  messages: Message[];
  isTyping?: boolean;
}

import Button from "../ui/Button";

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  title,
  onSendMessage,
  messages,
  isTyping,
}) => {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100 shadow-inner">
      {/* Header */}
      {title && (
        <div className="p-6 bg-white border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <BiBot size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 leading-none">
                {title}
              </h4>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-normal mt-1 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                Active Session
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 p-8 overflow-y-auto space-y-6 custom-scrollbar">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-4 ${m.sender === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`
              w-10 h-10 rounded-xl flex items-center justify-center shrink-0
              ${m.sender === "user" ? "bg-primary text-white" : "bg-white border border-slate-100 text-slate-400 shadow-none"}
            `}
            >
              {m.sender === "user" ? <BiUser /> : <BiBot />}
            </div>

            <div
              className={`
              max-w-[75%] p-4 rounded-2xl text-sm font-medium leading-relaxed
              ${m.sender === "user" ? "bg-primary text-white" : "bg-white border border-slate-100 text-slate-700 shadow-none"}
            `}
            >
              {m.text}
              <div
                className={`mt-2 text-[9px] font-bold uppercase tracking-normal opacity-40 ${m.sender === "user" ? "text-right" : ""}`}
              >
                {m.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 flex items-center justify-center shrink-0 shadow-none">
              <BiBot />
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-2xl flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-white border-t border-slate-50">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center gap-3"
        >
          <Button
            type="button"
            variant="ghost"
            className="w-12 h-12 p-0 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-primary/5 hover:text-primary transition-all !min-w-0"
          >
            <BiPaperclip size={20} />
          </Button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-medium text-slate-900 placeholder-slate-300 focus:ring-4 focus:ring-primary/5 transition-all outline-none"
          />

          <Button
            type="submit"
            className="w-12 h-12 p-0 rounded-2xl bg-primary text-white flex items-center justify-center shadow-none shadow-primary/20 hover:scale-105 transition-all !min-w-0"
          >
            <BiSend size={20} />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
