import { supabaseServer } from "@/lib/supabase/server"
import App from "@/components/stw-app"

export const revalidate = 60

export default async function Home() {
  const supabase = await supabaseServer()
  const [{ data: events }, { data: cats }, { data: settings }, { data: glossary }] = await Promise.all([
    supabase.from("events").select("*"),
    supabase.from("categories").select("key,name,color").order("sort"),
    supabase.from("app_settings").select("key,value"),
    supabase.from("glossary").select("term,definition").order("sort"),
  ])
  const get = (k: string) => (settings ?? []).find(s => s.key === k)?.value
  return (
    <App
      events={events ?? []}
      cats={cats ?? []}
      flags={get("flags") ?? { free: "Free", paid: "Ticketed", newcomer: "New to tech", newcomer_on: true }}
      copy={get("copy") ?? { start_intro: "You don't need a job in tech to be here." }}
      glossary={glossary ?? []}
    />
  )
}
