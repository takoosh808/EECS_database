"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

interface BarcodeScannerProps {
  onDetect: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({
  onDetect,
  onClose,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectRef = useRef(onDetect);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access requires a secure (HTTPS) connection.");
      return;
    }

    const reader = new BrowserMultiFormatReader();
    let controls: { stop: () => void } | undefined;
    let cancelled = false;
    let detected = false;

    async function start() {
      const video = videoRef.current;
      if (!video) return;

      try {
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          video,
          (result) => {
            const value = result?.getText().trim();
            if (value && !detected) {
              detected = true;
              onDetectRef.current(value);
            }
          },
        );
        if (cancelled || detected) controls.stop();
      } catch (err) {
        if (cancelled) return;
        const permissionDenied =
          err instanceof Error && err.name === "NotAllowedError";
        setError(
          permissionDenied
            ? "Camera access was denied. Allow camera access in your browser settings."
            : "Unable to start the camera. Check camera permissions and try again.",
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 text-black shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Scan Barcode</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              className="aspect-video w-full rounded-md bg-black object-cover"
            />
            <p className="mt-2 text-sm text-zinc-600">
              Point the camera at the barcode.
            </p>
          </>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-black px-4 py-2 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
