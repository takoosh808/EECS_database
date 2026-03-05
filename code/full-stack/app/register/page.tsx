"use client";

import { FormEvent, useState } from "react";

type FormState = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function validate(): string | null {
    if (!form.fullName.trim()) {
      return "Full name is required.";
    }

    if (!form.email.trim()) {
      return "Email is required.";
    }

    if (!form.password) {
      return "Password is required.";
    }

    if (form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (form.password !== form.confirmPassword) {
      return "Passwords do not match.";
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
      setMessage("Create-user UI is ready. Next step is wiring this form to your user API.");
    } catch (submitError) {
      setError((submitError as Error).message || "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-16">
        <h1 className="text-2xl font-semibold">Create New User</h1>
        <p className="text-sm">Create an account for a new user.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border p-4">
          <label htmlFor="fullName" className="text-sm font-medium">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={form.fullName}
            onChange={(event) => setForm((previous) => ({ ...previous, fullName: event.target.value }))}
            className="rounded-md border px-3 py-2"
            placeholder="Jane Doe"
          />

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
            placeholder="Create a password"
          />

          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, confirmPassword: event.target.value }))
            }
            className="rounded-md border px-3 py-2"
            placeholder="Re-enter password"
          />

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {submitting ? "Creating user..." : "Create user"}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
        </form>

        <a className="w-fit text-sm underline" href="/login">
          Back to login
        </a>
      </main>
    </div>
  );
}
