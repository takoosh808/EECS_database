"use client";

import { useState } from "react";
import { AssetCheckoutDetails } from "@/app/types";
type Decision = "ALLOW" | "DENY";

// Shape of the data this box needs to render a request for review.
// This is a join of asset_checkout + the requesting user + the asset,
// since asset_checkout only stores user_id / asset_id on its own.

interface ReviewRequestBoxProps {
  onClose: () => void; // called when the admin closes the box
  request: AssetCheckoutDetails; // the request being reviewed — box is prefilled from this
  adminEmail: string; // the reviewing admin's contact email, appended to every response sent
}

export default function ReviewRequestBox({
  onClose,
  request,
  adminEmail,
}: ReviewRequestBoxProps) {
  const [adminMessage, setAdminMessage] = useState("");
  const [submitting, setSubmitting] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  // This line is always appended to whatever the admin writes, so a
  // requester always has a way to follow up. It is not editable in the
  // textarea itself — it's shown separately and stitched on at submit time.
  const contactLine = `If you have further questions or inquiries please reach out to ${adminEmail}.`;
  //Function for approving requests which calls aprove API route
  async function approveRequest(requestId: string) {
    if (!adminMessage.trim()) {
      setError("Please add a response before approving.");
      return;
    }
    const finalMessage = adminMessage + " " + contactLine;
    const user_id = request.user_id;
    const checkout_id = request.checkout_id;
    setError(null);
    setSubmitting("ALLOW");
    try {
      const res = await fetch("/api/requests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, finalMessage, user_id, checkout_id }),
      });
      if (!res.ok) throw new Error("Failed to approve request");
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to approve request. Please try again.");
    } finally {
      setSubmitting(null);
    }
  }

  async function denyRequest(requestId: string) {
    if (!adminMessage.trim()) {
      setError("Please add a response before denying.");
      return;
    }
    const finalMessage = adminMessage + " " + contactLine;
    setError(null);
    setSubmitting("DENY");
    const user_id = request.user_id;
    const checkout_id = request.checkout_id;
    try {
      const res = await fetch("/api/requests/deny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, finalMessage, user_id, checkout_id }),
      });
      const data = await res.json();
      console.log("Status:", res.status);
      if (!res.ok) {
        throw new Error("Failed to deny request");
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to deny request. Please try again.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg border border-black bg-white p-5 text-black shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-8 flex items-center justify-between border-b border-black pb-4">
          <h2 className="text-2xl font-semibold">Review Request</h2>

          <button
            type="button"
            className="text-2xl leading-none cursor-pointer"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Requester details */}
          <FormField label="Requested By">
            <div className="w-full rounded-md border border-black bg-gray-50 px-4 py-3">
              <p className="font-medium">{request.user}</p>
              <p className="text-sm text-gray-600">{request.email}</p>
            </div>
          </FormField>

          {/* Asset + request date, for quick context */}
          <FormField label="Asset">
            <div className="w-full rounded-md border border-black bg-gray-50 px-4 py-3">
              <p className="font-medium">{request.asset}</p>
              <p className="text-sm text-gray-600">
                Requested {new Date(request.request_date).toLocaleDateString()}
              </p>
            </div>
          </FormField>

          {/* Requester's reason */}
          <FormField label="Reason for Request">
            <div className="w-full whitespace-pre-wrap rounded-md border border-black bg-gray-50 px-4 py-3">
              {request.request_reason}
            </div>
          </FormField>

          {/* Admin response */}
          <FormField label="Your Response">
            <textarea
              rows={4}
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="Please be specific about how and when the requester can pick up the asset."
              className="w-full resize-none rounded-md border border-black px-4 py-3 outline-none focus:ring-1 focus:ring-black"
            />

            <div className="mt-2 rounded-md border border-dashed border-gray-400 bg-gray-50 px-4 py-3 text-sm text-gray-500">
              <span className="mb-1 block font-medium text-gray-600">
                Automatically added to every response:
              </span>
              {contactLine}
            </div>
          </FormField>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-black pt-6">
            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => denyRequest(request.checkout_id)}
              className="rounded-md border-2 border-red-600 px-6 py-3 text-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting === "DENY" ? "Denying..." : "Deny"}
            </button>

            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => approveRequest(request.checkout_id)}
              className="rounded-md border-2 border-green-600 bg-green-600 px-6 py-3 text-white hover:bg-green-700 hover:border-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting === "ALLOW" ? "Allowing..." : "Allow"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block font-medium">{label}</label>
      {children}
    </div>
  );
}
