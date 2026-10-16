"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login, register, saveAuth } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const result = mode === "register" ? await register({ name, email, password }) : await login({ email, password });
      saveAuth(result); window.dispatchEvent(new Event("event-auth-changed"));
      router.replace(result.user.role === "admin" ? "/admin" : "/events");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to authenticate."); }
    finally { setBusy(false); }
  }

  return <div className="container section narrow">
    <p className="eyebrow">EVENTIFY ACCOUNT</p>
    <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
    <p className="muted">{mode === "login" ? "Sign in to reserve seats and manage bookings." : "Register as a customer. Administrator access is configured on the server."}</p>
    <form className="form-card" onSubmit={submit}>
      {mode === "register" && <label>Full name<input required minLength={2} maxLength={255} value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></label>}
      <label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
      <label>Password<input required minLength={mode === "register" ? 10 : 1} maxLength={128} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} /></label>
      {error && <div className="error-box">{error}</div>}
      <button className="button primary full" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</button>
    </form>
    <p className="muted">{mode === "login" ? "New here? " : "Already registered? "}<button type="button" className="text-button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></p>
    <p><Link href="/events">Browse events without signing in</Link></p>
  </div>;
}
