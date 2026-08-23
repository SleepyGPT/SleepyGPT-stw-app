import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// The tracked handoff: record one click, then send them to Luma. 302 so
// browsers never cache the destination and skip the counter.
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: ev } = await supabase
    .from("events").select("id,luma_url").eq("slug", slug).single()
  if (!ev?.luma_url) return NextResponse.redirect(new URL("/", req.url), 302)

  await supabase.from("link_clicks").insert({
    event_id: ev.id,
    src: req.nextUrl.searchParams.get("src") ?? null,
    referrer: req.headers.get("referer"),
    user_agent: req.headers.get("user-agent"),
  })
  return NextResponse.redirect(ev.luma_url, 302)
}
