"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface Screenshot {
  id: number;
  title: string;
  description: string;
  image: string;
}

const screenshots: Screenshot[] = [
  {
    id: 1,
    title: "Treffe strategische Entscheidungen",
    description: "Bestimme Produktion, Preis, Marketing und Investitionen jede Periode neu",
    image: "/screenshot-1.svg",
  },
  {
    id: 2,
    title: "Beobachte deine Kapitalentwicklung",
    description: "Verfolge deine Gewinne und Verluste live im Vergleich zu den Konkurrenten",
    image: "/screenshot-2.svg",
  },
  {
    id: 3,
    title: "Konkurriere in der Rangliste",
    description: "Sieh wer führt und lerne von den Strategien der anderen Teams",
    image: "/screenshot-3.svg",
  },
  {
    id: 4,
    title: "Spielleiter verwaltet das Spiel",
    description: "Der Moderator steuert Perioden, Auswertungen und kann Spezialaufträge vergeben",
    image: "/screenshot-4.svg",
  },
  {
    id: 5,
    title: "Solo-Modus gegen KI-Gegner",
    description: "Spielen Sie allein gegen intelligente KI-Konkurrenten in verschiedenen Schwierigkeitsstufen",
    image: "/screenshot-6.svg",
  },
  {
    id: 6,
    title: "Überwache den Markt in Echtzeit",
    description: "Analysiere aktuelle Markttrends, Konkurrenzpositionen und FuE-Investitionen während der Periode",
    image: "/screenshot-7.svg",
  },
  {
    id: 7,
    title: "Detaillierte Periode-Auswertung",
    description: "Sehe Umsatz, Gewinne, Marktanteile und Kapazitätsplanung nach jeder Spielrunde",
    image: "/screenshot-8.svg",
  },
];

export default function ScreenshotSlider() {
  const sliderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollDistance = container.clientWidth; // Vollebreite für einen Slide
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

    // Auto-scroll alle 8 Sekunden
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
          {screenshots.map((screenshot) => (
            <div
              key={screenshot.id}
              className="w-full flex-shrink-0 snap-center"
            >
              {/* Screenshot Card - Full Width */}
              <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-neutral-300 bg-white h-full flex flex-col mx-auto max-w-5xl">
                {/* Image Container */}
                <div className="relative h-96 bg-gradient-to-br from-neutral-100 to-neutral-200 overflow-hidden">
                  <Image
                    src={screenshot.image}
                    alt={screenshot.title}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority={screenshot.id === 1}
                  />
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col flex-grow">
                  <h4 className="font-bold text-neutral-900 text-xl mb-3">
                    {screenshot.title}
                  </h4>
                  <p className="text-neutral-600 text-base flex-grow">
                    {screenshot.description}
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
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 sm:-translate-x-12 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg border-2 border-neutral-300 hover:bg-neutral-100 transition disabled:opacity-30 disabled:cursor-not-allowed group"
        >
          <span className="text-neutral-700 font-bold text-2xl">←</span>
        </button>

        {/* Right Arrow Button */}
        <button
          onClick={() => scroll("right")}
          disabled={currentIndex === screenshots.length - 1}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 sm:translate-x-12 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg border-2 border-neutral-300 hover:bg-neutral-100 transition disabled:opacity-30 disabled:cursor-not-allowed group"
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
