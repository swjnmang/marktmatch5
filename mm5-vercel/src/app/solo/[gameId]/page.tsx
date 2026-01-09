"use client";

import { use } from "react";
import { GruppeGameForm } from "@/app/gruppe/game-form";

export default function SoloGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  
  return <GruppeGameForm />;
}
