"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches errors thrown by the root layout itself.
 * It replaces the whole document, so it must render its own <html>/<body>
 * and cannot rely on globals.css being applied.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
          fontFamily:
            "Outfit, ui-sans-serif, system-ui, -apple-system, sans-serif",
          background: "#F1F5F9",
          color: "#0A0A2E",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: "#64748B", maxWidth: 420, margin: 0 }}>
          The application ran into an unexpected problem. Reloading usually
          fixes it.
        </p>
        {error.digest && (
          <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>
            Reference: {error.digest}
          </p>
        )}
        <button
          onClick={() => reset()}
          style={{
            marginTop: 8,
            padding: "12px 28px",
            borderRadius: 9999,
            border: "none",
            background: "#4493b8",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
