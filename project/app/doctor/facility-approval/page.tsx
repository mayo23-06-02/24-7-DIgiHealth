"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  CheckCircle2,
  XCircle,
  Building2,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface ApprovalRequest {
  _id: string;
  facilityId: string;
  facilityName: string;
  requestedBy: string;
  requestedByName: string;
  department: string;
  shiftStart: string;
  shiftEnd: string;
  hourlyRate: number;
  expiresAt: string;
}

export default function FacilityApprovalPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid approval link");
      setLoading(false);
      return;
    }

    const fetchRequest = async () => {
      try {
        const res = await fetch(`/api/hospital/staff/approval/verify?token=${token}`);
        const json = await res.json();
        if (json.success) {
          setRequest(json.data);
        } else {
          setError(json.error || "Failed to load approval request");
        }
      } catch (e) {
        setError("An error occurred while loading the request");
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [token]);

  const handleApprove = async () => {
    if (!request) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/hospital/staff/approval/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "approve" }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
      } else {
        setError(json.error || "Failed to approve request");
      }
    } catch (e) {
      setError("An error occurred while approving the request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    if (!window.confirm("Are you sure you want to reject this facility link request?")) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/hospital/staff/approval/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "reject" }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
      } else {
        setError(json.error || "Failed to reject request");
      }
    } catch (e) {
      setError("An error occurred while rejecting the request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-600">Loading approval request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-danger-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-ink-900 mb-2">Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button onClick={() => (window.location.href = "/practitioner")}>
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-success-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-ink-900 mb-2">
            {request?.department ? "Request Processed" : "Request Processed"}
          </h2>
          <p className="text-slate-600 mb-6">
            Your response has been recorded. You can now return to your dashboard.
          </p>
          <Button onClick={() => (window.location.href = "/practitioner")}>
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  const isExpired = new Date(request.expiresAt) < new Date();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-lg w-full">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink-900">Facility Link Request</h1>
              <p className="text-sm text-slate-500">Review and respond</p>
            </div>
          </div>

          {isExpired && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-danger-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-danger-700">Request Expired</p>
                <p className="text-sm text-danger-600">
                  This approval request has expired. Please contact the facility administrator to send a new request.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Facility</p>
              <p className="text-base font-medium text-ink-900">{request.facilityName}</p>
            </div>

            {request.department && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Department</p>
                <Badge label={request.department} status="neutral" size="sm" />
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Requested by</p>
              <p className="text-base text-slate-700">{request.requestedByName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Shift Start</p>
                <p className="text-base text-slate-700">{request.shiftStart}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Shift End</p>
                <p className="text-base text-slate-700">{request.shiftEnd}</p>
              </div>
            </div>

            {request.hourlyRate > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Hourly Rate</p>
                <p className="text-base text-slate-700">R{request.hourlyRate}/hour</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>
                Expires {isExpired ? "expired" : "in"}{" "}
                {new Date(request.expiresAt).toLocaleString()}
              </span>
            </div>
          </div>

          {!isExpired && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={handleReject}
                loading={submitting}
                className="flex items-center gap-2"
              >
                <XCircle size={16} />
                Reject
              </Button>
              <Button
                fullWidth
                onClick={handleApprove}
                loading={submitting}
                className="flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                Approve & Join
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
