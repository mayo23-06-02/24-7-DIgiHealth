/**
 * Client helper — download billing invoice / receipt / report PDFs.
 */
"use client";

export type BillingExportType = "receipt" | "invoice" | "report";

export async function downloadBillingPdf(
  body: {
    type: BillingExportType;
    transactionId?: string;
    reportKind?: "statement" | "payouts" | "full";
  },
  fallbackName = "billing.pdf",
): Promise<void> {
  const res = await fetch("/api/billing/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = "Failed to download PDF";
    try {
      const json = await res.json();
      message = json.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const match = cd.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || fallbackName;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
