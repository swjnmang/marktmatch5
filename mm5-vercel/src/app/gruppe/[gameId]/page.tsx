"use client";

import { Suspense } from "react";
import { GruppeGameForm } from "../game-form";

export const dynamic = "force-dynamic";

export default function GruppeGamePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14 sm:px-10">
          <div className="text-center text-slate-600">Wird geladen...</div>
        </main>
      }
    >
      <GruppeGameForm />
    </Suspense>
  );
}
