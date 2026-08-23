"use client"

import { useEffect, useMemo, useState } from "react"
import WeekGrid from "@/components/week-grid"

type Ev = {
  id: string; slug: string; title: string; description: string | null
  category: string; day: string; start_time: string | null; slot: string | null
  venue_name: string | null; is_free: boolean; newcomer: boolean
  host_org: string | null
}
type Cat = { key: string; name: string; color: string }
type Flags = { free: string; paid: string; newcomer: string; newcomer_on: boolean }
type Gloss = { term: string; definition: string }

const DAYS = [
  { d: "2026-10-19", w: "Mon", n: 19 }, { d: "2026-10-20", w: "Tue", n: 20 },
  { d: "2026-10-21", w: "Wed", n: 21 }, { d: "2026-10-22", w: "Thu", n: 22 },
  { d: "2026-10-23", w: "Fri", n: 23 }, { d: "2026-10-24", w: "Sat", n: 24 },
]
const SLOTS = ["Morning", "Afternoon", "Evening"]
const mins = (t: string | null) => {
  const m = t?.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 0
  return ((+m[1] % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + +m[2]
}

const TABS = [
  { k: "week", label: "Week", icon: <path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4" /> },
  { k: "mine", label: "My week", icon: <path d="M6 3h12v18l-6-4.5L6 21z" /> },
  { k: "start", label: "Start here", icon: <path d="M12 3l2.2 5.6L20 10.8l-4.4 4 1.2 6-4.8-3.2L7.2 20.8l1.2-6-4.4-4 5.8-2.2z" /> },
] as const

export default function App({ events, cats, flags, glossary, copy }: {
  events: Ev[]; cats: Cat[]; flags: Flags; glossary: Gloss[]
  copy: { start_intro: string }
}) {
  const [tab, setTab] = useState<"week" | "mine" | "start">("week")
  const [day, setDay] = useState(0)
  const [stars, setStars] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<Ev | null>(null)
  const [q, setQ] = useState("")
  const [view, setView] = useState<"list" | "grid">("list")

  useEffect(() => {
    try { setStars(new Set(JSON.parse(localStorage.getItem("stw-stars") ?? "[]"))) } catch {}
  }, [])
  const toggleStar = (id: string) => setStars(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    localStorage.setItem("stw-stars", JSON.stringify([...next]))
    return next
  })

  /* Sheet navigation that survives standalone mode: opening pushes a
     history entry, so the back button / back gesture closes the sheet
     instead of exiting the installed app. */
  const openSheet = (e: Ev) => { setOpen(e); history.pushState({ sheet: 1 }, "") }
  const closeSheet = () => { if (history.state?.sheet) history.back(); else setOpen(null) }
  useEffect(() => {
    const onPop = () => setOpen(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeSheet() }
    window.addEventListener("popstate", onPop)
    window.addEventListener("keydown", onKey)
    return () => { window.removeEventListener("popstate", onPop); window.removeEventListener("keydown", onKey) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const catBy = useMemo(() => Object.fromEntries(cats.map(c => [c.key, c])), [cats])
  const sorted = (list: Ev[]) => [...list].sort((a, b) => mins(a.start_time) - mins(b.start_time))

  const card = (e: Ev) => {
    const c = catBy[e.category]
    return (
      <button key={e.id} onClick={() => openSheet(e)}
        className="relative w-full rounded-md border border-line bg-void-2 p-3.5 pl-4 text-left transition-transform duration-150 active:scale-[.985]">
        <span className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-sm" style={{ background: c?.color }} />
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-pixel text-[10.5px] uppercase tracking-[0.1em]" style={{ color: c?.color }}>{c?.name}</span>
          <span className="font-pixel text-[11px] text-ink-faint">{DAYS.find(d => d.d === e.day)?.w} · {e.start_time}</span>
        </span>
        <span className="mt-1 block pr-8 font-headline text-[16.5px] font-semibold leading-tight tracking-tight">{e.title}</span>
        <span className="mt-1 block text-xs text-ink-muted">{e.venue_name ?? "Venue TBA"} · {e.host_org}</span>
        <span className="mt-2 flex gap-1.5">
          <span className={`rounded-sm border px-1.5 py-0.5 font-pixel text-[10px] uppercase tracking-wide ${e.is_free ? "border-ok/40 text-ok" : "border-line text-ink-muted"}`}>
            {e.is_free ? flags.free : flags.paid}
          </span>
          {e.newcomer && flags.newcomer_on && (
            <span className="rounded-sm border border-lavender/40 px-1.5 py-0.5 font-pixel text-[10px] uppercase tracking-wide text-lavender">{flags.newcomer}</span>
          )}
        </span>
        <span role="button" aria-label={`Star ${e.title}`} onClick={ev => { ev.stopPropagation(); toggleStar(e.id) }}
          className={`absolute right-2 top-8 grid h-9 w-9 place-items-center rounded-md ${stars.has(e.id) ? "text-lavender" : "text-ink-faint"}`}>
          <svg viewBox="0 0 24 24" className={`h-5 w-5 ${stars.has(e.id) ? "fill-lavender drop-shadow-[0_0_6px_rgba(199,168,255,.6)]" : "fill-none"}`} stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3.5l2.5 5.6 6 .6-4.6 4.1 1.3 6-5.2-3.1-5.2 3.1 1.3-6L3.5 9.7l6-.6z" />
          </svg>
        </span>
      </button>
    )
  }

  const group = (title: string, es: Ev[]) => es.length > 0 && (
    <section key={title} className="mt-5">
      <div className="mb-2.5 flex items-center gap-2.5 font-pixel text-xs uppercase tracking-[0.12em] text-ink-faint">
        {title}<span className="h-px flex-1 bg-line" />
      </div>
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">{es.map(card)}</div>
    </section>
  )

  const mast = (eyebrow: string, title: string, sub?: string) => (
    <header className="pb-1 pt-7 md:pt-10">
      <p className="font-pixel text-xs uppercase tracking-[0.12em] text-lavender">{eyebrow}</p>
      <h1 className="mt-1.5 font-headline text-4xl font-bold tracking-tight md:text-[42px]">{title}</h1>
      {sub && <p className="mt-2 max-w-md text-sm text-ink-muted">{sub}</p>}
    </header>
  )

  const ql = q.trim().toLowerCase()
  const matches = ql
    ? sorted(events.filter(e =>
        [e.title, e.host_org, e.venue_name, catBy[e.category]?.name, e.description]
          .some(v => v?.toLowerCase().includes(ql))))
    : []
  const weekList = sorted(events.filter(e => e.day === DAYS[day].d))
  const weekAll = events
  const mine = sorted(events.filter(e => stars.has(e.id)))
  const starters = sorted(events.filter(e => e.newcomer)).slice(0, 6)

  return (
    <div className="mx-auto md:grid md:max-w-6xl md:grid-cols-[218px_minmax(0,1fr)] md:border-x md:border-line">

      {/* nav: bottom tabs on mobile, sidebar on desktop */}
      <nav aria-label="Primary"
        className="dock z-30 flex px-2 py-1.5 md:sticky md:top-0 md:z-auto md:h-dvh md:flex-col md:gap-1 md:border-r md:border-line md:bg-void md:px-3.5 md:py-7">
        <div className="hidden md:block md:px-3 md:pb-6">
          <span className="block font-headline text-[22px] font-bold tracking-tight">STW_</span>
          <span className="font-pixel text-[10px] uppercase tracking-wide text-ink-faint">Oct 19-24 · 2026</span>
        </div>
        {TABS.map(t => (
          <button key={t.k} onClick={() => { setTab(t.k); window.scrollTo({ top: 0 }) }}
            className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 transition-colors active:scale-95 md:flex-none md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 ${tab === t.k ? "text-lavender md:bg-void-3" : "text-ink-faint md:hover:text-ink-muted"}`}>
            <svg viewBox="0 0 24 24" className={`h-5 w-5 fill-none stroke-current stroke-[1.7] ${tab === t.k ? "drop-shadow-[0_0_7px_rgba(199,168,255,.55)]" : ""}`} strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
            <span className="font-pixel text-[10px] uppercase tracking-wide md:text-xs">{t.label}</span>
            {t.k === "mine" && stars.size > 0 && (
              <span className="absolute right-[calc(50%-20px)] top-0 grid h-4 min-w-4 place-items-center rounded-full bg-electric px-1 font-pixel text-[9.5px] text-white md:static md:ml-auto">{stars.size}</span>
            )}
          </button>
        ))}
        <a href="/admin" className="mt-auto hidden px-3 py-2 font-pixel text-[10px] uppercase tracking-wide text-ink-faint hover:text-ink-muted md:block">
          Organizer sign-in
        </a>
      </nav>

      <main className="min-h-dvh px-4 pb-[calc(104px+env(safe-area-inset-bottom))] md:px-9 md:pb-16">

        {tab === "week" && <>
          {mast("Oct 19-24 · Sacramento", "The week_")}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} type="search"
              placeholder="Search events, hosts, venues"
              className="w-full max-w-xs rounded-md border border-line bg-void-2 px-3.5 py-2.5 text-sm outline-none placeholder:text-ink-faint focus:border-ember" />
            <div className="ml-auto flex rounded-md border border-line p-0.5">
              {(["list", "grid"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`rounded-[5px] px-3 py-1.5 font-pixel text-[11px] uppercase tracking-wide transition-colors ${view === v && !ql ? "bg-void-3 text-lavender" : "text-ink-faint"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {ql ? <>
            <p className="mt-4 font-pixel text-[11px] uppercase tracking-wide text-ink-faint">
              {matches.length} match{matches.length === 1 ? "" : "es"} for &quot;{q.trim()}&quot;
            </p>
            {DAYS.map(d => group(`${d.w} ${d.n}`, matches.filter(e => e.day === d.d)))}
            {!matches.length && empty("Nothing matches. Try a host, a venue, or a category.")}
          </> : view === "grid" ? (
            <WeekGrid events={weekAll} cats={cats} onOpen={e => openSheet(e)} />
          ) : <>
          <div className="sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto bg-gradient-to-b from-void from-80% px-4 py-2.5 md:-mx-9 md:px-9 [scrollbar-width:none]">
            {DAYS.map((d, i) => {
              const n = events.filter(e => e.day === d.d).length
              return (
                <button key={d.d} onClick={() => setDay(i)}
                  className={`min-w-16 flex-none rounded-md border px-2.5 py-2 text-center transition-all duration-150 active:scale-95 ${i === day ? "border-electric bg-void-3 shadow-[0_0_24px_rgba(111,29,255,.45)]" : "border-line bg-void-2"}`}>
                  <span className={`block font-pixel text-[11px] uppercase ${i === day ? "text-lavender" : "text-ink-faint"}`}>{d.w}</span>
                  <span className="block font-headline text-lg font-bold">{d.n}</span>
                  <span className="block text-[10.5px] text-ink-faint">{n} events</span>
                </button>
              )
            })}
          </div>
          {SLOTS.map(s => group(s, weekList.filter(e => e.slot === s)))}
          {!weekList.length && empty("Nothing on this day yet.")}
          </>}
        </>}

        {tab === "mine" && <>
          {mast("Your plan", "My week_")}
          {DAYS.map(d => group(`${d.w} ${d.n}`, mine.filter(e => e.day === d.d)))}
          {!mine.length && empty("Star events anywhere in the app and they land here, sorted by day.")}
        </>}

        {tab === "start" && <>
          {mast("New here?", "Start here_", copy.start_intro)}
          {group("Hand-picked for newcomers", starters)}
          <section className="mt-6">
            <div className="mb-2.5 flex items-center gap-2.5 font-pixel text-xs uppercase tracking-[0.12em] text-ink-faint">
              Words people keep using<span className="h-px flex-1 bg-line" />
            </div>
            <div className="grid gap-2.5 md:grid-cols-2">
              {glossary.map(g => (
                <div key={g.term} className="rounded-md border border-line bg-void-2 px-3.5 py-3">
                  <span className="font-pixel text-[13px] text-lavender">{g.term}</span>
                  <p className="mt-1 text-[13px] text-ink-muted">{g.definition}</p>
                </div>
              ))}
            </div>
          </section>
          <a href="/admin" className="mt-8 block text-center font-pixel text-[11px] uppercase tracking-wide text-ink-faint md:hidden">
            Organizer? Sign in →
          </a>
        </>}
      </main>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-[rgba(5,5,12,.6)] backdrop-blur-sm" onClick={closeSheet} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[86dvh] w-full max-w-md overflow-y-auto rounded-t-xl border border-b-0 border-line bg-void-2 p-5 pb-8 md:bottom-auto md:top-1/2 md:max-w-lg md:-translate-y-1/2 md:rounded-xl md:border-b" role="dialog" aria-modal="true">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line-strong md:hidden" />
            <button onClick={closeSheet} aria-label="Close"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md text-ink-faint hover:text-ink">✕</button>
            <p className="font-pixel text-[11.5px] uppercase tracking-[0.12em]" style={{ color: catBy[open.category]?.color }}>{catBy[open.category]?.name}</p>
            <h2 className="mt-1.5 font-headline text-2xl font-bold leading-tight tracking-tight">{open.title}</h2>
            <p className="mt-1 font-pixel text-xs uppercase tracking-wide text-ink-faint">Hosted by {open.host_org}</p>
            <p className="mt-3 text-sm text-ink-muted">{open.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[["When", `${DAYS.find(d => d.d === open.day)?.w} Oct ${DAYS.find(d => d.d === open.day)?.n} · ${open.start_time}`],
                ["Where", open.venue_name ?? "Venue TBA"],
                ["Cost", open.is_free ? `${flags.free} + open` : "Ticketed · see Luma"],
                ["Good for", open.newcomer ? `${flags.newcomer} welcome` : "General"]].map(([k, v]) => (
                <div key={k} className="rounded-md border border-line bg-void px-3 py-2">
                  <span className="block font-pixel text-[10px] uppercase tracking-wide text-ink-faint">{k}</span>
                  <span className="text-[13px] font-medium">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2">
              <a href={`/go/${open.slug}?src=detail`}
                className="flex items-center justify-center rounded-md bg-electric p-3.5 font-headline font-semibold text-white shadow-[0_0_24px_rgba(111,29,255,.45)] transition-transform active:scale-[.975]">
                RSVP on Luma ↗
              </a>
              <button onClick={() => toggleStar(open.id)}
                className="rounded-md border border-line bg-void-3 p-3.5 font-headline font-semibold transition-transform active:scale-[.975]">
                {stars.has(open.id) ? "★ Starred · in My Week" : "☆ Star this event"}
              </button>
            </div>
            <p className="mt-3 text-center text-[11.5px] text-ink-faint">Registration happens on the host&apos;s Luma page. We just get you there.</p>
          </div>
        </>
      )}

      <A2HS />
    </div>
  )
}

function empty(msg: string) {
  return (
    <div className="mt-6 rounded-md border border-dashed border-line p-6 text-center text-sm text-ink-faint">
      <span className="mb-1 block font-pixel text-[13px] text-lavender">NOTHING_HERE_</span>{msg}
    </div>
  )
}

/* Add-to-home-screen prompt: mobile browsers only, never in the installed
   app, dismissible once. Uses the native install prompt where Chrome
   offers it; otherwise explains the manual path per platform. */
function A2HS() {
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)
  const [installEvt, setInstallEvt] = useState<Event | null>(null)

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean }
    const standalone = matchMedia("(display-mode: standalone)").matches || nav.standalone === true
    const mobile = matchMedia("(pointer: coarse)").matches
    if (standalone || !mobile || localStorage.getItem("stw-a2hs") === "no") return
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent))
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvt(e) }
    window.addEventListener("beforeinstallprompt", onPrompt)
    const t = setTimeout(() => setShow(true), 2500)
    return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onPrompt) }
  }, [])

  const dismiss = () => { setShow(false); localStorage.setItem("stw-a2hs", "no") }
  if (!show) return null

  return (
    <div className="fixed inset-x-3 bottom-[calc(92px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md rounded-md border border-line-strong bg-void-3 p-3.5 shadow-[0_0_24px_rgba(111,29,255,.45)]">
      <div className="flex items-start gap-3">
        <span className="font-pixel text-base text-lavender">[+]</span>
        <p className="flex-1 text-xs leading-relaxed text-ink-muted">
          <b className="text-ink">Keep this on your phone all week.</b>{" "}
          {ios
            ? <>Tap <b className="text-ink">Share</b>, then <b className="text-ink">Add to Home Screen</b>. Full screen, no browser bars.</>
            : installEvt
              ? <>One tap installs it like an app. No store, nothing to download.</>
              : <>Open the browser menu, then <b className="text-ink">Add to Home screen</b>.</>}
        </p>
        <button onClick={dismiss} aria-label="Dismiss" className="px-1 text-ink-faint">✕</button>
      </div>
      {installEvt && !ios && (
        <button onClick={async () => {
          await (installEvt as Event & { prompt: () => Promise<void> }).prompt()
          dismiss()
        }} className="mt-2.5 w-full rounded-md bg-electric py-2.5 font-headline text-sm font-semibold text-white active:scale-[.975]">
          Add to home screen
        </button>
      )}
    </div>
  )
}
