"use client";

import { useEffect, useRef, useState } from "react";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = new () => BarcodeDetectorLike;

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
    const Detector = (
      window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
    ).BarcodeDetector;

    if (!Detector) {
      setError(
        "Camera scanning isn't supported in this browser. Use a handheld scanner or type the barcode instead.",
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access requires a secure (HTTPS) connection.");
      return;
    }

    const detector = new Detector();
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        const video = videoRef.current;
        if (cancelled || !video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        video.srcObject = stream;
        await video.play();

        const scan = async () => {
          if (cancelled) return;
          try {
            const codes = await detector.detect(video);
            const value = codes[0]?.rawValue?.trim();
            if (value) {
              onDetectRef.current(value);
              return;
            }
          } catch {
            // Frame not ready yet; try again on the next tick.
          }
          timer = window.setTimeout(scan, 250);
        };
        scan();
      } catch {
        setError("Unable to access the camera. Check your browser permissions.");
      }
    }

    start();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
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
