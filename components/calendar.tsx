"use client"

import { useEffect, useMemo, useState } from "react"

type Ev = {
  id: string; slug: string; title: string; description: string | null
  category: string; day: string; start_time: string | null; slot: string | null
  venue_name: string | null; is_free: boolean; newcomer: boolean
  host_org: string | null; luma_url: string | null
}
type Cat = { key: string; name: string; color: string }
type Flags = { free: string; paid: string; newcomer: string; newcomer_on: boolean }

const DAYS = [
  { d: "2026-10-19", w: "Mon", n: 19 }, { d: "2026-10-20", w: "Tue", n: 20 },
  { d: "2026-10-21", w: "Wed", n: 21 }, { d: "2026-10-22", w: "Thu", n: 22 },
  { d: "2026-10-23", w: "Fri", n: 23 }, { d: "2026-10-24", w: "Sat", n: 24 },
]
const SLOTS = ["Morning", "Afternoon", "Evening"]

function mins(t: string | null) {
  if (!t) return 0
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 0
  let h = +m[1] % 12
  if (m[3].toUpperCase() === "PM") h += 12
  return h * 60 + +m[2]
}

export default function Calendar({ events, cats, flags }: { events: Ev[]; cats: Cat[]; flags: Flags }) {
  const [day, setDay] = useState(0)
  const [stars, setStars] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<Ev | null>(null)
  const [mineOnly, setMineOnly] = useState(false)

  useEffect(() => {
    try { setStars(new Set(JSON.parse(localStorage.getItem("stw-stars") ?? "[]"))) } catch {}
  }, [])
  const toggleStar = (id: string) => {
    setStars(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem("stw-stars", JSON.stringify([...next]))
      return next
    })
  }

  const catBy = useMemo(() => Object.fromEntries(cats.map(c => [c.key, c])), [cats])
  const list = events
    .filter(e => e.day === DAYS[day].d && (!mineOnly || stars.has(e.id)))
    .sort((a, b) => mins(a.start_time) - mins(b.start_time))

  const card = (e: Ev) => {
    const c = catBy[e.category]
    return (
      <button key={e.id} onClick={() => setOpen(e)}
        className="relative w-full rounded-md border border-line bg-void-2 p-3.5 pl-4 text-left transition-transform duration-150 active:scale-[.985]">
        <span className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-sm" style={{ background: c?.color }} />
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-pixel text-[10.5px] uppercase tracking-[0.1em]" style={{ color: c?.color }}>{c?.name}</span>
          <span className="font-pixel text-[11px] text-ink-faint">{e.start_time}</span>
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
        <span role="button" aria-label={`Star ${e.title}`}
          onClick={ev => { ev.stopPropagation(); toggleStar(e.id) }}
          className={`absolute right-2 top-8 grid h-9 w-9 place-items-center rounded-md ${stars.has(e.id) ? "text-lavender" : "text-ink-faint"}`}>
          <svg viewBox="0 0 24 24" className={`h-5 w-5 ${stars.has(e.id) ? "fill-lavender drop-shadow-[0_0_6px_rgba(199,168,255,.6)]" : "fill-none"}`} stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3.5l2.5 5.6 6 .6-4.6 4.1 1.3 6-5.2-3.1-5.2 3.1 1.3-6L3.5 9.7l6-.6z" />
          </svg>
        </span>
      </button>
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md border-x border-line px-4 pb-16 sm:max-w-2xl sm:px-8">
      <header className="pb-1 pt-8">
        <p className="font-pixel text-xs uppercase tracking-[0.12em] text-lavender">Oct 19-24 · Sacramento</p>
        <h1 className="mt-1.5 font-headline text-4xl font-bold tracking-tight">The week_</h1>
      </header>

      <div className="sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto bg-gradient-to-b from-void from-80% px-4 py-2.5 sm:-mx-8 sm:px-8 [scrollbar-width:none]">
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
        <button onClick={() => setMineOnly(m => !m)}
          className={`min-w-16 flex-none rounded-md border px-2.5 py-2 text-center font-pixel text-[11px] uppercase transition-all active:scale-95 ${mineOnly ? "border-electric text-lavender shadow-[0_0_24px_rgba(111,29,255,.45)]" : "border-line text-ink-faint"}`}>
          My week<span className="mt-1 block font-headline text-lg font-bold text-ink">{stars.size}</span>
        </button>
      </div>

      {SLOTS.map(s => {
        const es = list.filter(e => e.slot === s)
        if (!es.length) return null
        return (
          <section key={s} className="mt-5">
            <div className="mb-2.5 flex items-center gap-2.5 font-pixel text-xs uppercase tracking-[0.12em] text-ink-faint">
              {s}<span className="h-px flex-1 bg-line" />
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">{es.map(card)}</div>
          </section>
        )
      })}
      {!list.length && (
        <div className="mt-6 rounded-md border border-dashed border-line p-6 text-center text-sm text-ink-faint">
          <span className="mb-1 block font-pixel text-[13px] text-lavender">NOTHING_HERE_</span>
          {mineOnly ? "Star events and they land here." : "Nothing on this day yet."}
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-[rgba(5,5,12,.6)] backdrop-blur-sm" onClick={() => setOpen(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[86dvh] w-full max-w-md overflow-y-auto rounded-t-xl border border-b-0 border-line bg-void-2 p-5 pb-8 sm:bottom-auto sm:top-1/2 sm:max-w-lg sm:-translate-y-1/2 sm:rounded-xl sm:border-b">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line-strong sm:hidden" />
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
    </div>
  )
}
