import { DashboardData } from "@/components/dashboard/practitioner/overview";
import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";

export function usePractitionerDashboard() {
  const [data, setData] = useState<DashboardData>({
    upcomingCount: 0,
    queue: [],
    pendingRequests: [],
    riskAlerts: [],
    chartData: [],
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/practitioner/dashboard");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text.substring(0, 100)}`);
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRequestAction = useCallback(
    async (id: string, newStatus: "scheduled" | "cancelled") => {
      setActionLoading(id);
      const toastId = toast.loading(
        newStatus === "scheduled" ? "Accepting request..." : "Declining request..."
      );
      try {
        const res = await fetch(`/api/practitioner/consultations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success(
            `Request ${newStatus === "scheduled" ? "Accepted" : "Declined"}!`,
            { id: toastId }
          );
          // Optimistically remove from pending
          setData((prev) => ({
            ...prev,
            pendingRequests: prev.pendingRequests.filter(
              (req) => req.consultationId !== id
            ),
          }));
        } else {
          toast.error(json.error || "Failed to process", { id: toastId });
        }
      } catch {
        toast.error("Network error", { id: toastId });
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  return {
    data,
    loading,
    actionLoading,
    handleRequestAction,
    refetch: fetchDashboard,
  };
}