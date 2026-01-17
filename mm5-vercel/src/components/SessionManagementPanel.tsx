"use client";

import { useEffect, useState } from "react";
import { doc, deleteDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GroupState } from "@/lib/types";
import { ui } from "@/lib/ui";

interface GroupActivityStatus extends GroupState {
  inactivityMinutes: number;
  willBeRemoved: boolean;
}

export function SessionManagementPanel({ gameId }: { gameId: string }) {
  const [groups, setGroups] = useState<GroupActivityStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const INACTIVITY_TIMEOUT_MINUTES = 90;

  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoading(true);
        const groupsRef = collection(db, "games", gameId, "groups");
        const snapshot = await getDocs(groupsRef);
        const now = Date.now();

        const groupsWithActivity: GroupActivityStatus[] = snapshot.docs.map((doc) => {
          const group = doc.data() as GroupState;
          const lastActivityTime = group.lastActivityTime || Date.now();
          const inactivityDuration = now - lastActivityTime;
          const inactivityMinutes = Math.round(inactivityDuration / 1000 / 60);
          const willBeRemoved = inactivityMinutes > INACTIVITY_TIMEOUT_MINUTES;

          return {
            ...group,
            id: doc.id,
            inactivityMinutes,
            willBeRemoved,
          };
        });

        setGroups(groupsWithActivity.sort((a, b) => a.inactivityMinutes - b.inactivityMinutes));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(`Fehler beim Laden: ${errorMsg}`);
      } finally {
        setLoading(false);
      }
    };

    if (!showDetails) return;

    loadGroups();
    const interval = setInterval(loadGroups, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [gameId, showDetails]);

  const handleRemoveGroup = async (groupId: string, groupName: string) => {
    if (!window.confirm(`Sitzung von "${groupName}" wirklich löschen?`)) {
      return;
    }

    try {
      // Delete group
      await deleteDoc(doc(db, "games", gameId, "groups", groupId));
      // Delete associated decision if exists
      try {
        await deleteDoc(doc(db, "games", gameId, "decisions", groupId));
      } catch {
        // Decision might not exist
      }

      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Fehler beim Löschen: ${errorMsg}`);
    }
  };

  const inactiveGroups = groups.filter((g) => g.inactivityMinutes > 30);
  const orphanedGroups = groups.filter((g) => g.willBeRemoved);

  return (
    <div className="rounded-xl bg-white border-2 border-neutral-300 overflow-hidden">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">⚙️</span>
          <div>
            <h3 className="font-semibold text-neutral-900">Sitzungsverwaltung</h3>
            <p className="text-xs text-neutral-600">
              {inactiveGroups.length} inaktive Gruppen {orphanedGroups.length > 0 && `(${orphanedGroups.length} zu löschen)`}
            </p>
          </div>
        </div>
        <span className={`transition ${showDetails ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {showDetails && (
        <div className="border-t border-neutral-200 p-4 space-y-3">
          {loading && <div className="text-center text-neutral-600 text-sm">Aktualisiere...</div>}

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-red-700 text-sm border border-red-200">
              {error}
            </div>
          )}

          {!loading && groups.length === 0 && (
            <div className="text-center text-neutral-600 text-sm">Keine Gruppen im Spiel</div>
          )}

          {!loading && groups.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className={`rounded-lg p-3 border-2 flex items-center justify-between text-sm transition ${
                    group.willBeRemoved
                      ? "border-red-300 bg-red-50"
                      : group.inactivityMinutes > 30
                      ? "border-orange-300 bg-orange-50"
                      : "border-emerald-300 bg-emerald-50"
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900">{group.name}</p>
                    <p
                      className={`text-xs ${
                        group.willBeRemoved
                          ? "text-red-700"
                          : group.inactivityMinutes > 30
                          ? "text-orange-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {group.inactivityMinutes} Min inaktiv
                      {group.willBeRemoved && " (wird gelöscht)"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveGroup(group.id, group.name)}
                    className={`px-3 py-1 rounded-lg font-semibold text-white text-xs transition ${
                      group.willBeRemoved
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-neutral-400 hover:bg-neutral-600"
                    }`}
                  >
                    Löschen
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && orphanedGroups.length > 0 && (
            <div className="rounded-lg bg-yellow-50 p-3 border border-yellow-300 mt-4">
              <p className="text-xs font-semibold text-yellow-900 mb-2">
                ⚠️ {orphanedGroups.length} verwaiste Sitzung{orphanedGroups.length !== 1 ? "en" : ""} erkannt
              </p>
              <p className="text-xs text-yellow-800 mb-3">
                Diese Gruppen sind länger als 90 Minuten inaktiv und werden vom System bald automatisch gelöscht.
              </p>
              <button
                onClick={async () => {
                  for (const group of orphanedGroups) {
                    await handleRemoveGroup(group.id, group.name);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold transition"
              >
                Alle verwaisten Sitzungen jetzt löschen
              </button>
            </div>
          )}

          <div className="text-xs text-neutral-600 pt-2 border-t border-neutral-200 mt-3">
            <p>Grüne Marker: aktiv | Orange: &gt;30 Min inaktiv | Rote Marker: &gt;90 Min (werden gelöscht)</p>
          </div>
        </div>
      )}
    </div>
  );
}
