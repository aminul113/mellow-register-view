import { requireSupabase, getSupabase } from "./supabase-config";

export type Account = { name: string; email: string };

export async function registerAccount(name: string, email: string, password: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function loginAccount(email: string, password: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function logout() {
  const supabase = getSupabase();
  if (supabase) await supabase.auth.signOut();
}

export async function getCurrentAccount(): Promise<Account | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const name =
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "there";
  return { name, email: user.email ?? "" };
}