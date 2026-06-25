"use client";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="h-screen w-full bg-slate-50 animate-pulse" />}
    >
      <LoginForm />
    </Suspense>
  );
}
