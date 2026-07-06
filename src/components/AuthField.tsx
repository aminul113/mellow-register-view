import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  isPassword?: boolean;
};

export function AuthField({ label, error, isPassword, id, ...rest }: Props) {
  const [show, setShow] = useState(false);
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1 lg:space-y-1.5">
      <label htmlFor={inputId} className="block text-xs lg:text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          {...rest}
          type={isPassword ? (show ? "text" : "password") : rest.type ?? "text"}
          className={`w-full rounded-lg border ${
            error ? "border-destructive" : "border-input"
          } bg-background px-3 py-2.5 lg:px-4 lg:py-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/15 placeholder:text-muted-foreground`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive animate-fade-in">{error}</p>}
    </div>
  );
}

export function AuthButton({
  children,
  loading,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className="w-full cursor-pointer rounded-lg bg-primary py-3 lg:py-3.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-[var(--primary-hover)] hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}