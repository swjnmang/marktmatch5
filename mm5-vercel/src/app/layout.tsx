import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Markt-Match 5 – Wirtschaftsplanspiel kostenlos für Schulen & Unternehmen",
  description:
    "Markt-Match 5 ist ein kostenloses Wirtschaftsplanspiel: Produktionsunternehmen simulieren, Entscheidungen treffen (Preis, Produktion, Marketing) und Ergebnisse live auswerten. Ideal für Unterricht, Workshops und Trainings.",
  keywords: [
    "Wirtschaftsplanspiel",
    "Planspiel Wirtschaft kostenlos",
    "Planspiel",
    "Planspiel Produktionsunternehmen",
    "Unternehmensplanspiel",
    "Planspiel Schule",
  ],
  openGraph: {
    title: "Markt-Match 5 – Wirtschaftsplanspiel kostenlos",
    description:
      "Digitales Planspiel: Produktionsunternehmen simulieren, Entscheidungen zu Preis & Produktion treffen und Ergebnisse live sehen.",
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Markt-Match 5 – Wirtschaftsplanspiel",
    description:
      "Kostenloses Planspiel für Schule & Training: Produktion, Preis, Markt – alles im Browser.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-transparent text-neutral-900`}
      >
        {children}
      </body>
    </html>
  );
}

