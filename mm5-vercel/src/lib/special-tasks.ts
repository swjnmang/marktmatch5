/**
 * Vorgefertigte Spezialaufträge für Gruppen
 */

export const PREDEFINED_TASKS = [
  {
    id: "presentation-poster",
    title: "Unternehmensplakat gestalten",
    description: `Gestaltet ein kreatives Plakat, das eure Gruppe und euer Smartwatch-Unternehmen präsentiert. 

Euer Plakat sollte enthalten: 
- Euren Unternehmungsnamen (groß und deutlich sichtbar)
- Die Namen aller Gruppenmitglieder
- Euer Logo oder einen coolen Slogan
- Das besondere Merkmal eurer Smartwatch (z.B. super Design, günstig, robust, innovativ)
- Eure Zielgruppe: Für wen ist eure Smartwatch gedacht?
- Ein kleines visuelles Element oder eine Skizze eures Produkts
- Ein Fun Fact oder eine kreative Zeichnung

Tipps: Nutzt Farben, macht es ansprechend und habt Spaß dabei! Nach dieser Aufgabe stellt jede Gruppe ihr Plakat den anderen vor (maximal 2 Minuten). Es geht darum, euch als Team zu präsentieren und einen ersten Eindruck von eurer Unternehmensidentität zu vermitteln.`,
  },
  {
    id: "marketing-concept",
    title: "Marketingkonzept entwickeln",
    description: `Erarbeitet ein kurzes Marketingkonzept für eure Smartwatches. Gute Produkte verkaufen sich nicht von allein – ein cleveres Marketingkonzept hilft euch dabei, eure günstigen Smartwatches für eine junge Zielgruppe bekannt zu machen und Kunden zu überzeugen.

Euer Konzept sollte enthalten:
- Das Besondere an eurem Smartwatch: Was unterscheidet euch von der Konkurrenz? (z.B. Farbenvielfalt, innovative Features, besonders günstig, umweltfreundlich)
- Euren Werbeslogan: Ein cooler Spruch, der im Kopf bleibt!
- Eine Skizze eines Werbeplatakats: Was ist darauf zu sehen? Welche Farben und Schrift?
- Eine Idee für einen Werbespot: Was passiert darin? (nur als Idee, muss nicht gedreht werden)
- Weitere Marketing-Ideen: z.B. Social-Media-Kampagnen, Influencer-Kooperationen, Rabattaktionen
- Eure Zielgruppe: Wer soll eure Smartwatch kaufen?

Bereitet eine kurze Präsentation vor (maximal 3 Minuten pro Gruppe), in der ihr eure Marketingidee vorstellt. Haltet es einfach und kreativ – es geht darum, erste Ideen zu entwickeln!`,
  },
  {
    id: "sustainability-concept",
    title: "Nachhaltigkeitskonzept erarbeiten",
    description: `Entwickelt ein Nachhaltigkeitskonzept für eure Smartwatch und euer Unternehmen. Nachhaltigkeits-Gedanken werden immer wichtiger – Kunden möchten wissen, dass ihre Produkte verantwortungsvoll hergestellt werden.

Überlegt zusammen:
- Wie könnte eure Smartwatch umweltfreundlicher produziert werden? (z.B. recycelte Materialien, energieeffiziente Produktion, minimale Verpackung)
- Wie lang sollen eure Smartwatches halten? Was ist daran nachhaltig?
- Wie könnt ihr eure Kunden zum nachhaltigen Umgang mit ihrer Smartwatch ermutigen? (z.B. Reparaturservice, Recyclingprogramm)
- Welche Zertifizierungen oder Standards könnten eure Smartwatches erfüllen? (z.B. Fairtrade, CO2-neutral, Made Fair)
- Wie könnte euer Unternehmen gesellschaftlich verantwortlich handeln? (z.B. Spenden, Schulprojekte, transparente Lieferketten)

Dokumentiert eure Ideen stichpunktartig. Später könnt ihr diese in eure Marketing-Strategie integrieren und damit potenzielle Kunden noch besser überzeugen!`,
  },
  {
    id: "campaign-planning",
    title: "Werbekampagne mit Budget planen",
    description: `Plant eine konkrete Werbekampagne für eure Smartwatches mit einem Budget von €5.000. Ihr müsst strategisch entscheiden, wie ihr euer Werbebudget am effektivsten einsetzt, um eure Zielgruppe zu erreichen.

Eure Kampagne sollte enthalten:
- Kampagnen-Titel: Wie heißt eure Werbekampagne? (z.B. "Wrist Watch Revolution", "Time for Change")
- Zielgruppe definieren: Wer soll eure Smartwatch kaufen? (Alter, Interessen, Budget)
- Kommunikationsbotschaft: Was ist eure Kernbotschaft? Warum sollte jemand eure Smartwatch kaufen?
- Werbekanäle und Budget-Verteilung: Wie verteilt ihr die €5.000? 
  * Social Media (Instagram, TikTok): €?
  * Influencer-Kooperationen: €?
  * Werbeplakate/Print: €?
  * Online-Anzeigen (Google, Facebook): €?
  * Event-Marketing/Samples: €?
- Erwartete Reichweite: Wie viele Menschen könnt ihr mit eurer Kampagne erreichen?
- Erfolgsmessung: Wie messt ihr, ob eure Kampagne erfolgreich war?

Bereitet eine kurze Präsentation vor und erklärt eure Budget-Entscheidungen – wer von euch entscheidet über das Marketing und warum?`,
  },
];

export function getTaskTitle(taskId: string): string {
  const task = PREDEFINED_TASKS.find(t => t.id === taskId);
  return task?.title || "Spezialauftrag";
}

export function getTaskDescription(taskId: string): string {
  const task = PREDEFINED_TASKS.find(t => t.id === taskId);
  return task?.description || "";
}
