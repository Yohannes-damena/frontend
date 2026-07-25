import { createFileRoute, Link } from "@tanstack/react-router";
import { FooterNav, ScreenHeader } from "@/components/FooterNav";

export const Route = createFileRoute("/museums")({
  head: () => ({
    meta: [
      { title: "Browse Museums — Heritage Gallery" },
      { name: "description", content: "Discover partner museums and collections included with your ticket." },
      { property: "og:title", content: "Browse Museums — Heritage Gallery" },
      { property: "og:description", content: "Discover partner museums and collections included with your ticket." },
    ],
  }),
  component: Museums,
});

const museums = [
  { id: "heritage", name: "Heritage Gallery", city: "Rome", tag: "Featured", pieces: 412 },
  { id: "palazzo", name: "Palazzo della Luce", city: "Florence", tag: "New", pieces: 218 },
  { id: "antiquities", name: "Museum of Antiquities", city: "Naples", tag: "Classic", pieces: 604 },
  { id: "linea", name: "Linea Contemporary", city: "Milan", tag: "Modern", pieces: 96 },
];

function Museums() {
  return (
    <main className="relative min-h-screen bg-[#383838] pb-28 text-parchment">
      <ScreenHeader title="Browse" />

      <section className="mx-auto mt-6 max-w-md px-6">
        <h1 className="font-display text-3xl font-semibold">Partner Museums</h1>
        <p className="mt-1 text-sm text-parchment/60">Included with your All-Access Pass.</p>

        <label className="mt-5 flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-parchment/50">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-parchment/40"
            placeholder="Search museums or cities"
          />
        </label>
      </section>

      <section className="mx-auto mt-6 max-w-md space-y-4 px-6">
        {museums.map((m, i) => (
          <Link
            key={m.id}
            to="/museums/$museumId"
            params={{ museumId: m.id }}
            className={`block rounded-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition ${
              i === 0 ? "bg-parchment text-ink" : "bg-ember/60 text-parchment"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${i === 0 ? "text-gold" : "text-parchment/60"}`}>
                  {m.tag}
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold">{m.name}</h2>
                <p className={`mt-1 text-sm ${i === 0 ? "text-ink/70" : "text-parchment/70"}`}>{m.city} · {m.pieces} works</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${i === 0 ? "bg-gold text-white" : "bg-parchment/10 text-parchment"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <FooterNav />
    </main>
  );
}