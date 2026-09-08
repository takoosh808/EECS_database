"use client";

import { FormEvent, useEffect, useState } from "react";
import DashboardShell from "../components/DashboardShell";

type Profile = { name: string; email: string };
type ApiResponse = { name?: string; email?: string; error?: string };

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>({ name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/users/me")
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse;
        if (!response.ok) throw new Error(payload.error ?? "Failed to load profile.");
        setProfile({ name: payload.name ?? "", email: payload.email ?? "" });
      })
      .catch((loadError: Error) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  function openEditor() {
    setName(profile.name);
    setEmail(profile.email);
    setError(null);
    setEditing(true);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/users/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const payload = (await response.json()) as ApiResponse;
    if (!response.ok) {
      setError(payload.error ?? "Failed to update profile.");
      return;
    }
    setProfile({ name: payload.name ?? name.trim(), email: payload.email ?? email.trim().toLowerCase() });
    setEditing(false);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      const response = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error ?? "Failed to change password.");
      setMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (passwordError) {
      setError((passwordError as Error).message);
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <DashboardShell>
      <section className="mx-auto max-w-3xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-crimson-600">Account</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">Settings</h1>
        <p className="mt-2 text-sm text-zinc-600">View and manage your profile information.</p>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}

        <dl className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
          <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-6">
            <dt className="text-sm font-medium text-zinc-500">Name</dt>
            <dd className="text-sm text-zinc-900">{loading ? "Loading..." : profile.name || "Not set"}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-6">
            <dt className="text-sm font-medium text-zinc-500">Email</dt>
            <dd className="text-sm text-zinc-900">{loading ? "Loading..." : profile.email || "Not set"}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={openEditor} className="rounded-md bg-crimson-600 px-4 py-2 text-sm font-medium text-white hover:bg-crimson-700">
            Edit Profile
          </button>
        </div>

        {editing && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
            <h2 className="text-lg font-semibold text-zinc-900">Edit Profile</h2>
            <form onSubmit={saveProfile} className="mt-4 flex max-w-md flex-col gap-4">
              <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-crimson-500" />
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-crimson-500" />
              <div className="flex gap-2">
                <button type="submit" className="rounded-md bg-crimson-600 px-4 py-2 text-sm font-medium text-white hover:bg-crimson-700">Save Changes</button>
                <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="mt-8 border-t border-zinc-200 pt-6">
          <h2 className="text-lg font-semibold text-zinc-900">Change Password</h2>
          <p className="mt-1 text-sm text-zinc-600">Your new password must be at least 6 characters.</p>
          <form onSubmit={changePassword} className="mt-4 flex max-w-md flex-col gap-4">
            <input required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-crimson-500" />
            <input required type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-crimson-500" />
            <input required type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-crimson-500" />
            <button type="submit" disabled={changingPassword} className="w-fit rounded-md bg-crimson-600 px-4 py-2 text-sm font-medium text-white hover:bg-crimson-700 disabled:opacity-60">
              {changingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </section>
    </DashboardShell>
  );
}
