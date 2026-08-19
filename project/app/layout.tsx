import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import AuthProvider from "@/components/AuthProvider";
import NavigationProgressProvider from "@/components/providers/NavigationProgressProvider";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "24/7 DigiHealth | Advanced Telehealth Ecosystem for South Africa",
  description:
    "A scalable, role-based medical platform bridging the gap in South African healthcare through AI triage, virtual consultations, and emergency routing.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${grotesk.variable} ${outfit.variable} antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="font-outfit">
        {/* Mounted at the root so the bar also covers the (auth) group, which
            has no client boundary of its own, and the slow login -> dashboard
            transition. */}
        <NavigationProgressProvider>
          <AuthProvider>{children}</AuthProvider>
        </NavigationProgressProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#fff",
              color: "#0A0A2E",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: 600,
              boxShadow:
                "0 12px 32px rgb(0 0 0 / 0.12), 0 1px 3px rgb(0 0 0 / 0.08)",
              border: "1px solid #E2E8F0",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#fff" },
              style: { border: "1px solid #10b98133" },
            },
            error: {
              iconTheme: { primary: "#dc2626", secondary: "#fff" },
              style: { border: "1px solid #dc262633" },
            },
          }}
        />
      </body>
    </html>
  );
}
