import type { Metadata } from "next";
import { AuthCard } from "./auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthCard title="Ghee Audit Tracker">
      <LoginForm />
    </AuthCard>
  );
}
