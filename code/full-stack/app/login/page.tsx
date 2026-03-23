"use client";

import { FormEvent, useState } from "react";

type FormState = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const [form, setForm] = useState<FormState>({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function validate(): string | null {
    if (!form.email.trim()) {
      return "Email is required.";
    }

    if (!form.password) {
      return "Password is required.";
    }

    if (form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      setMessage("Login UI is ready. Next step is wiring this form to your auth backend.");
    } catch (submitError) {
      setError((submitError as Error).message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-16">
        <h1 className="text-2xl font-semibold">User Login</h1>
        <p className="text-sm">Sign in to access the inventory system.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border p-4">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
            className="rounded-md border px-3 py-2"
            placeholder="name@wsu.edu"
          />

          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
            className="rounded-md border px-3 py-2"
            placeholder="Enter your password"
          />

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
        </form>

        <a className="w-fit text-sm underline" href="/register">
          Create new user
        </a>
      </main>
    </div>
  );
}
