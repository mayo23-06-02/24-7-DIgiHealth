import React, { useEffect, useRef } from "react";
import {
  BiCheck,
  BiCheckDouble,
  BiDownload,
  BiFileBlank,
  BiPhoneCall,
} from "react-icons/bi";

export default function MessageBubble({
  message,
  isOwn,
  onSeen,
}: {
  message: any;
  isOwn: boolean;
  onSeen: () => void;
}) {
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bubbleRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onSeen();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(bubbleRef.current);
    return () => observer.disconnect();
  }, [onSeen]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      ref={bubbleRef}
      className={`flex flex-col ${isOwn ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${isOwn ? "bg-primary text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-none"}`}
      >
        {message.type === "audio" && (
          <audio controls src={message.fileUrl} className="w-48 h-10" />
        )}

        {message.type === "image" && (
          <img
            src={message.fileUrl}
            alt="attachment"
            className="rounded-xl max-w-full h-auto mb-2"
          />
        )}

        {message.type === "file" && (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="underline font-bold"
          >
            Download File
          </a>
        )}

        {/* Quick phrase badge styling */}
        {message.type === "quick_phrase" && (
          <span className="text-xs  font-bold opacity-50 block mb-1">
            Quick Phrase
          </span>
        )}

        {/* Record Attachment Styling */}
        {message.type === "record_attachment" && (
          <div
            className={`mb-2 p-3 rounded-xl border ${isOwn ? "bg-primary-600 border-primary-400" : "bg-slate-50 border-slate-200"} flex items-start gap-3 w-64`}
          >
            <div
              className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center ${isOwn ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}
            >
              <BiFileBlank size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs font-bold leading-tight ${isOwn ? "text-white" : "text-slate-800"}`}
              >
                Clinical Record Attached
              </p>
              <p
                className={`text-xs mt-1 ${isOwn ? "text-primary-100" : "text-slate-500"} line-clamp-2`}
              >
                {message.content}
              </p>
            </div>
          </div>
        )}

        {message.type === "call_log" && (
          <div className="flex items-center gap-2 py-1">
            <BiPhoneCall
              size={18}
              className={isOwn ? "text-white/80" : "text-slate-500"}
            />
            <p className="text-sm font-semibold">{message.content}</p>
          </div>
        )}

        {message.type !== "record_attachment" &&
          message.type !== "call_log" && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}

        {message.type === "record_attachment" && (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center justify-center gap-1.5 mt-2 py-2 rounded-lg text-xs font-bold border transition-colors
                   ${
                     isOwn
                       ? "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                       : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                   }`}
          >
            <BiDownload size={14} /> Download File
          </a>
        )}

        <div
          className={`flex items-center justify-end gap-1 mt-1 text-xs ${isOwn ? "text-primary-100" : "text-slate-500"}`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isOwn &&
            (message.isRead ? (
              <BiCheckDouble size={14} className="text-blue-300" />
            ) : (
              <BiCheck size={14} />
            ))}
        </div>
      </div>
    </div>
  );
}
