"use client";

import React, { useState } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
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
  const [page, setPage] = useState(1);
  const itemsPerPageSm = 6;
  const itemsPerPageLg = 8;

  if (events.length === 0) {
    return (
      <Card className="space-y-6 animate-dissolve">
        <div className="text-center py-10 text-slate-500">
          No events found in your medical history.
        </div>
      </Card>
    );
  }

  const totalPagesSm = Math.ceil(events.length / itemsPerPageSm);
  const totalPagesLg = Math.ceil(events.length / itemsPerPageLg);
  const totalPages = totalPagesLg;

  const startIndexSm = (page - 1) * itemsPerPageSm;
  const startIndexLg = (page - 1) * itemsPerPageLg;
  const endIndexSm = startIndexSm + itemsPerPageSm;
  const endIndexLg = startIndexLg + itemsPerPageLg;

  const displayEventsSm = events.slice(startIndexSm, endIndexSm);
  const displayEventsLg = events.slice(startIndexLg, endIndexLg);

  const handlePrevPage = () => {
    setPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setPage((p) => Math.min(totalPages, p + 1));
  };

  return (
    <div className=" animate-dissolve">
      <div className="hidden lg:block lg:space-y-6 space-y-4">
        {displayEventsLg.map((event, idx) => (
          <div key={event.id} className="relative group">
            {idx !== displayEventsLg.length - 1 && (
              <div className="absolute left-7 top-10 bottom-0 w-[0.5px] bg-slate-200" />
            )}
            <div className="absolute left-3 top-3 flex items-center gap-2 z-10">
              <p className="text-primary w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center">
                {getIcon(event.type)}
              </p>
              <Badge
                label={event.type.replace("_", " ")}
                status="neutral"
                size="sm"
              />
            </div>
            <div className="bg-white border border-slate-200 rounded-lg pl-12 pr-6 pt-8 hover:border-primary/20 transition-all">
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
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="lg:hidden lg:space-y-6 space-y-2">
        {displayEventsSm.map((event, idx) => (
          <div key={event.id} className="relative group">
            {idx !== displayEventsSm.length - 1 && (
              <div className="absolute left-7 top-10 bottom-0 w-[0.5px] bg-slate-200" />
            )}
            <div className="absolute left-3 top-3 flex items-center gap-2 z-10">
              <p className="text-primary w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center">
                {getIcon(event.type)}
              </p>
              <Badge
                label={event.type.replace("_", " ")}
                status="neutral"
                size="sm"
              />
            </div>
            <div className="bg-white border border-slate-200 rounded-lg pl-12 pr-6 pt-8 hover:border-primary/20 transition-all">
              <div className="flex justify-end items-start mb-2">
                <span className="text-xs font-medium text-slate-500">
                  {formatHealthDate(event.date)}
                </span>
              </div>
              <h3 className=" font-bold text-slate-800 mb-1 font-grotesk">
                {event.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                {event.description}
              </p>

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
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={page === 1}
              aria-label="Previous page"
              className="w-10 h-10 rounded-lg border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  aria-label={`Page ${pageNum}`}
                  aria-current={pageNum === page ? "page" : undefined}
                  className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${
                    pageNum === page ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={handleNextPage}
              disabled={page === totalPages}
              aria-label="Next page"
              className="w-10 h-10 rounded-lg border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
