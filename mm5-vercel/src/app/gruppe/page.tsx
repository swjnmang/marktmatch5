"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function GruppeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState("");
  const [gameId, setGameId] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [activeTab, setActiveTab] = useState<"qr" | "manual">("qr");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  // Auto-load gameId from URL params if present
  useEffect(() => {
    const urlGameId = searchParams.get("gameId");
    if (urlGameId) {
      setGameId(urlGameId);
      // Auto-navigate to the game
      router.push(`/gruppe/${urlGameId}`);
    }
  }, [searchParams, router]);

  const startQRScanning = async () => {
    if (!videoRef.current) return;
    setScanning(true);
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      videoRef.current.srcObject = stream;

      // Simple QR code detection - look for data in video frames
      const canvas = document.createElement("canvas");
      const canvasContext = canvas.getContext("2d");

      const detectQR = () => {
        if (videoRef.current && canvasContext) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          canvasContext.drawImage(videoRef.current, 0, 0);

          // In production, you'd use a library like jsQR
          // For now, we'll show the video and let user input manually
        }
        if (scanning) {
          requestAnimationFrame(detectQR);
        }
      };
      detectQR();
    } catch (err: any) {
      setError(`Kamera nicht verfügbar: ${err.message}`);
      setScanning(false);
    }
  };

  const stopQRScanning = () => {
    setScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleManualJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameId || !pin) {
      setError("Bitte geben Sie sowohl die Spiel-ID als auch den PIN ein");
      return;
    }
    router.push(`/gruppe/${gameId}?pin=${pin}`);
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14 sm:px-10">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">
            Gruppe
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            Spiel beitreten
          </h1>
          <p className="text-base text-slate-600">
            Scanne einen QR-Code oder gib deinen PIN manuell ein
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-semibold text-sky-600 hover:text-sky-700"
        >
          ← Zurück
        </Link>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => {
              setActiveTab("qr");
              stopQRScanning();
            }}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              activeTab === "qr"
                ? "border-sky-600 text-sky-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            📱 QR-Code scannen
          </button>
          <button
            onClick={() => {
              setActiveTab("manual");
              stopQRScanning();
            }}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              activeTab === "manual"
                ? "border-sky-600 text-sky-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            🔐 PIN eingeben
          </button>
        </div>

        {/* QR Code Tab */}
        {activeTab === "qr" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Starte den QR-Scanner oder lade einen QR-Code mit der Kamera hoch
            </p>

            {!scanning ? (
              <button
                onClick={startQRScanning}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-4 rounded-lg transition"
              >
                📸 Kamera starten
              </button>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg bg-black"
                  style={{ maxHeight: "400px" }}
                />
                <button
                  onClick={stopQRScanning}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition"
                >
                  ✕ Scannen beenden
                </button>
                <p className="text-xs text-slate-500 text-center">
                  Für beste Ergebnisse: QR-Code vor die Kamera halten
                </p>
              </>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Tipp:</strong> Wenn der QR-Scanner nicht funktioniert, verwende stattdessen die "PIN eingeben" Option.
              </p>
            </div>
          </div>
        )}

        {/* Manual PIN Tab */}
        {activeTab === "manual" && (
          <form onSubmit={handleManualJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Spiel-ID
              </label>
              <input
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value.toUpperCase())}
                placeholder="z.B. OnSt1Qj2x57x..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
              <p className="text-xs text-slate-500 mt-1">
                Diese erhältst du von deinem Spielleiter
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                PIN-Code
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="z.B. ABCDE"
                maxLength={5}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 tracking-widest text-center text-2xl"
              />
              <p className="text-xs text-slate-500 mt-1">
                5-stelliger Code vom Spielleiter
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-4 rounded-lg transition"
            >
              Spiel beitreten
            </button>

            <div className="rounded-lg bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                ⚠️ <strong>Hinweis:</strong> Du benötigst sowohl die Spiel-ID als auch den PIN-Code von deinem Spielleiter.
              </p>
            </div>
          </form>
        )}
      </div>

      <div className="text-center">
        <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
          ← Zurück zur Startseite
        </Link>
      </div>
    </main>
  );
}

export default function GruppePage() {
  return (
    <Suspense fallback={<div>Lädt...</div>}>
      <GruppeContent />
    </Suspense>
  );
}
