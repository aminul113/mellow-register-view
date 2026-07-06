import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Phone, Mail } from "lucide-react";
import { getSettings, type AppSettings } from "@/lib/data-store";

export const Route = createFileRoute("/app/support")({
  component: SupportPage,
});

function SupportPage() {
  const [s, setS] = useState<AppSettings | null>(null);
  useEffect(() => { getSettings().then(setS); }, []);
  const has = s && (s.support_phone || s.support_whatsapp || s.support_email);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Support</h1>
        <p className="text-sm text-muted-foreground">Get in touch with our team.</p>
      </div>

      {!has ? (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          Support contacts are not set yet. The admin can configure them from Admin → Settings.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {s!.support_whatsapp && (
            <a href={`https://wa.me/${s!.support_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
               className="rounded-2xl border bg-card p-5 hover:-translate-y-0.5 hover:shadow-md transition">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm text-muted-foreground">WhatsApp</div>
              <div className="font-semibold">{s!.support_whatsapp}</div>
            </a>
          )}
          {s!.support_phone && (
            <a href={`tel:${s!.support_phone}`} className="rounded-2xl border bg-card p-5 hover:-translate-y-0.5 hover:shadow-md transition">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Phone className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm text-muted-foreground">Call</div>
              <div className="font-semibold">{s!.support_phone}</div>
            </a>
          )}
          {s!.support_email && (
            <a href={`mailto:${s!.support_email}`} className="rounded-2xl border bg-card p-5 hover:-translate-y-0.5 hover:shadow-md transition">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700">
                <Mail className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm text-muted-foreground">Email</div>
              <div className="font-semibold break-all">{s!.support_email}</div>
            </a>
          )}
        </div>
      )}
    </div>
  );
}