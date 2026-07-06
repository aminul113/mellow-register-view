import type { ReactNode } from "react";
import illustration from "@/assets/pan-illustration.jpg.asset.json";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-full overflow-hidden bg-background lg:grid lg:grid-cols-2">
      {/* Left panel */}
      <div className="relative overflow-hidden bg-primary text-primary-foreground p-6 lg:p-8 flex flex-col h-full">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex-1 flex items-center justify-center min-h-0">
          <div className="w-full h-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-white/95 transition-transform duration-500 hover:scale-[1.01] animate-scale-in">
            <img
              src={illustration.url}
              alt="PANME SHOP PAN card application"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="relative mt-4 text-xs text-white/60 text-center">
          © {new Date().getFullYear()} PANME SHOP · We ensure your data is safe and secure
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center px-6 py-8 lg:px-16 h-full overflow-y-auto">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </div>
    </div>
  );
}