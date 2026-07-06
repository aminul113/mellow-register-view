import type { ReactNode } from "react";
import illustration from "@/assets/pan-illustration.jpg.asset.json";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-full overflow-hidden bg-background flex flex-col lg:grid lg:grid-cols-2">
      {/* Left panel */}
      <div className="relative flex items-center justify-center bg-primary text-primary-foreground px-6 py-4 lg:p-10 h-52 lg:h-full shrink-0 lg:shrink">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white/5 blur-3xl" />

        <div className="relative w-full max-w-[300px] lg:max-w-xl aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10 bg-white/95 transition-transform duration-500 hover:scale-[1.01] animate-scale-in">
          <img
            src={illustration.url}
            alt="PANME SHOP PAN card application"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-5 py-5 lg:px-16 lg:py-10 overflow-hidden">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </div>
    </div>
  );
}