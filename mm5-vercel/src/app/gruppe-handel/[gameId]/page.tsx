"use client";

import { Suspense } from "react";
import { GruppeGameWrapperHandel } from "./wrapper";

export const dynamic = "force-dynamic";

export default function GruppeGameHandelPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-14 sm:px-6">
          <div className="text-center text-neutral-600">Wird geladen...</div>
        </main>
      }
    >
      <GruppeGameWrapperHandel />
    </Suspense>
  );
}
