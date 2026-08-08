"use client";

import React, { useState, useEffect, useCallback } from "react";
import RiskScoreCard from "@/components/dashboard/practitioner/RiskScoreCard";
import SoapNoteModal from "@/components/dashboard/practitioner/SoapNoteModal";
import Badge, { type BadgeStatus } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Table, { type Column } from "@/components/ui/Table";
import Pagination from "@/components/ui/Pagination";
import PageHeader from "@/components/ui/PageHeader";
import {
  Video,
  MessageSquare,
  Stethoscope,
  FileEdit,
  User,
  Search,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface QueueItem {
  consultationId: string;
  patientId: string;
  patientName: string;
  initials: string;
  avatarUrl?: string;
  scheduledStart: string;
  scheduledEnd: string;
  reason: string;
  riskScore: number;
  riskColor: "green" | "gray" | "orange" | "red";
  riskFactors: string[];
  aiRecommendations: string[];
  status: string;
  type: string;
  medicalHistory?: string[];
  allergies?: string[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const typeIcon = (type: string) => {
  if (type === "video") return <Video className="text-trust-blue" size={14} />;
  if (type === "chat") return <MessageSquare className="text-supportive-teal" size={14} />;
  return <Stethoscope className="text-slate-500" size={14} />;
};

function minutesUntil(dt: string) {
  return Math.round((new Date(dt).getTime() - Date.now()) / 60000);
}

const statusMap: Record<string, BadgeStatus> = {
  scheduled: "neutral",
  ongoing: "success",
  completed: "info",
  cancelled: "error",
};

const FILTERS: { value: string; label: string }[] = [
  { value: "scheduled,ongoing", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function FullQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("scheduled,ongoing");
  const [soapModal, setSoapModal] = useState({
    isOpen: false,
    consultationId: "",
    patientName: "",
  });

  const fetchQueue = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/practitioner/queue?status=${statusFilter}&page=${page}&limit=15`,
        );
        const data = await res.json();
        if (data.success) {
          setQueue(data.data.queue);
          setPagination(data.data.pagination);
        }
      } catch (err) {
        console.error("Queue fetch error", err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    fetchQueue(1);
  }, [fetchQueue]);

  const filtered = queue.filter(
    (q) =>
      search === "" ||
      q.patientName.toLowerCase().includes(search.toLowerCase()) ||
      q.reason.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: Column<QueueItem>[] = [
    {
      key: "patient",
      header: "Patient",
      isTitle: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-trust-blue to-supportive-teal flex items-center justify-center text-white text-xs font-bold shrink-0">
            {item.initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink-900 truncate">{item.patientName}</p>
            <Badge label={item.status} status={statusMap[item.status] ?? "neutral"} size="sm" />
          </div>
        </div>
      ),
    },
    {
      key: "time",
      header: "Time",
      render: (item) => {
        const mins = minutesUntil(item.scheduledStart);
        return (
          <div>
            <p className="text-xs font-bold text-ink-900">
              {new Date(item.scheduledStart).toLocaleTimeString("en-ZA", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-xs text-slate-500">
              {new Date(item.scheduledStart).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "short",
              })}
            </p>
            {mins > 0 && mins < 60 && (
              <p className={`text-xs font-bold flex items-center gap-0.5 ${mins <= 10 ? "text-danger-500" : "text-slate-500"}`}>
                <Clock size={10} />
                in {mins}m
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "reason",
      header: "Reason",
      render: (item) => {
        const isUrgent = item.riskScore > 70;
        return (
          <div>
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.reason}</p>
            {isUrgent && item.aiRecommendations[0] && (
              <p className="text-xs text-danger-500 font-semibold mt-0.5 flex items-center gap-1">
                <AlertTriangle size={10} />
                {item.aiRecommendations[0]}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      render: (item) => (
        <div className="flex items-center gap-1.5">
          {typeIcon(item.type)}
          <span className="text-xs text-slate-500 capitalize">{item.type}</span>
        </div>
      ),
    },
    {
      key: "risk",
      header: "Risk",
      render: (item) => (
        <RiskScoreCard score={item.riskScore} color={item.riskColor} factors={item.riskFactors} size="sm" showRing={false} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            className={`p-2.5 rounded-lg text-white transition-all active:scale-95 ${
              item.type === "chat" ? "bg-supportive-teal hover:brightness-95" : "bg-trust-blue hover:brightness-95"
            }`}
            title={item.type === "chat" ? "Join Chat" : "Join Video"}
          >
            {item.type === "chat" ? <MessageSquare size={14} /> : <Video size={14} />}
          </button>
          <button
            onClick={() =>
              setSoapModal({
                isOpen: true,
                consultationId: item.consultationId,
                patientName: item.patientName,
              })
            }
            className="p-2.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 transition-all active:scale-95 border border-violet-100"
            title="SOAP Note"
          >
            <FileEdit size={14} />
          </button>
          <button
            className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95"
            title="Patient Profile"
          >
            <User size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Patient Queue"
          subtitle={`${pagination.total} consultations · Page ${pagination.page} of ${pagination.totalPages}`}
          right={
            <Button
              variant="white"
              size="sm"
              onClick={() => fetchQueue(pagination.page)}
              icon={<RefreshCw size={16} />}
              iconPosition="left"
            >
              Refresh
            </Button>
          }
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients or reasons…"
              icon={<Search size={16} />}
            />
          </div>
          <div className="flex items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === f.value
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <Table
          columns={columns}
          data={filtered}
          keyField="consultationId"
          loading={loading}
          emptyTitle="No consultations found"
          emptyDescription="Try changing filters or refreshing."
        />

        <div className="flex justify-center">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onChange={(p) => fetchQueue(p)}
          />
        </div>
      </div>

      <SoapNoteModal
        isOpen={soapModal.isOpen}
        onClose={() =>
          setSoapModal({ isOpen: false, consultationId: "", patientName: "" })
        }
        consultationId={soapModal.consultationId}
        patientName={soapModal.patientName}
      />
    </>
  );
}
