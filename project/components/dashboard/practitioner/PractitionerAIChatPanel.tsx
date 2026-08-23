"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User as UserIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface PractitionerAIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PractitionerAIChatPanel({
  isOpen,
  onClose,
}: PractitionerAIChatPanelProps) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatLogId, setChatLogId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const message = draft.trim();
    if (!message || isSending) return;
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setDraft("");
    setIsSending(true);
    try {
      const res = await fetch("/api/practitioner/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, chatLogId: chatLogId || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Chat failed");
      setChatLogId(json.data.chatLogId);
      setMessages((prev) => [...prev, { role: "assistant", content: json.data.reply }]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Chat failed — please try again.");
      setMessages((prev) => prev.slice(0, -1));
      setDraft(message);
    }
    setIsSending(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Clinical Assistant" width="md" noPadding>
      <div className="flex flex-col h-full">
        <div className="p-4 sm:p-6 pb-0 shrink-0">
          <Alert
            status="info"
            title="General medical information only — not a diagnosis for a specific patient. Use the AI Diagnosis Support panel on a patient's page for that."
          />
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-10">
              Ask about drug information, clinical guidelines, or general medical questions.
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    m.role === "user" ? "bg-primary text-white" : "bg-surface-soft text-ink-600"
                  }`}
                >
                  {m.role === "user" ? <UserIcon size={14} /> : <Bot size={14} />}
                </div>
                <div
                  className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-white"
                      : "bg-surface-soft text-ink-900"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 sm:p-6 pt-3 border-t border-border shrink-0 flex items-end gap-2">
          <div className="flex-1">
            <Input
              placeholder="Ask a clinical question..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
          </div>
          <Button
            icon={<Send size={16} />}
            loading={isSending}
            onClick={send}
            aria-label="Send message"
          >
            Send
          </Button>
        </div>
      </div>
    </Modal>
  );
}
