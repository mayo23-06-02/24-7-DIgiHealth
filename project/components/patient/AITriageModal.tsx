// components/patient/AITriageModal.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { BiSend, BiLoaderCircle, BiX, BiPulse } from "react-icons/bi";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

interface AITriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientAge?: number;
  patientGender?: string;
}

export default function AITriageModal({
  isOpen,
  onClose,
  patientAge = 30,
  patientGender = "female",
}: AITriageModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello, I'm Dr. SymtoSage, your AI clinical assistant. Please describe your symptoms in detail, and I'll provide a preliminary analysis based on my medical training.",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Build conversation history from previous messages (exclude the welcome message)
      const history = messages
        .filter((m) => m.sender !== "ai" || !m.text.includes("Hello"))
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        }));

      const response = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: userMessage.text,
          history,
          age: patientAge,
          gender: patientGender,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to get analysis");
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: result.data.aiAnalysis,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `⚠️ ${error.message || "Unable to reach the AI service. Please check your connection and try again."}`,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dr. SymtoSage – AI Triage"
      width="2xl"
      noPadding
    >
      <div className="bg-white  w-full h-[600px] flex flex-col overflow-hidden">
        {/* Disclaimer Banner */}
        <div className="bg-blue-50 p-2 text-center border-b border-blue-100 text-[10px] text-blue-800 font-bold  tracking-normal">
          ⚕️ Educational purposes only. Does not replace professional medical
          advice.
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-none ${
                  message.sender === "user"
                    ? "bg-primary text-white rounded-br-none"
                    : "bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-none"
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed text-sm font-medium">
                  {message.text}
                </div>
                <p
                  className={`text-[10px] mt-2 text-right font-bold  tracking-normal ${message.sender === "user" ? "opacity-70" : "text-slate-300"}`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-none inline-flex items-center gap-3">
                <BiLoaderCircle className="animate-spin text-primary text-2xl" />
                <span className="text-xs font-bold text-slate-400  tracking-normal">
                  Analyzing symptoms...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t bg-white flex gap-3 items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Describe your symptoms..."
            className="flex-1 border bg-slate-50 border-slate-100 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition text-sm font-medium"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            variant="primary"
            className="w-14 h-14 p-0 rounded-xl flex items-center justify-center shadow-none shadow-primary/20 active:scale-95 transition-all !min-w-0"
          >
            <BiSend size={24} className="ml-1" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
