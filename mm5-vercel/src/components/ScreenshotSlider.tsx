"use client";

import { useEffect, useRef } from "react";
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
];

export default function ScreenshotSlider() {
  const sliderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollDistance = 400; // Breite des Slides + gap
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
      }
    };

    // Auto-scroll alle 6 Sekunden
    scrollIntervalRef.current = setInterval(autoScroll, 6000);

    // Manuelles Scrollen stoppen Auto-Scroll kurzzeitig
    container.addEventListener("scroll", () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    });

    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    const container = containerRef.current;
    if (!container) return;

    isScrollingRef.current = true;
    const scrollAmount = 400;
    const targetScroll =
      container.scrollLeft + (direction === "right" ? scrollAmount : -scrollAmount);

    container.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 500);
  };

  return (
    <div className="mb-20 w-full">
      <div className="relative">
        {/* Slider Container */}
        <div
          ref={containerRef}
          className="flex gap-6 overflow-x-hidden scroll-smooth"
        >
          {screenshots.map((screenshot) => (
            <div
              key={screenshot.id}
              className="relative flex-shrink-0 w-96 transition-transform duration-300 hover:scale-105"
            >
              {/* Screenshot Card */}
              <div className="rounded-xl overflow-hidden shadow-lg border-2 border-neutral-300 hover:border-neutral-500 transition bg-white h-full flex flex-col">
                {/* Image Container */}
                <div className="relative h-48 bg-gradient-to-br from-neutral-100 to-neutral-200 overflow-hidden">
                  <Image
                    src={screenshot.image}
                    alt={screenshot.title}
                    fill
                    className="object-cover"
                    sizes="400px"
                  />
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-grow">
                  <h4 className="font-bold text-neutral-900 text-sm mb-2">
                    {screenshot.title}
                  </h4>
                  <p className="text-xs text-neutral-600 flex-grow">
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
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-6 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg border-2 border-neutral-300 hover:bg-neutral-100 transition group"
        >
          <span className="text-neutral-700 font-bold text-lg">←</span>
        </button>

        {/* Right Arrow Button */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-6 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg border-2 border-neutral-300 hover:bg-neutral-100 transition group"
        >
          <span className="text-neutral-700 font-bold text-lg">→</span>
        </button>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-6">
        {screenshots.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === 0 ? "w-8 bg-neutral-600" : "w-2 bg-neutral-300"
            }`}
          />
        ))}
      </div>

      {/* Info Text */}
      <p className="text-center text-xs text-neutral-500 mt-4">
        💡 Swipe oder klick auf die Pfeile zum durchschauen
      </p>
    </div>
  );
}
