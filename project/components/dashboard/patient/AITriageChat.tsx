"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import ChatInterface from "@/components/shared/ChatInterface";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: Date;
}

interface AITriageChatProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
}

export default function AITriageChat({
  isOpen,
  onClose,
  patientName,
}: AITriageChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "assistant",
      text: `Hello ${patientName.split(" ")[0]}! I'm SymtoSage, your AI clinical assistant. I can help you analyze symptoms, cross-reference clinical data, and provide triage support. How can I assist you today?`,
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const history = messages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const response = await fetch("/api/ai-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: text,
          history: history,
        }),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Triage failed");

      const aiText = resData.data.aiAnalysis;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text:
          aiText ||
          "I'm sorry, I couldn't process that. How can I help you today?",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Triage Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: "I'm having trouble connecting to the medical database right now. If this is an emergency, please contact 112 or 10177 immediately.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Clinical AI Triage"
      width="md"
    >
      <div className="h-[600px]">
        <ChatInterface
          title="SymtoSage"
          messages={messages}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
        />
        <div className="text-center mt-6">
          <p className="text-xs font-bold text-slate-300  tracking-normal">
            Emergency? Call <span className="text-red-500">112</span> or{" "}
            <span className="text-red-500">10177</span> immediately.
          </p>
        </div>
      </div>
    </Modal>
  );
}
