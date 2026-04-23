import type { Metadata } from "next";
import { Space_Grotesk, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

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
  description: "A scalable, role-based medical platform bridging the gap in South African healthcare through AI triage, virtual consultations, and emergency routing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${grotesk.variable} ${outfit.variable} antialiased`}>
      <body className="font-outfit">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
