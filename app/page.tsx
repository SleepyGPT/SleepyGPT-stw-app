import { supabaseServer } from "@/lib/supabase/server"
import Calendar from "@/components/calendar"

export const revalidate = 60

export default async function Home() {
  const supabase = await supabaseServer()
  const [{ data: events }, { data: cats }, { data: settings }] = await Promise.all([
    supabase.from("events").select("*"),
    supabase.from("categories").select("key,name,color").order("sort"),
    supabase.from("app_settings").select("key,value"),
  ])
  const flags = (settings ?? []).find(s => s.key === "flags")?.value ?? {
    free: "Free", paid: "Ticketed", newcomer: "New to tech", newcomer_on: true,
  }
  return <Calendar events={events ?? []} cats={cats ?? []} flags={flags} />
}
