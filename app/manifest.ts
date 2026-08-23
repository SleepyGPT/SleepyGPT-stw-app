import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sac Tech Week",
    short_name: "STW",
    description: "Every Sac Tech Week 2026 event in one place.",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    background_color: "#0B0B14",
    theme_color: "#0B0B14",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  }
}
