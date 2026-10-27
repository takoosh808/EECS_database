"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../components/DashboardShell";

type IngestError = {
  row: number;
  field: string;
  message: string;
};

type IngestResponse = {
  ok: boolean;
  message: string;
  totalRows?: number;
  inserted?: number;
  updated?: number;
  rejected?: number;
  errorCount?: number;
  errors?: IngestError[];
  error?: string;
  generatedCredentials?: { email: string; temporaryPassword: string }[];
};

type UploadMode = "assets" | "users";

export default function UploadPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>("assets");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "admin") {
      router.push("/home");
      return;
    }
    setIsAdmin(true);
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setResult({ ok: false, message: "Please choose a CSV file." });
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setResult({ ok: false, message: "Only .csv files are accepted." });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint = uploadMode === "assets" ? "/api/ingest" : "/api/users/ingest";
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as IngestResponse;
      setResult(payload);
    } catch (error) {
      setResult({
        ok: false,
        message: "Upload failed.",
        error: (error as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <DashboardShell>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <div
          className="flex w-fit rounded-md bg-gray-100 p-1"
          role="tablist"
          aria-label="CSV upload type"
        >
          {(["assets", "users"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={uploadMode === mode}
              onClick={() => {
                setUploadMode(mode);
                setFile(null);
                setResult(null);
              }}
              className={`rounded px-4 py-2 text-sm font-medium capitalize transition ${
                uploadMode === mode ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Admin import</p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900">
            CSV {uploadMode === "assets" ? "Asset" : "User"} Upload
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-gray-600">
            {uploadMode === "assets"
              ? "Upload a CSV matching the asset import schema. Missing categories are created automatically, and assets are inserted or updated by serial number."
              : "Upload users using the exact users table column names. Blank IDs and timestamps are generated automatically; blank password hashes receive one-time temporary passwords."}
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
          >
            <label htmlFor="csv-file" className="text-sm font-medium text-gray-800">
              {uploadMode === "assets" ? "Asset CSV File" : "User CSV File"}
            </label>
            <input
              key={uploadMode}
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
              }}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            />

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-fit items-center justify-center rounded-md bg-crimson-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-crimson-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Uploading..." : `Upload ${uploadMode === "assets" ? "Assets" : "Users"}`}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            {uploadMode === "assets" ? "Required headers" : "User CSV columns"}
          </h2>
          {uploadMode === "assets" ? (
            <>
              <ul className="space-y-2 text-gray-700">
                <li>name</li>
                <li>category_name</li>
                <li>location or lab_name</li>
                <li>serial_number</li>
              </ul>
              <p className="mt-3 text-gray-600">
                Categories are created automatically when needed. The legacy lab_name header is accepted as the asset location.
              </p>
            </>
          ) : (
            <>
              <p className="wrap-break-word text-gray-700">
                user_id, name, email, role, password_hash, created_at, updated_at
              </p>
              <p className="mt-3 text-gray-600">
                Keep all seven headers exactly as shown. Leave user_id and timestamps blank to generate them. Leave password_hash blank to generate a temporary password, which is shown only once after import; supplied hashes must use the app&apos;s scrypt format. Blank role defaults to user.
              </p>
            </>
          )}
          <div className="mt-5 border-t border-gray-200 pt-4">
            <h3 className="mb-2 font-semibold text-gray-900">Template</h3>
            <p className="text-gray-700">Start from the included CSV template.</p>
            <a
              className="mt-3 inline-flex text-sm font-medium text-crimson-700 underline"
              href={uploadMode === "assets" ? "/sample/example.csv" : "/sample/users.csv"}
              download
            >
              Download {uploadMode === "assets" ? "asset" : "user"} CSV template
            </a>
          </div>
        </section>

        {result && (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm shadow-sm">
            <h2 className="mb-2 text-base font-semibold text-gray-900">{result.ok ? "Accepted" : "Rejected"}</h2>
            <p className="text-gray-700">{result.message}</p>

            <div className="mt-3 grid gap-1 text-gray-700 sm:grid-cols-2">
              {typeof result.totalRows === "number" && <p>Total rows: {result.totalRows}</p>}
              {typeof result.inserted === "number" && <p>Inserted: {result.inserted}</p>}
              {typeof result.updated === "number" && <p>Updated: {result.updated}</p>}
              {typeof result.rejected === "number" && <p>Rejected: {result.rejected}</p>}
              {typeof result.errorCount === "number" && <p>Error count: {result.errorCount}</p>}
              {result.error && <p>Error: {result.error}</p>}
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <h3 className="mb-2 font-medium text-red-900">Validation errors</h3>
                <ul className="space-y-1 text-red-800">
                  {result.errors.map((item, index) => (
                    <li key={`${item.row}-${item.field}-${index}`}>
                      Row {item.row} / {item.field}: {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.generatedCredentials && result.generatedCredentials.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-medium text-amber-900">Temporary passwords</h3>
                <p className="mt-1 text-amber-800">
                  Save and distribute these now. They will not be shown again.
                </p>
                <ul className="mt-3 space-y-2 font-mono text-xs text-amber-950">
                  {result.generatedCredentials.map((credential) => (
                    <li key={credential.email}>
                      {credential.email}: {credential.temporaryPassword}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>
    </DashboardShell>
  );
}
