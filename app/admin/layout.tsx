import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "STW Admin",
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "STW Admin" },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
