import Link from "next/link";
import AuthForm from "@/app/components/auth/AuthForm";

export const metadata = {
  title: "Sign Up - Dugout",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Dugout</h1>
          <p className="text-[var(--text-secondary)] mt-2">Create your account</p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
          <AuthForm mode="signup" />
        </div>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--green)] font-medium hover:text-[var(--green)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
