import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getSupabaseConfig } from "@/lib/supabase-config";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: getSupabaseConfig() ? "/register" : "/setup", replace: true });
  }, [navigate]);
  return null;
}
