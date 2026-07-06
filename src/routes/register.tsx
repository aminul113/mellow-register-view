import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AuthLayout } from "@/components/AuthLayout";
import { AuthField, AuthButton } from "@/components/AuthField";
import { registerAccount } from "@/lib/auth-store";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — PANME SHOP" },
      { name: "description", content: "Register a new PANME SHOP account to trace your PAN card instantly." },
    ],
  }),
  component: RegisterPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(160),
  password: z.string().min(6, "Password must be at least 6 characters").max(120),
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      await registerAccount(parsed.data.name, parsed.data.email, parsed.data.password);
      navigate({ to: "/app" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-xl lg:text-2xl font-bold text-foreground">Register new account</h2>
      <p className="mt-1 text-sm text-muted-foreground">Get started in seconds — it's free.</p>

      <form onSubmit={onSubmit} className="mt-6 lg:mt-8 space-y-4 lg:space-y-5">
        <AuthField
          label="Name"
          placeholder="Enter Your Name"
          value={form.name}
          onChange={update("name")}
          error={errors.name}
          autoComplete="name"
        />
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
          placeholder="Create a password"
          value={form.password}
          onChange={update("password")}
          error={errors.password}
          isPassword
          autoComplete="new-password"
        />

        <AuthButton type="submit" loading={loading}>Register</AuthButton>
        {formError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}
      </form>

      <p className="mt-5 lg:mt-6 text-center text-sm text-muted-foreground">
        Have an account?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline underline-offset-4">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}