"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto max-w-md rounded-2xl bg-offwhite p-8 ring-1 ring-ink/5"
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-ink text-offwhite">
        <LockKeyhole className="size-6" />
      </div>
      <h1 className="mt-5 text-center text-3xl font-semibold text-ink">
        Hello, Travis.
      </h1>
      <p className="mt-2 text-center text-sm text-ink-muted">
        Sign in to manage today's appointments.
      </p>

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            className="mt-2 h-12 w-full rounded-md border border-input bg-background px-4 text-ink outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="mt-2 h-12 w-full rounded-md border border-input bg-background px-4 text-ink outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={loading} className="mt-6 w-full">
        {loading && <Loader2 className="size-4 animate-spin" />}
        Sign In
      </Button>
    </form>
  );
}
