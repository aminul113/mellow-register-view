import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AuthLayout } from "@/components/AuthLayout";
import { AuthField, AuthButton } from "@/components/AuthField";
import { loginAccount } from "@/lib/auth-store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — PANME SHOP" },
      { name: "description", content: "Sign in to your PANME SHOP account." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await loginAccount(parsed.data.email, parsed.data.password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-xl lg:text-2xl font-bold text-foreground">Login to your account</h2>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back — enter your details.</p>

      <form onSubmit={onSubmit} className="mt-6 lg:mt-8 space-y-4 lg:space-y-5">
        <AuthField
          label="Email"
          type="email"
          placeholder="Enter Email"
          value={form.email}
          onChange={update("email")}
          error={errors.email}
          autoComplete="email"
        />
        <AuthField
          label="Password"
          placeholder="Enter password"
          value={form.password}
          onChange={update("password")}
          error={errors.password}
          isPassword
          autoComplete="current-password"
        />

        {formError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive animate-fade-in">
            {formError}
          </div>
        )}

        <AuthButton type="submit" loading={loading}>Login</AuthButton>
      </form>

      <p className="mt-5 lg:mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/register" className="font-semibold text-primary hover:underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}