"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface Screenshot {
  id: number;
  src: string;
  alt: string;
  badge: string;
  title: string;
  description: string;
}

const screenshots: Screenshot[] = [
  {
    id: 1,
    src: "/screenshots/spielleiter-lobby.png",
    alt: "Lobby-Dashboard mit QR-Code und Gruppen-PIN",
    badge: "Spielleitung",
    title: "Lobby mit QR-Code & Live-Status",
    description: "Gruppen treten per PIN oder QR-Code bei - die Spielleitung sieht sofort, wer bereit ist.",
  },
  {
    id: 2,
    src: "/screenshots/spielprinzip.png",
    alt: "Einführungsbildschirm mit Erklärung des Marktszenarios",
    badge: "Einstieg",
    title: "Klar erklärtes Spielprinzip",
    description: "Jede Gruppe startet mit einer verständlichen Einführung ins Marktszenario und Spielziel.",
  },
  {
    id: 3,
    src: "/screenshots/produktion-maschinenwahl.png",
    alt: "Auswahl der Produktionsmaschine mit Kosten und Kapazität",
    badge: "Produktionsunternehmen",
    title: "Produktionsmaschine wählen",
    description: "Kapazität gegen Stückkosten abwägen - die erste strategische Entscheidung jeder Gruppe.",
  },
  {
    id: 4,
    src: "/screenshots/produktion-entscheidung.png",
    alt: "Entscheidungsformular mit Produktionsmenge, Verkaufspreis und Timer",
    badge: "Produktionsunternehmen",
    title: "Menge, Preis & Timer",
    description: "Jede Periode: Produktionsmenge und Verkaufspreis festlegen, bevor die Zeit abläuft.",
  },
  {
    id: 5,
    src: "/screenshots/ranking.png",
    alt: "Ranking-Ansicht mit Kapital und kumuliertem Gewinn aller Teams",
    badge: "Wettbewerb",
    title: "Live-Ranking nach jeder Periode",
    description: "Kapital und kumulierter Gewinn aller Teams auf einen Blick - direkt für die Spielleitung.",
  },
  {
    id: 6,
    src: "/screenshots/handel-einkauf-verkauf.png",
    alt: "Einkaufs- und Verkaufsformular des Handelsmodus mit Mengenrabatt",
    badge: "Neu: Handelsunternehmen",
    title: "Einkauf & Verkauf in drei Qualitätsstufen",
    description: "Mengenrabatte werden live berechnet - je mehr Standardware, desto günstiger der Einkaufspreis.",
  },
  {
    id: 7,
    src: "/screenshots/handel-dashboard.png",
    alt: "Spielleiter-Dashboard des Handelsmodus",
    badge: "Neu: Handelsunternehmen",
    title: "Eigenes Spielleiter-Dashboard",
    description: "Mobil optimiert, mit Großhandelspreisen und Ereignis-Steuerung für jede Periode.",
  },
  {
    id: 8,
    src: "/screenshots/handel-ergebnis.png",
    alt: "Periodenergebnis des Handelsmodus je Qualitätsstufe",
    badge: "Neu: Handelsunternehmen",
    title: "Ergebnis je Qualitätsstufe",
    description: "Verkaufte Menge, Umsatz und Lagerbestand aufgeschlüsselt nach Standard-, Marken- und Premiumware.",
  },
];

export default function ScreenshotSlider() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollDistance = container.clientWidth;
    let direction = 1;

    const autoScroll = () => {
      if (!isScrollingRef.current && container) {
        const maxScroll = container.scrollWidth - container.clientWidth;

        if (container.scrollLeft + scrollDistance > maxScroll) {
          direction = -1;
        } else if (container.scrollLeft === 0) {
          direction = 1;
        }

        container.scrollLeft += scrollDistance * direction;
        updateCurrentIndex(container);
      }
    };

    scrollIntervalRef.current = setInterval(autoScroll, 8000);

    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, []);

  const updateCurrentIndex = (container: HTMLDivElement) => {
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setCurrentIndex(Math.min(index, screenshots.length - 1));
  };

  const scroll = (direction: "left" | "right") => {
    const container = containerRef.current;
    if (!container) return;

    isScrollingRef.current = true;
    const scrollAmount = container.clientWidth;
    const targetScroll =
      container.scrollLeft + (direction === "right" ? scrollAmount : -scrollAmount);

    container.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });

    setTimeout(() => {
      isScrollingRef.current = false;
      updateCurrentIndex(container);
    }, 500);
  };

  return (
    <div className="mb-20 w-full">
      <div className="relative">
        {/* Slider Container */}
        <div
          ref={containerRef}
          className="w-full overflow-x-hidden scroll-smooth snap-x snap-mandatory flex"
          onScroll={() => {
            if (containerRef.current) {
              updateCurrentIndex(containerRef.current);
            }
          }}
        >
          {screenshots.map((shot) => (
            <div key={shot.id} className="w-full flex-shrink-0 snap-center">
              {/* Screenshot Card - Full Width */}
              <div className="overflow-hidden rounded-2xl border-2 border-neutral-300 bg-white shadow-xl mx-auto max-w-4xl">
                <div className="relative aspect-[8/5] w-full bg-neutral-100">
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    fill
                    sizes="(max-width: 896px) 100vw, 896px"
                    className="object-cover object-top"
                    priority={shot.id === 1}
                  />
                </div>
                <div className="p-6 sm:p-8">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sky-700">
                    {shot.badge}
                  </p>
                  <h4 className="mb-2 text-xl sm:text-2xl font-bold text-neutral-900">
                    {shot.title}
                  </h4>
                  <p className="text-sm sm:text-base leading-relaxed text-neutral-600">
                    {shot.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Left Arrow Button */}
        <button
          onClick={() => scroll("left")}
          disabled={currentIndex === 0}
          className="absolute left-0 top-[38%] -translate-y-1/2 -translate-x-8 sm:-translate-x-12 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg border-2 border-neutral-300 hover:bg-neutral-100 transition disabled:opacity-30 disabled:cursor-not-allowed group"
        >
          <span className="text-neutral-700 font-bold text-2xl">←</span>
        </button>

        {/* Right Arrow Button */}
        <button
          onClick={() => scroll("right")}
          disabled={currentIndex === screenshots.length - 1}
          className="absolute right-0 top-[38%] -translate-y-1/2 translate-x-8 sm:translate-x-12 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg border-2 border-neutral-300 hover:bg-neutral-100 transition disabled:opacity-30 disabled:cursor-not-allowed group"
        >
          <span className="text-neutral-700 font-bold text-2xl">→</span>
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center gap-3 mt-8">
        {screenshots.map((_, index) => (
          <div
            key={index}
            className={`transition-all duration-300 ${
              index === currentIndex
                ? "w-10 h-3 bg-neutral-700 rounded-full"
                : "w-3 h-3 bg-neutral-300 rounded-full cursor-pointer hover:bg-neutral-400"
            }`}
            onClick={() => {
              const container = containerRef.current;
              if (container) {
                container.scrollTo({
                  left: index * container.clientWidth,
                  behavior: "smooth",
                });
              }
            }}
          />
        ))}
      </div>

      {/* Info Text */}
      <p className="text-center text-sm text-neutral-600 mt-6 font-medium">
        {currentIndex + 1} / {screenshots.length} • Nutze die Pfeile oder klicke auf die Punkte
      </p>
    </div>
  );
}
