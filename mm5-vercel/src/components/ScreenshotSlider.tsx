"use client";

import { useEffect, useRef, useState } from "react";

interface GameFeature {
  id: number;
  icon: string;
  title: string;
  description: string;
  details: string[];
}

const gameFeatures: GameFeature[] = [
  {
    id: 1,
    icon: "🏭",
    title: "Produktionsmanagement",
    description: "Steuere deine Produktion strategisch",
    details: [
      "Wähle aus verschiedenen Maschinen mit unterschiedlichen Kapazitäten",
      "Plane deine Produktionsmenge pro Periode",
      "Verwalte dein Lager und vermeide Überproduktion",
      "Investiere in Forschung & Entwicklung für Kostensenkung"
    ]
  },
  {
    id: 2,
    icon: "💰",
    title: "Preisgestaltung & Markt",
    description: "Finde den optimalen Verkaufspreis",
    details: [
      "Setze deinen Verkaufspreis basierend auf Kosten und Konkurrenz",
      "Beobachte die Marktreaktionen in Echtzeit",
      "Kaufe Marktanalysen für detaillierte Einblicke",
      "Passe deine Strategie an die Marktnachfrage an"
    ]
  },
  {
    id: 3,
    icon: "📊",
    title: "Finanzplanung",
    description: "Halte deine Finanzen im Gleichgewicht",
    details: [
      "Überwache dein Startkapital und laufende Kosten",
      "Vermeide negative Kapitalstände (Zinsen!)",
      "Analysiere Gewinne und Verluste jeder Periode",
      "Plane langfristige Investitionen strategisch"
    ]
  },
  {
    id: 4,
    icon: "🎯",
    title: "Wettbewerb & Ranking",
    description: "Tritt gegen andere Teams an",
    details: [
      "Konkurriere mit bis zu 10 Teams gleichzeitig",
      "Beobachte die Live-Rangliste nach jeder Periode",
      "Analysiere Konkurrenzstrategien (wenn Marktanalyse gekauft)",
      "Sichere dir Bonuspunkte durch Spezialaufträge"
    ]
  },
  {
    id: 5,
    icon: "🔬",
    title: "Forschung & Entwicklung",
    description: "Investiere in die Zukunft",
    details: [
      "Reduziere variable Stückkosten durch F&E-Investitionen",
      "Erreiche Kostensenkungen ab einem Schwellenwert",
      "Einmalige Effekte für langfristigen Vorteil",
      "Plane F&E-Budget strategisch über mehrere Perioden"
    ]
  },
  {
    id: 6,
    icon: "👨‍🏫",
    title: "Spielleiter-Steuerung",
    description: "Flexibles Spielmanagement",
    details: [
      "Spielleiter steuert Periodenstart und -ende",
      "Vergabe von Spezialaufträgen möglich",
      "Echtzeit-Überwachung aller Gruppenentscheidungen",
      "Automatische Berechnung und Auswertung"
    ]
  },
  {
    id: 7,
    icon: "🤖",
    title: "Solo-Modus mit KI",
    description: "Übe gegen intelligente Gegner",
    details: [
      "Spiele allein ohne echte Teams",
      "KI-Gegner mit verschiedenen Strategien",
      "Automatische Periodenberechnung",
      "Perfekt zum Lernen und Ausprobieren"
    ]
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
    setCurrentIndex(Math.min(index, gameFeatures.length - 1));
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
          {gameFeatures.map((feature) => (
            <div
              key={feature.id}
              className="w-full flex-shrink-0 snap-center"
            >
              {/* Feature Card - Full Width */}
              <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-neutral-300 bg-white h-full flex flex-col mx-auto max-w-4xl">
                {/* Icon & Header */}
                <div className="bg-gradient-to-br from-sky-100 to-blue-50 p-10 text-center">
                  <div className="text-6xl mb-4">{feature.icon}</div>
                  <h4 className="font-bold text-neutral-900 text-2xl mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-neutral-600 text-base">
                    {feature.description}
                  </p>
                </div>

                {/* Details List */}
                <div className="p-8 flex-grow">
                  <ul className="space-y-4">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="text-sky-600 font-bold text-xl mt-0.5">✓</span>
                        <span className="text-neutral-700 text-base leading-relaxed">{detail}</span>
                      </li>
                    ))}
                  </ul>
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
          disabled={currentIndex === gameFeatures.length - 1}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 sm:translate-x-12 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg border-2 border-neutral-300 hover:bg-neutral-100 transition disabled:opacity-30 disabled:cursor-not-allowed group"
        >
          <span className="text-neutral-700 font-bold text-2xl">→</span>
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center gap-3 mt-8">
        {gameFeatures.map((_, index) => (
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
        {currentIndex + 1} / {gameFeatures.length} • Nutze die Pfeile oder klicke auf die Punkte
      </p>
    </div>
  );
}
