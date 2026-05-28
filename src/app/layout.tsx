import type { Metadata, Viewport } from "next"
import { Manrope, Inter } from "next/font/google"
import { CookieBanner } from "@/components/CookieBanner"
import "./globals.css"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "bemoo",
    template: "%s · bemoo",
  },
  description: "Plataforma de gestão operacional — checklists, intercorrências, rastreabilidade, planos de ação e captura de demandas.",
  keywords: ["gestão operacional", "checklist", "plano de ação", "rastreabilidade", "SaaS"],
  manifest: "/manifest.json",
  openGraph: {
    siteName: "bemoo",
    locale: "pt_BR",
    type: "website",
  },
}

export const viewport: Viewport = {
  themeColor: "#1F4E4A",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${inter.variable}`}>
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}
