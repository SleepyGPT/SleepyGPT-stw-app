import type { Metadata, Viewport } from "next"
import { Space_Grotesk, Manrope, Pixelify_Sans } from "next/font/google"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
})
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-manrope",
})
const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixelify",
})

export const metadata: Metadata = {
  title: "Sac Tech Week",
  description:
    "Every Sac Tech Week 2026 event in one place. Oct 19-24, Sacramento.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "STW" },
}

export const viewport: Viewport = {
  themeColor: "#0B0B14",
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${manrope.variable} ${pixelify.variable}`}
      >
        {children}
      </body>
    </html>
  )
}
