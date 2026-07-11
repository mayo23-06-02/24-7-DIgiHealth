"use client";

import React from "react";
import {
  Brain,
  Calendar,
  CheckCircle,
  Download,
  FileText,
  FlaskConical as Lab,
  Pill,
  Syringe,
  User as UserIcon,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatHealthDate, type TimelineEvent } from "./types";

interface TimelineTabProps {
  events: TimelineEvent[];
  onOpenMedsTab: () => void;
}

function getIcon(type: string) {
  switch (type) {
    case "consultation":
      return <Calendar className="text-primary" size={24} />;
    case "medication":
      return <Pill className="text-primary" size={24} />;
    case "lab":
      return <Lab className="text-primary" size={24} />;
    case "immunization":
      return <Syringe className="text-primary" size={24} />;
    case "ai_triage":
      return <Brain className="text-primary" size={24} />;
    default:
      return <FileText size={24} />;
  }
}

export default function TimelineTab({
  events,
  onOpenMedsTab,
}: TimelineTabProps) {
  if (events.length === 0) {
    return (
      <Card className="space-y-6 animate-dissolve">
        <div className="text-center py-10 text-slate-500">
          No events found in your medical history.
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-6 animate-dissolve">
      {events.map((event, idx) => (
        <div key={event.id} className="relative group">
          {idx !== events.length - 1 && (
            <div className="absolute left-7 top-10 bottom-0 w-[0.5px] bg-slate-200" />
          )}
          <div className="absolute left-3 top-3 flex items-center gap-2 z-10">
            <p className="text-primary w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center">
              {getIcon(event.type)}
            </p>
            <div className="bg-slate-100 px-3 py-1 rounded-full text-slate-500">
              <p className="whitespace-nowrap font-bold text-xs tracking-normal">
                {event.type.replace("_", " ")}
              </p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg pl-12 pr-6 pt-8 pb-6 hover:border-primary/20 transition-all">
            <div className="flex justify-end items-start mb-2">
              <span className="text-xs font-medium text-slate-500">
                {formatHealthDate(event.date)}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1 font-grotesk">
              {event.title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              {event.description}
            </p>
            {event.metadata && (
              <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-50">
                {event.metadata.doctor && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <UserIcon size={14} className="text-primary" />
                    <span>{event.metadata.doctor}</span>
                  </div>
                )}
                {event.metadata.status && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle size={14} className="text-green-500" />
                    <span>{event.metadata.status}</span>
                  </div>
                )}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              {event.type === "medication" && event.metadata?.documentUrl ? (
                <a
                  href={event.metadata.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={event.metadata.documentName || undefined}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  <Download size={16} /> Download pharmacy script
                </a>
              ) : null}
              {event.type === "medication" ? (
                <button
                  type="button"
                  onClick={onOpenMedsTab}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors"
                >
                  <Pill size={16} /> Open Meds tab
                </button>
              ) : (
                <Button
                  variant="ghost"
                  className="!p-0 !min-w-0 !h-auto text-xs font-bold text-primary flex items-center gap-1.5 hover:underline bg-transparent"
                >
                  <FileText size={16} /> View Details
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}
