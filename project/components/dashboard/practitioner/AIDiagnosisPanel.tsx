"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, AlertTriangle, History, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import Input from "@/components/ui/Input";
import Dialog from "@/components/ui/Dialog";

interface SuggestedDiagnosis {
  condition: string;
  confidence: number;
  reasoning: string;
  redFlag: boolean;
}

interface DecisionRecord {
  _id: string;
  symptoms: string;
  suggestedDiagnoses: SuggestedDiagnosis[];
  recommendedTests: string[];
  riskScore: number;
  riskAssessment: string;
  status: "pending" | "accepted" | "dismissed";
  modelUsed: string;
  generatedAt: string;
}

const STATUS_BADGE = {
  pending: "warning",
  accepted: "success",
  dismissed: "neutral",
} as const;

export default function AIDiagnosisPanel({ patientId }: { patientId: string }) {
  const [symptoms, setSymptoms] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latest, setLatest] = useState<DecisionRecord | null>(null);
  const [history, setHistory] = useState<DecisionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [dismissTarget, setDismissTarget] = useState<string | null>(null);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/practitioner/patients/${patientId}/ai-diagnosis`);
      const json = await res.json();
      if (json.success) setHistory(json.data);
    } catch {
      /* silent */
    }
    setHistoryLoading(false);
  }, [patientId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSubmit = async () => {
    if (!symptoms.trim()) {
      toast.error("Describe the presenting symptoms first.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/practitioner/patients/${patientId}/ai-diagnosis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "AI diagnosis support failed");
      }
      setLatest(json.data);
      setHistory((prev) => [json.data, ...prev]);
      setSymptoms("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "AI diagnosis support failed");
    }
    setIsSubmitting(false);
  };

  const review = async (decisionId: string, status: "accepted" | "dismissed") => {
    setReviewBusyId(decisionId);
    try {
      const res = await fetch(
        `/api/practitioner/patients/${patientId}/ai-diagnosis/${decisionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      setHistory((prev) => prev.map((d) => (d._id === decisionId ? json.data : d)));
      if (latest?._id === decisionId) setLatest(json.data);
      toast.success(status === "accepted" ? "Marked as accepted" : "Dismissed");
    } catch {
      toast.error("Could not update — please try again.");
    }
    setReviewBusyId(null);
    setDismissTarget(null);
  };

  const renderDiagnosisCard = (record: DecisionRecord) => (
    <div key={record._id} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-600 italic">"{record.symptoms}"</p>
        <Badge label={record.status} status={STATUS_BADGE[record.status]} size="sm" />
      </div>
      <div className="space-y-2">
        {record.suggestedDiagnoses
          .slice()
          .sort((a, b) => (b.redFlag ? 1 : 0) - (a.redFlag ? 1 : 0))
          .map((d, i) => (
            <Card
              key={i}
              variant="outline"
              className={d.redFlag ? "border-danger-500/40 bg-danger-50" : undefined}
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {d.redFlag && <AlertTriangle size={16} className="text-danger-500 shrink-0" />}
                  <p className="text-sm font-bold text-ink-900 truncate">{d.condition}</p>
                </div>
                <Badge
                  label={`${d.confidence}% confidence`}
                  status={d.redFlag ? "error" : "neutral"}
                  size="sm"
                />
              </div>
              <p className="text-xs text-ink-600 leading-relaxed">{d.reasoning}</p>
            </Card>
          ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
        <Badge
          label={`Risk: ${record.riskScore}/100`}
          status={record.riskScore >= 60 ? "error" : record.riskScore >= 30 ? "warning" : "success"}
          size="sm"
        />
        <span>{record.riskAssessment}</span>
      </div>
      {record.recommendedTests.length > 0 && (
        <div>
          <p className="text-label text-ink-600 mb-1">Recommended tests</p>
          <div className="flex flex-wrap gap-1.5">
            {record.recommendedTests.map((t) => (
              <Badge key={t} label={t} status="info" size="sm" />
            ))}
          </div>
        </div>
      )}
      {record.status === "pending" && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            icon={<CheckCircle2 size={14} />}
            iconPosition="left"
            loading={reviewBusyId === record._id}
            onClick={() => review(record._id, "accepted")}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<XCircle size={14} />}
            iconPosition="left"
            onClick={() => setDismissTarget(record._id)}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Sparkles size={18} />
        </div>
        <div>
          <h3 className="text-h4 font-bold text-ink-900 font-grotesk">AI Diagnosis Support</h3>
          <p className="text-xs text-ink-600">Differential suggestions from Claude</p>
        </div>
      </div>

      <Alert status="info" title="AI-generated differential — verify independently before acting. Not a diagnosis." />

      <div className="space-y-3">
        <Input
          isTextArea
          rows={3}
          placeholder="Describe the presenting symptoms..."
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
        />
        <Button fullWidth loading={isSubmitting} onClick={handleSubmit}>
          Get Diagnosis Support
        </Button>
      </div>

      {latest && (
        <div className="pt-2 border-t border-border">{renderDiagnosisCard(latest)}</div>
      )}

      <div className="pt-2 border-t border-border">
        <div className="flex items-center gap-2 mb-3">
          <History size={16} className="text-ink-400" />
          <p className="text-label text-ink-600">History</p>
        </div>
        {historyLoading ? (
          <p className="text-xs text-ink-400">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-ink-400">No AI diagnosis checks yet for this patient.</p>
        ) : (
          <div className="space-y-5 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {history
              .filter((h) => h._id !== latest?._id)
              .map((h) => renderDiagnosisCard(h))}
          </div>
        )}
      </div>

      <Dialog
        isOpen={!!dismissTarget}
        onClose={() => setDismissTarget(null)}
        title="Dismiss this suggestion?"
        description="It stays in the history for audit purposes, just marked as dismissed."
        size="sm"
        onConfirm={() => dismissTarget && review(dismissTarget, "dismissed")}
        confirmLabel="Dismiss"
        confirmVariant="danger"
        confirmLoading={reviewBusyId === dismissTarget}
      />
    </Card>
  );
}
