import { supabaseServer } from "@/lib/supabase/server"

export const revalidate = 60

export default async function Home() {
  let count: number | null = null
  let error: string | null = null
  try {
    const supabase = await supabaseServer()
    const res = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
    count = res.count
    error = res.error?.message ?? null
  } catch {
    error = "Supabase env vars not set yet"
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-pixel text-xs uppercase tracking-[0.14em] text-lavender">
        Sac Tech Week · Oct 19-24
      </p>
      <h1 className="font-headline text-4xl font-bold tracking-tight">
        STW Calendar_
      </h1>
      <p className="text-sm text-ink-muted">
        {error
          ? `Wiring check: ${error}`
          : `Wiring check: connected. ${count} events in the database.`}
      </p>
    </main>
  )
}
