import React, { useState, useRef } from "react";
import { BiImageAdd, BiPaperPlane, BiLoaderAlt } from "react-icons/bi";
import VoiceRecorder from "./VoiceRecorder";

export default function MessageInput({
  onSend,
  onTyping,
  disabled = false,
}: {
  onSend: (
    content: string,
    type?: string,
    fileUrl?: string,
    fileMime?: string,
  ) => void;
  onTyping: (isTyping: boolean) => void;
  /** Disable submission, e.g. while a previous send is still in flight, to
   *  prevent Enter/click double-fires from sending duplicate messages. */
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (text.trim()) {
      onSend(text, "text");
      setText("");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTyping(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    if (val.trim()) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    } else {
      onTyping(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.url) {
        const type = file.type.startsWith("image/") ? "image" : "file";
        onSend(file.name, type, json.url, file.type);
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="p-3 text-slate-500 hover:text-primary transition-all rounded-full hover:bg-slate-100 disabled:opacity-50"
      >
        {isUploading ? (
          <BiLoaderAlt className="animate-spin" size={24} />
        ) : (
          <BiImageAdd size={24} />
        )}
      </button>

      <textarea
        value={text}
        onChange={handleTextChange}
        placeholder="Type your message..."
        className="flex-1 bg-transparent resize-none outline-none py-3 px-2 max-h-32 text-slate-700"
        rows={1}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (text.trim()) handleSubmit(e);
          }
        }}
      />

      <VoiceRecorder onSend={onSend} />

      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="p-3 bg-primary text-white rounded-lg shadow-none shadow-primary/30 hover:bg-primary-600 disabled:opacity-40 disabled:shadow-none transition-all"
      >
        <BiPaperPlane size={20} />
      </button>
    </form>
  );
}
