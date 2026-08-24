import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Exactly one viewport tall — never more, never less. No vertical padding
    // on the container: the child centres itself with `my-auto`, which also
    // means that when a card is taller than the viewport the auto margins
    // collapse and it scrolls from the top instead of being clipped.
    <div className="h-screen relative flex flex-col items-center overflow-y-auto px-4 sm:px-10 xl:px-16 2xl:px-24 bg-cover bg-center bg-no-repeat bg-fixed bg-[url('/auth-wizard.jpg')]">
      {/* Dynamic Overlay for depth — fixed so it covers the viewport even
          while the content scrolls past it. */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-0"></div>
      <div className="fixed inset-0 bg-linear-to-tr from-slate-900/60 via-transparent to-primary/10 z-0"></div>

      <div className="relative z-10 w-full max-w-350 mx-auto my-auto py-8">
        {children}
      </div>
    </div>
  );
}
