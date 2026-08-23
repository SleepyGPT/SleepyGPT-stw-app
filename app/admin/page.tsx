"use client"

import { useCallback, useEffect, useState } from "react"
import { supabaseBrowser } from "@/lib/supabase/client"
import type { Session } from "@supabase/supabase-js"

type Ev = {
  id: string; slug: string; title: string; status: string; category: string
  day: string; start_time: string | null; luma_url: string | null
  host_org: string | null; host_email: string | null
}
type Cat = { key: string; name: string; color: string }

const supabase = supabaseBrowser()

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [events, setEvents] = useState<Ev[]>([])
  const [cats, setCats] = useState<Cat[]>([])
  const [clicks, setClicks] = useState<Record<string, number>>({})
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [edit, setEdit] = useState<Ev | null>(null)
  const [err, setErr] = useState("")
  const [seg, setSeg] = useState<"all" | "queue" | "published" | "nolink">("all")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const load = useCallback(async () => {
    const [ev, ct, ck, ad] = await Promise.all([
      supabase.from("events").select("id,slug,title,status,category,day,start_time,luma_url,host_org,host_email"),
      supabase.from("categories").select("key,name,color").order("sort"),
      supabase.from("link_clicks").select("event_id"),
      supabase.from("admins").select("email").limit(1),
    ])
    setEvents(ev.data ?? [])
    setCats(ct.data ?? [])
    setIsAdmin((ad.data ?? []).length > 0)
    const c: Record<string, number> = {}
    for (const r of ck.data ?? []) c[r.event_id] = (c[r.event_id] ?? 0) + 1
    setClicks(c)
  }, [])
  useEffect(() => { if (session) load() }, [session, load])

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: `${location.origin}/admin` },
    })
    error ? setErr(error.message) : setSent(true)
  }

  const save = async (patch: Partial<Ev>) => {
    if (!edit) return
    setErr("")
    const { error } = await supabase.from("events").update(patch).eq("id", edit.id)
    if (error) {
      setErr(error.message.includes("published_needs_luma")
        ? "Blocked: a published event needs a Luma link. Paste the link or keep it a draft."
        : error.message)
      return
    }
    setEdit(null)
    setNotice("Saved.")
    setTimeout(() => setNotice(""), 2500)
    load()
  }

  const catBy = Object.fromEntries(cats.map(c => [c.key, c]))
  const queue = events.filter(e => e.status === "in_review")
  let rest = events.filter(e => e.status !== "in_review" && e.status !== "declined")
  if (seg === "published") rest = rest.filter(e => e.status === "published")
  if (seg === "nolink") rest = rest.filter(e => !e.luma_url)

  if (!ready) return null

  if (!session) return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <p className="font-pixel text-xs uppercase tracking-[0.12em] text-ember">Admin console</p>
      <h1 className="mt-1 font-headline text-3xl font-bold tracking-tight">Sign in_</h1>
      {sent ? (
        <p className="mt-4 text-sm text-ink-muted">Magic link sent to <b className="text-ink">{email}</b>. Open it on this device.</p>
      ) : (
        <form onSubmit={signIn} className="mt-5 grid gap-2.5">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@sactechweek.org" autoComplete="email"
            className="rounded-md border border-line bg-void-2 px-3.5 py-3 text-sm outline-none focus:border-ember" />
          <button className="rounded-md bg-electric p-3 font-headline font-semibold text-white shadow-[0_0_24px_rgba(111,29,255,.45)] active:scale-[.975]">
            Send magic link
          </button>
          {err && <p className="text-sm text-bad">{err}</p>}
          <p className="text-xs text-ink-faint">Organizers only. Your email has to be on the admin list.</p>
        </form>
      )}
    </main>
  )

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 pb-20 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3 pt-8">
        <div>
          <p className="font-pixel text-xs uppercase tracking-[0.12em] text-ember">Admin console</p>
          <h1 className="mt-1 font-headline text-3xl font-bold tracking-tight">Events_</h1>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-muted">
          Sign out · {session.user.email}
        </button>
      </header>

      {isAdmin === false && (
        <p className="mt-5 rounded-md border border-warn/50 bg-warn/10 p-3.5 text-sm">
          Signed in, but <b>{session.user.email}</b> is not on the admin list, so you are seeing the public view only.
          Add this email to the <code className="font-pixel text-xs">admins</code> table in Supabase.
        </p>
      )}
      {notice && <p className="mt-4 rounded-md border border-ok/40 bg-ok/10 p-3 text-sm">{notice}</p>}
      {err && !edit && <p className="mt-4 rounded-md border border-bad/40 bg-bad/10 p-3 text-sm">{err}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        {([["all", `All ${events.filter(e => e.status !== "declined").length}`],
           ["queue", `Queue ${queue.length}`],
           ["published", `Published ${events.filter(e => e.status === "published").length}`],
           ["nolink", `Missing link ${events.filter(e => e.status !== "declined" && !e.luma_url).length}`]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setSeg(k)}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors active:scale-95 ${seg === k ? "border-electric text-ink shadow-[0_0_12px_rgba(111,29,255,.3)]" : "border-line text-ink-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      {(seg === "all" || seg === "queue") && queue.length > 0 && (
        <section className="mt-6">
          <div className="mb-2.5 flex items-center gap-2.5 font-pixel text-xs uppercase tracking-[0.12em] text-warn">
            Queue · {queue.length} waiting<span className="h-px flex-1 bg-line" />
          </div>
          <div className="grid gap-2.5">
            {queue.map(e => (
              <div key={e.id} className="rounded-md border border-line bg-void-2 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-headline font-semibold">{e.title}</h3>
                  <span className="font-pixel text-[10px] uppercase text-ink-faint">{e.day} · {e.start_time}</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">{e.host_org} · {e.host_email ?? "no email"} · {e.luma_url ? "has Luma link" : <span className="text-bad">no Luma link</span>}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { setErr(""); setEdit(e) }} className="rounded-md bg-electric px-3.5 py-2 text-sm font-semibold text-white active:scale-95">Review</button>
                  <button onClick={async () => {
                    const { error } = await supabase.from("events").update({ status: "declined" }).eq("id", e.id)
                    error ? setErr(error.message) : load()
                  }} className="rounded-md border border-bad/40 px-3.5 py-2 text-sm text-bad active:scale-95">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {seg !== "queue" && <section className="mt-6">
        <div className="mb-2.5 flex items-center gap-2.5 font-pixel text-xs uppercase tracking-[0.12em] text-ink-faint">
          All events · {rest.length}<span className="h-px flex-1 bg-line" />
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-void-2">
          {rest.sort((a, b) => a.day.localeCompare(b.day)).map(e => (
            <button key={e.id} onClick={() => { setErr(""); setEdit(e) }}
              className="relative grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line p-3 pl-4 text-left last:border-b-0 hover:bg-void-3">
              <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-sm" style={{ background: catBy[e.category]?.color }} />
              <span className="truncate font-headline text-sm font-semibold">{e.title}</span>
              <span className="row-span-2 flex flex-col items-end gap-1">
                <span className={`rounded-sm border px-1.5 py-0.5 font-pixel text-[9.5px] uppercase ${e.status === "published" ? "border-ok/40 text-ok" : "border-line text-ink-faint"}`}>{e.status}</span>
                {!e.luma_url && <span className="rounded-sm border border-bad/40 px-1.5 py-0.5 font-pixel text-[9.5px] uppercase text-bad">No link</span>}
              </span>
              <span className="truncate text-[11.5px] text-ink-faint">{e.day.slice(5)} · {e.start_time} · {catBy[e.category]?.name} · {clicks[e.id] ?? 0} clicks</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-right font-pixel text-[10.5px] uppercase text-ink-faint">
          {Object.values(clicks).reduce((a, b) => a + b, 0)} outbound clicks to registration
        </p>
      </section>}

      {edit && (
        <>
          <div className="fixed inset-0 z-40 bg-[rgba(5,5,12,.6)] backdrop-blur-sm" onClick={() => setEdit(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-xl border border-b-0 border-line bg-void-2 p-5 pb-8 sm:bottom-auto sm:top-1/2 sm:max-w-lg sm:-translate-y-1/2 sm:rounded-xl sm:border-b"
            role="dialog" aria-modal="true">
            <h2 className="font-headline text-xl font-bold tracking-tight">Edit event</h2>
            <form className="mt-4 grid gap-3" onSubmit={ev => {
              ev.preventDefault()
              const f = new FormData(ev.currentTarget)
              save({
                title: String(f.get("title")),
                status: String(f.get("status")),
                luma_url: String(f.get("luma")).trim() || null,
                start_time: String(f.get("time")).trim() || null,
              })
            }}>
              <label className="grid gap-1 text-xs font-semibold text-ink-muted">Title
                <input name="title" defaultValue={edit.title} className="rounded-md border border-line bg-void px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-ember" />
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="grid gap-1 text-xs font-semibold text-ink-muted">Status
                  <select name="status" defaultValue={edit.status} className="rounded-md border border-line bg-void px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-ember">
                    <option value="draft">draft</option><option value="in_review">in_review</option>
                    <option value="published">published</option><option value="declined">declined</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-ink-muted">Start time
                  <input name="time" defaultValue={edit.start_time ?? ""} placeholder="6:00 PM" className="rounded-md border border-line bg-void px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-ember" />
                </label>
              </div>
              <label className="grid gap-1 text-xs font-semibold text-ink-muted">Luma link
                <input name="luma" defaultValue={edit.luma_url ?? ""} placeholder="https://lu.ma/..." className="rounded-md border border-line bg-void px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-ember" />
              </label>
              {err && <p className="rounded-md border border-bad/40 bg-bad/10 p-2.5 text-sm">{err}</p>}
              <div className="grid gap-2">
                <button className="rounded-md bg-electric p-3 font-headline font-semibold text-white shadow-[0_0_24px_rgba(111,29,255,.45)] active:scale-[.975]">Save</button>
                <button type="button" onClick={() => setEdit(null)} className="rounded-md border border-line bg-void-3 p-3 font-headline font-semibold active:scale-[.975]">Cancel</button>
              </div>
            </form>
          </div>
        </>
      )}
    </main>
  )
}
