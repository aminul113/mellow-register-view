const KEY = "panme_account";
const SESSION = "panme_session";

export type Account = { name: string; email: string; password: string };

export function saveAccount(a: Account) {
  localStorage.setItem(KEY, JSON.stringify(a));
  localStorage.setItem(SESSION, a.email);
}

export function getAccount(): Account | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    return null;
  }
}

export function login(email: string, password: string): Account | null {
  const a = getAccount();
  if (a && a.email.toLowerCase() === email.toLowerCase() && a.password === password) {
    localStorage.setItem(SESSION, a.email);
    return a;
  }
  return null;
}

export function currentSessionEmail(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(SESSION) : null;
}

export function logout() {
  localStorage.removeItem(SESSION);
}