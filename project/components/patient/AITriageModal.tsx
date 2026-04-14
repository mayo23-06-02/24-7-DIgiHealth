'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BiSend, BiLoaderCircle, BiX, BiPulse } from 'react-icons/bi';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  nhsLinks?: Array<{ title: string; url: string; description: string }>;
}

interface AITriageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AITriageModal({ isOpen, onClose }: AITriageModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello, I'm SymptomSage, your AI triage assistant. Please describe your symptoms in detail, and I will provide some preliminary, educational information based on official NHS guidance.",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat when new messages arrive.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: userMessage.text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: result.data.aiAnalysis,
          sender: 'ai',
          timestamp: new Date(),
          nhsLinks: result.data.nhsLinks,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error(result.error || 'Failed to get analysis');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I encountered an issue processing your request. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[600px] flex flex-col shadow-xl animate-in slide-in-from-bottom-5">
        {/* Modal Header */}
        <div className="p-4 border-b flex justify-between items-center rounded-t-2xl bg-[#0052cc]">
          <div className="flex items-center gap-2">
            <BiPulse className="text-white text-2xl" />
            <h2 className="text-xl font-bold text-white">SymptomSage AI Triage</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <BiX size={28} />
          </button>
        </div>

        {/* Disclaimer Note */}
        <div className="bg-blue-50 p-2 text-center border-b border-blue-100 text-xs text-blue-800 font-medium tracking-wide">
          Educational purposes only. Does not replace professional medical advice.
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                  message.sender === 'user'
                    ? 'bg-[#0052cc] text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.text.replace(/\*\*/g, '')}</div>
                {message.nhsLinks && message.nhsLinks.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100 text-sm">
                    <p className="font-semibold mb-2 text-[#0052cc]">📚 NHS Guidance References:</p>
                    <ul className="list-disc list-inside space-y-1.5 opacity-90">
                      {message.nhsLinks.map((link, idx) => (
                        <li key={idx} className="truncate">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#00A3BF] hover:underline font-medium"
                          >
                            {link.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className={`text-[10px] mt-2 text-right ${message.sender === 'user' ? 'opacity-70' : 'text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-4 shadow-sm inline-flex items-center gap-3">
                <BiLoaderCircle className="animate-spin text-[#0052cc] text-2xl" />
                <span className="text-sm font-medium text-gray-500">SymptomSage is analyzing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-white rounded-b-2xl flex gap-3 items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Describe your symptoms... (e.g., 'Headache and fever')"
            className="flex-1 border bg-slate-50 border-gray-200 rounded-full px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0052cc]/50 focus:border-[#0052cc] transition shadow-inner"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="bg-[#0052cc] text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#0041a3] disabled:opacity-50 disabled:bg-gray-300 transition-colors shadow-md hover:shadow-lg"
          >
            <BiSend size={20} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
