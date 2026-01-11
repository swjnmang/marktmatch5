"use client";
/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react/no-unescaped-entities */

import { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ui } from "@/lib/ui";

export const dynamic = "force-dynamic";

function GruppeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState("");
  const [gameId, setGameId] = useState("");
  const [resumeGameId, setResumeGameId] = useState<string | null>(null);
  const [resumeGroupId, setResumeGroupId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [activeTab, setActiveTab] = useState<"qr" | "manual">("qr");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-load gameId from URL params if present
  useEffect(() => {
    const urlGameId = searchParams.get("gameId");
    const urlPin = searchParams.get("pin");
    
    if (urlGameId && urlPin) {
      // Direct link with PIN - auto-join
      setPin(urlPin);
      setGameId(urlGameId);
      // Auto-navigate to the game with PIN prefilled
      router.push(`/gruppe/${urlGameId}?pin=${urlPin}`);
      return;
    }

    if (urlGameId) {
      setGameId(urlGameId);
      // Auto-navigate to the game
      router.push(`/gruppe/${urlGameId}`);
      return;
    }

    // Detect previous session on this device
    const localKeys = Object.keys(localStorage || {});
    const groupKey = localKeys.find((k) => k.startsWith("group_"));
    if (groupKey) {
      const gid = groupKey.replace("group_", "");
      const storedGroupId = localStorage.getItem(groupKey);
      if (gid && storedGroupId) {
        setResumeGameId(gid);
        setResumeGroupId(storedGroupId);
      }
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
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "Unbekannter Fehler";
      setError(`Kamera nicht verfügbar: ${msg}`);
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

  const handleManualJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length !== 5) {
      setError("Bitte gib einen 5-stelligen PIN ein");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Search for game with this joinPin
      const gamesRef = collection(db, "games");
      const q = query(gamesRef, where("joinPin", "==", pin.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Kein Spiel mit diesem PIN gefunden. Bitte überprüfe den Code.");
        setLoading(false);
        return;
      }

      // Found the game - redirect to it
      const gameDoc = querySnapshot.docs[0];
      router.push(`/gruppe/${gameDoc.id}?pin=${pin.toUpperCase()}`);
    } catch (err: any) {
      console.error("Error finding game:", err);
      setError(`Fehler beim Suchen des Spiels: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <main className={ui.page.shell}>
      <div className={ui.page.overlay} />
      <div className={ui.page.container}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <p className={ui.header.kicker}>Gruppe</p>
            <h1 className={ui.header.title}>Spiel beitreten</h1>
            <p className={ui.header.subtitle}>Scanne einen QR-Code oder gib deinen PIN manuell ein.</p>
          </div>
          <Link href="/" className={ui.header.backLink}>
            ← Zurück
          </Link>
        </div>

        <div className={ui.card.padded}>
        {resumeGameId && resumeGroupId && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-emerald-400/40 bg-emerald-500/20 p-4">
            <div>
              <p className="text-sm font-semibold text-emerald-100">Vorherige Sitzung gefunden</p>
              <p className="text-xs text-emerald-200">Du kannst dein letztes Spiel sofort fortsetzen.</p>
            </div>
            <button
              onClick={() => router.push(`/gruppe/${resumeGameId}`)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Sitzung wieder aufnehmen
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-white/10">
          <button
            onClick={() => {
              setActiveTab("qr");
              stopQRScanning();
            }}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              activeTab === "qr"
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-slate-300 hover:text-white"
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
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-slate-300 hover:text-white"
            }`}
          >
            🔐 PIN eingeben
          </button>
        </div>

        {/* QR Code Tab */}
        {activeTab === "qr" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-200">
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
                <p className="text-xs text-slate-300 text-center">
                  Für beste Ergebnisse: QR-Code vor die Kamera halten
                </p>
              </>
            )}

            {error && (
              <div className="rounded-lg bg-red-500/20 p-4 border border-red-400/40 text-red-100 text-sm">
                <p>{error}</p>
              </div>
            )}

            <div className="rounded-lg bg-white/10 p-4 ring-1 ring-white/10">
              <p className="text-sm text-slate-200">
                💡 <strong>Tipp:</strong> Wenn der QR-Scanner nicht funktioniert, verwende stattdessen die "PIN eingeben" Option.
              </p>
            </div>
          </div>
        )}

        {/* Manual PIN Tab */}
        {activeTab === "manual" && (
          <form onSubmit={handleManualJoin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                PIN-Code
              </label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.toUpperCase())}
                placeholder="ABCDE"
                maxLength={5}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 tracking-widest text-center text-3xl font-bold text-slate-900 uppercase disabled:bg-slate-100"
              />
              <p className="text-xs text-slate-500 mt-2 text-center">
                5-stelliger Code vom Spielleiter (z.B. aus QR-Code)
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || pin.length !== 5}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {loading ? "🔍 Suche Spiel..." : "🚀 Spiel beitreten"}
            </button>

            <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200">
              <p className="text-sm text-emerald-800">
                ✓ <strong>Einfach:</strong> Nur den 5-stelligen PIN eingeben - das System findet automatisch dein Spiel!
              </p>
            </div>
          </form>
        )}
      </div>

      <div className="text-center">
        <Link href="/" className={ui.header.backLink}>
          ← Zurück zur Startseite
        </Link>
      </div>
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
