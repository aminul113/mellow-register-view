import type { ReactNode } from "react";
import illustration from "@/assets/pan-illustration.jpg.asset.json";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background lg:grid lg:grid-cols-2">
      {/* Left panel */}
      <div className="relative overflow-hidden bg-primary text-primary-foreground px-8 py-12 lg:px-14 lg:py-16 flex flex-col">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white/5 blur-3xl" />

        <div className="relative animate-fade-in">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl leading-tight text-white"
            style={{ fontFamily: "Caveat, cursive" }}
          >
            Lost your PAN card?
            <br />
            Find it instantly.
          </h1>
          <p className="mt-3 text-white/80 text-base md:text-lg">Trace the truth.</p>
        </div>

        <div className="relative mt-8 flex-1 flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-white/95 transition-transform duration-500 hover:scale-[1.02] animate-scale-in">
            <img
              src={illustration.url}
              alt="PANME SHOP PAN card application"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>

        <div className="relative mt-8 text-xs text-white/60">
          © {new Date().getFullYear()} PANME SHOP · We ensure your data is safe and secure
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </div>
    </div>
  );
}