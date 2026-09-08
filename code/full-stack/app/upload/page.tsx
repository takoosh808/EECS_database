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
};

export default function UploadPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "admin" && role !== "owner") {
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

      const response = await fetch("/api/ingest", {
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
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Admin import</p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900">CSV Asset Upload</h1>
          <p className="mt-3 max-w-3xl text-sm text-gray-600">
            Upload a CSV that matches the asset schema. The import creates missing categories and labs from the names
            in the file, then inserts or updates assets by serial number.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
          >
            <label htmlFor="csv-file" className="text-sm font-medium text-gray-800">
              CSV File
            </label>
            <input
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
              {submitting ? "Uploading..." : "Upload CSV"}
            </button>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Required headers</h2>
            <ul className="space-y-2 text-gray-700">
              <li>name</li>
              <li>category_name</li>
              <li>lab_name</li>
              <li>serial_number</li>
            </ul>
            <p className="mt-3 text-gray-600">
              Categories and labs are created automatically from the provided names. This page is aligned to the asset
              table, so the upload only handles asset records.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Template</h2>
            <p className="text-gray-700">Start from the included CSV template.</p>
            <a className="mt-3 inline-flex text-sm font-medium text-crimson-700 underline" href="/sample/example.csv" download>
              Download CSV template
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
          </section>
        )}
      </main>
    </DashboardShell>
  );
}
