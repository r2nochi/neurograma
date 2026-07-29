import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Display: Fraunces, con sus ejes ópticos, tiene el aire de lámina científica
// antigua sin caer en la serif editorial de siempre.
const display = Fraunces({
  variable: "--f-display",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

// Dato: IBM Plex Mono se lee como instrumento de laboratorio.
const dato = IBM_Plex_Mono({
  variable: "--f-dato",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const cuerpo = IBM_Plex_Sans({
  variable: "--f-cuerpo",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Neurograma — anatomía interactiva del cerebro",
  description:
    "Recorre las regiones del cerebro humano y descubre qué hace cada una, qué se rompe cuando falla, y un dato que probablemente no sabías.",
  openGraph: {
    title: "Neurograma",
    description:
      "Nueve regiones del cerebro, lo que hacen y lo que nadie te contó de ellas.",
    type: "website",
    locale: "es_PE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${dato.variable} ${cuerpo.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
