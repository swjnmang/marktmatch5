"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

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
        {resumeGameId && resumeGroupId && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div>
              <p className="text-sm font-semibold text-emerald-900">Vorherige Sitzung gefunden</p>
              <p className="text-xs text-emerald-800">Du kannst dein letztes Spiel sofort fortsetzen.</p>
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
                </button>6">
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
