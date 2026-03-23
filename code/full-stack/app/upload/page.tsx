"use client";

import { FormEvent, useState } from "react";

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
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setResult({ ok: false, message: "Please choose a CSV file." });
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".csv")) {
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
        <h1 className="text-2xl font-semibold">CSV Asset Ingestion</h1>
        <p className="text-sm">
          Upload a CSV to validate format and import assets. The import is fully rejected if any row has errors.
        </p>
        <a className="w-fit text-sm underline" href="/login">
          Go to login page
        </a>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border p-4">
          <label htmlFor="csv-file" className="text-sm font-medium">
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
            className="block w-full text-sm"
          />

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-fit items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {submitting ? "Uploading..." : "Upload CSV"}
          </button>
        </form>

        <section className="rounded-lg border p-4 text-sm">
          <h2 className="mb-2 font-semibold">Accepted headers</h2>
          <p>Required: name, serial_number</p>
          <p>Category reference: category_name or category_id</p>
          <p>Lab reference: lab_name or lab_id</p>
          <p>Optional: checked_out, checked_out_to</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a className="underline" href="/sample/example.csv" download>
              Download name-based template
            </a>
            <a className="underline" href="/sample/example_ids.csv" download>
              Download id-based template
            </a>
          </div>
        </section>

        {result && (
          <section className="rounded-lg border p-4 text-sm">
            <h2 className="mb-2 text-base font-semibold">{result.ok ? "Accepted" : "Rejected"}</h2>
            <p>{result.message}</p>

            {typeof result.totalRows === "number" && <p>Total rows: {result.totalRows}</p>}
            {typeof result.inserted === "number" && <p>Inserted: {result.inserted}</p>}
            {typeof result.updated === "number" && <p>Updated: {result.updated}</p>}
            {typeof result.rejected === "number" && <p>Rejected: {result.rejected}</p>}
            {typeof result.errorCount === "number" && <p>Error count: {result.errorCount}</p>}
            {result.error && <p>Error: {result.error}</p>}

            {result.errors && result.errors.length > 0 && (
              <div className="mt-3">
                <h3 className="mb-1 font-medium">Validation errors</h3>
                <ul className="space-y-1">
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
    </div>
  );
}
