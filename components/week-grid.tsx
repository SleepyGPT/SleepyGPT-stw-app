"use client"

/* The whole week on one surface: six day columns, every event as a
   compact block. Desktop sees everything at once; phones pan the
   grid sideways (and pinch to zoom). Click any block to zoom in. */

type GridEv = {
  id: string; title: string; day: string; start_time: string | null
  category: string; status?: string
}
type Cat = { key: string; name: string; color: string }

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

export default function WeekGrid<T extends GridEv>({ events, cats, onOpen, showStatus }: {
  events: T[]; cats: Cat[]; onOpen: (e: T) => void; showStatus?: boolean
}) {
  const catBy = Object.fromEntries(cats.map(c => [c.key, c]))
  return (
    <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 md:-mx-9 md:px-9 [scrollbar-width:thin]">
      <div className="grid min-w-[880px] grid-cols-6 gap-2">
        {DAYS.map(d => {
          const es = events
            .filter(e => e.day === d.d)
            .sort((a, b) => mins(a.start_time) - mins(b.start_time))
          return (
            <div key={d.d} className="min-w-0">
              <div className="mb-2 rounded-md border border-line bg-void-2 px-2.5 py-1.5 text-center">
                <span className="font-pixel text-[10px] uppercase text-ink-faint">{d.w}</span>
                <span className="ml-1.5 font-headline text-sm font-bold">{d.n}</span>
              </div>
              <div className="grid gap-1.5">
                {es.map(e => {
                  const c = catBy[e.category]
                  const dim = showStatus && e.status !== "published"
                  return (
                    <button key={e.id} onClick={() => onOpen(e)}
                      className={`relative rounded-md border border-line bg-void-2 py-1.5 pl-3 pr-1.5 text-left transition-transform active:scale-[.97] ${dim ? "opacity-55" : ""}`}>
                      <span className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-sm" style={{ background: c?.color }} />
                      <span className="block font-pixel text-[9.5px] text-ink-faint">
                        {e.start_time}{dim && <em className="ml-1 not-italic text-warn">· {e.status?.replace("_", " ")}</em>}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[12px] font-semibold leading-snug">{e.title}</span>
                    </button>
                  )
                })}
                {!es.length && <div className="rounded-md border border-dashed border-line py-3 text-center font-pixel text-[9.5px] uppercase text-ink-faint">Open</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
