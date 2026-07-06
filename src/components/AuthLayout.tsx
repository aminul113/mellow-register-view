import type { ReactNode } from "react";
import illustration from "@/assets/pan-illustration.jpg.asset.json";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-full overflow-hidden bg-background flex flex-col lg:grid lg:grid-cols-2">
      {/* Left panel */}
      <div className="relative flex items-center justify-center bg-primary px-6 py-4 lg:p-10 h-52 lg:h-full shrink-0 lg:shrink overflow-hidden">
        {/* Decorative dot pattern - left */}
        <div
          className="absolute left-4 lg:left-10 top-1/4 w-16 lg:w-24 h-24 lg:h-32 opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle, var(--color-left-dot) 2px, transparent 2px)",
            backgroundSize: "12px 12px",
          }}
        />
        {/* Decorative dot pattern - right */}
        <div
          className="absolute right-4 lg:right-10 top-1/3 w-16 lg:w-24 h-24 lg:h-32 opacity-30"
          style={{
            backgroundImage: "radial-gradient(circle, var(--color-left-dot) 2px, transparent 2px)",
            backgroundSize: "12px 12px",
          }}
        />
        {/* Soft blob behind illustration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] lg:w-[520px] lg:h-[520px] rounded-full bg-left-blob/40 blur-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] lg:w-[420px] lg:h-[420px] rounded-full bg-left-blob/30" />

        <div className="relative w-full max-w-[300px] lg:max-w-xl aspect-[4/3] rounded-[2rem] overflow-hidden shadow-xl ring-1 ring-border/10 bg-white transition-transform duration-500 hover:scale-[1.01] animate-scale-in">
          <img
            src={illustration.url}
            alt="PANME SHOP PAN card application"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-5 py-5 lg:px-16 lg:py-10 overflow-hidden bg-background">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </div>
    </div>
  );
}