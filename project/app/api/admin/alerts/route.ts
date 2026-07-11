import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requirePlatformAdmin } from "@/lib/auth/admin";
import { buildPlatformOverview } from "@/lib/admin/buildPlatformOverview";

export const runtime = "nodejs";

/** Alerts derived from platform intelligence + payout backlog */
export async function GET() {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();
    const overview = await buildPlatformOverview(30);

    const alerts = overview.intelligence.map((i) => ({
      id: i.id,
      severity: i.severity,
      title: i.title,
      detail: i.detail,
      metric: i.metric,
      source: "system",
      createdAt: overview.generatedAt,
    }));

    // Payout items as discrete alerts
    for (const p of overview.pendingPayoutsList.slice(0, 10)) {
      alerts.push({
        id: `payout-${p.id}`,
        severity: "warning" as const,
        title: "Pending payout request",
        detail: `Payout of R ${p.amount.toLocaleString("en-ZA")} awaiting review.`,
        metric: p.status,
        source: "billing",
        createdAt: p.requestedAt,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        system: overview.system,
        counts: {
          critical: alerts.filter((a) => a.severity === "critical").length,
          warning: alerts.filter((a) => a.severity === "warning").length,
          info: alerts.filter((a) => a.severity === "info").length,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
