"use client"

import { useCallback, useEffect, useState } from "react"
import { supabaseBrowser } from "@/lib/supabase/client"
import WeekGrid from "@/components/week-grid"
import type { Session } from "@supabase/supabase-js"

type Ev = {
  id: string; slug: string; title: string; status: string; category: string
  day: string; start_time: string | null; luma_url: string | null
  host_org: string | null; host_email: string | null
}
type Cat = { key: string; name: string; color: string }

const supabase = supabaseBrowser()
const DAYS = [
  { d: "2026-10-19", w: "Mon", n: 19 }, { d: "2026-10-20", w: "Tue", n: 20 },
  { d: "2026-10-21", w: "Wed", n: 21 }, { d: "2026-10-22", w: "Thu", n: 22 },
  { d: "2026-10-23", w: "Fri", n: 23 }, { d: "2026-10-24", w: "Sat", n: 24 },
]
const mins = (t: string | null) => {
  const m = t?.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 0
  return ((+m[1] % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + +m[2]
}

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [mode, setMode] = useState<"magic" | "password">("magic")
  const [pw, setPw] = useState("")
  const [events, setEvents] = useState<Ev[]>([])
  const [cats, setCats] = useState<Cat[]>([])
  const [clicks, setClicks] = useState<Record<string, number>>({})
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [edit, setEdit] = useState<Ev | null>(null)
  const [err, setErr] = useState("")
  const [notice, setNotice] = useState("")
  const [seg, setSeg] = useState<"all" | "queue" | "nolink" | "grid">("all")
  const [q, setQ] = useState("")

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
    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) setErr(error.message)
      return
    }
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: `${location.origin}/admin` },
    })
    error ? setErr(error.message.includes("rate limit")
      ? "Email rate limit hit. Use the password option, or wait an hour."
      : error.message) : setSent(true)
  }

  const openEdit = (e: Ev) => { setErr(""); setEdit(e); history.pushState({ edit: 1 }, "") }
  const closeEdit = useCallback(() => { if (history.state?.edit) history.back(); else setEdit(null) }, [])
  useEffect(() => {
    const onPop = () => setEdit(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeEdit() }
    window.addEventListener("popstate", onPop)
    window.addEventListener("keydown", onKey)
    return () => { window.removeEventListener("popstate", onPop); window.removeEventListener("keydown", onKey) }
  }, [closeEdit])

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
    closeEdit()
    setNotice("Saved.")
    setTimeout(() => setNotice(""), 2500)
    load()
  }

  const catBy = Object.fromEntries(cats.map(c => [c.key, c]))
  const live = events.filter(e => e.status !== "declined")
  const queue = events.filter(e => e.status === "in_review")
  const published = live.filter(e => e.status === "published")
  const nolink = live.filter(e => !e.luma_url)
  const totalClicks = Object.values(clicks).reduce((a, b) => a + b, 0)

  const ql = q.trim().toLowerCase()
  let list = seg === "queue" ? queue : seg === "nolink" ? nolink : live
  if (ql) list = list.filter(e =>
    [e.title, e.host_org, e.host_email, catBy[e.category]?.name].some(v => v?.toLowerCase().includes(ql)))

  if (!ready) return null

  if (!session) return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <p className="font-pixel text-xs uppercase tracking-[0.12em] text-ember">Admin console</p>
      <h1 className="mt-1 font-headline text-3xl font-bold tracking-tight">Sign in_</h1>
      {sent ? (
        <p className="mt-4 text-sm text-ink-muted">Magic link sent to <b className="text-ink">{email}</b>. Open it on this device.</p>
      ) : (
        <form onSubmit={signIn} className="mt-5 grid gap-2.5">
          <div className="flex rounded-md border border-line p-0.5">
            {(["magic", "password"] as const).map(m => (
              <button key={m} type="button" onClick={() => { setMode(m); setErr("") }}
                className={`flex-1 rounded-[5px] px-3 py-1.5 font-pixel text-[11px] uppercase tracking-wide ${mode === m ? "bg-void-3 text-lavender" : "text-ink-faint"}`}>
                {m === "magic" ? "Magic link" : "Password"}
              </button>
            ))}
          </div>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@sactechweek.org" autoComplete="email"
            className="rounded-md border border-line bg-void-2 px-3.5 py-3 text-sm outline-none focus:border-ember" />
          {mode === "password" && (
            <input type="password" required value={pw} onChange={e => setPw(e.target.value)}
              placeholder="Password" autoComplete="current-password"
              className="rounded-md border border-line bg-void-2 px-3.5 py-3 text-sm outline-none focus:border-ember" />
          )}
          <button className="rounded-md bg-electric p-3 font-headline font-semibold text-white shadow-[0_0_24px_rgba(111,29,255,.45)] active:scale-[.975]">
            {mode === "magic" ? "Send magic link" : "Sign in"}
          </button>
          {err && <p className="text-sm text-bad">{err}</p>}
          <p className="text-xs text-ink-faint">Organizers only. Your email has to be on the admin list.</p>
        </form>
      )}
    </main>
  )

  const stat = (label: string, value: number | string, tone?: string) => (
    <div className="rounded-md border border-line bg-void-2 px-3.5 py-3">
      <span className={`block font-headline text-2xl font-bold leading-tight tracking-tight ${tone ?? ""}`}>{value}</span>
      <span className="font-pixel text-[10px] uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  )

  const row = (e: Ev) => (
    <button key={e.id} onClick={() => openEdit(e)}
      className="relative grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line px-4 py-3.5 pl-5 text-left transition-colors last:border-b-0 hover:bg-void-3">
      <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-sm" style={{ background: catBy[e.category]?.color }} />
      <span className="truncate font-headline text-[15px] font-semibold tracking-tight">{e.title}</span>
      <span className="row-span-2 flex flex-col items-end gap-1.5">
        <span className={`rounded-sm border px-2 py-0.5 font-pixel text-[10px] uppercase ${
          e.status === "published" ? "border-ok/40 text-ok"
          : e.status === "in_review" ? "border-warn/50 text-warn"
          : "border-line text-ink-faint"}`}>{e.status.replace("_", " ")}</span>
        {!e.luma_url && <span className="rounded-sm border border-bad/40 px-2 py-0.5 font-pixel text-[10px] uppercase text-bad">No link</span>}
      </span>
      <span className="truncate text-[12.5px] text-ink-muted">
        {e.start_time ?? "time TBD"} · <span style={{ color: catBy[e.category]?.color }}>{catBy[e.category]?.name}</span> · {e.host_org ?? "no host"} · <b className="text-ink">{clicks[e.id] ?? 0}</b> clicks
      </span>
    </button>
  )

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-5 pb-24 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3 pt-8">
        <div>
          <a href="/" className="font-pixel text-[11px] uppercase tracking-wide text-ink-faint hover:text-lavender">← Attendee calendar</a>
          <p className="mt-2 font-pixel text-xs uppercase tracking-[0.12em] text-ember">Admin console</p>
          <h1 className="mt-1 font-headline text-[34px] font-bold tracking-tight">Events_</h1>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-muted hover:text-ink">
          Sign out · {session.user.email}
        </button>
      </header>

      {isAdmin === false && (
        <p className="mt-5 rounded-md border border-warn/50 bg-warn/10 p-3.5 text-sm leading-relaxed">
          Signed in, but <b>{session.user.email}</b> is not on the admin list, so you are seeing the public view only.
          Add this email to the <code className="font-pixel text-xs">admins</code> table in Supabase.
        </p>
      )}
      {notice && <p className="mt-4 rounded-md border border-ok/40 bg-ok/10 p-3 text-sm">{notice}</p>}
      {err && !edit && <p className="mt-4 rounded-md border border-bad/40 bg-bad/10 p-3 text-sm">{err}</p>}

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {stat("Events", live.length)}
        {stat("Published", published.length, "text-ok")}
        {stat("In queue", queue.length, queue.length ? "text-warn" : "")}
        {stat("Missing link", nolink.length, nolink.length ? "text-bad" : "text-ok")}
        {stat("Luma clicks", totalClicks, "text-lavender")}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {([["all", "All"], ["queue", `Queue ${queue.length}`], ["nolink", `Missing link ${nolink.length}`], ["grid", "Week grid"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setSeg(k)}
            className={`rounded-full border px-4 py-2 text-[13px] transition-colors active:scale-95 ${seg === k ? "border-electric text-ink shadow-[0_0_12px_rgba(111,29,255,.3)]" : "border-line text-ink-muted hover:text-ink"}`}>
            {label}
          </button>
        ))}
        <input value={q} onChange={e => setQ(e.target.value)} type="search" placeholder="Search"
          className="ml-auto w-40 rounded-md border border-line bg-void-2 px-3.5 py-2 text-sm outline-none placeholder:text-ink-faint focus:border-ember sm:w-56" />
      </div>

      {seg === "grid" ? (
        <WeekGrid events={live} cats={cats} showStatus onOpen={e => openEdit(e as Ev)} />
      ) : (
        DAYS.map(d => {
          const es = list.filter(e => e.day === d.d).sort((a, b) => mins(a.start_time) - mins(b.start_time))
          if (!es.length) return null
          return (
            <section key={d.d} className="mt-6">
              <div className="mb-2 flex items-center gap-2.5 font-pixel text-xs uppercase tracking-[0.12em] text-ink-faint">
                {d.w} Oct {d.n} · {es.length}<span className="h-px flex-1 bg-line" />
              </div>
              <div className="overflow-hidden rounded-md border border-line bg-void-2">{es.map(row)}</div>
            </section>
          )
        })
      )}
      {seg !== "grid" && !list.length && (
        <div className="mt-8 rounded-md border border-dashed border-line p-8 text-center text-sm text-ink-faint">
          <span className="mb-1 block font-pixel text-[13px] text-lavender">CLEAR_</span>
          Nothing here. {seg === "queue" ? "The queue is empty." : "Try another filter."}
        </div>
      )}

      {edit && (
        <>
          <div className="fixed inset-0 z-40 bg-[rgba(5,5,12,.6)] backdrop-blur-sm" onClick={closeEdit} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-xl border border-b-0 border-line bg-void-2 p-5 pb-8 sm:bottom-auto sm:top-1/2 sm:max-w-lg sm:-translate-y-1/2 sm:rounded-xl sm:border-b"
            role="dialog" aria-modal="true">
            <button onClick={closeEdit} aria-label="Close"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md text-ink-faint hover:text-ink">✕</button>
            <h2 className="pr-8 font-headline text-xl font-bold tracking-tight">{edit.title}</h2>
            <p className="mt-0.5 text-xs text-ink-faint">{edit.host_org} · {edit.host_email ?? "no email"} · {clicks[edit.id] ?? 0} clicks</p>
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
                <button type="button" onClick={closeEdit} className="rounded-md border border-line bg-void-3 p-3 font-headline font-semibold active:scale-[.975]">Cancel</button>
              </div>
            </form>
          </div>
        </>
      )}
    </main>
  )
}
