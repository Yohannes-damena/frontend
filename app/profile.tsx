import { createFileRoute, Link } from "@tanstack/react-router";
import { FooterNav, ScreenHeader } from "@/components/FooterNav";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Heritage Gallery" },
      { name: "description", content: "Your ticket, visits, and saved works at the Heritage Gallery." },
      { property: "og:title", content: "Profile — Heritage Gallery" },
      { property: "og:description", content: "Your ticket, visits, and saved works at the Heritage Gallery." },
    ],
  }),
  component: Profile,
});

const visits = [
  { museum: "Heritage Gallery", date: "Oct 24, 2024", stops: "12 / 12" },
  { museum: "Palazzo della Luce", date: "Aug 03, 2024", stops: "8 / 14" },
  { museum: "Museum of Antiquities", date: "May 17, 2024", stops: "6 / 9" },
];

const saved = ["Study of Hands, 1487", "The Ivory Casket", "Portrait in Umber"];

function Profile() {
  return (
    <main className="relative min-h-screen bg-[#383838] pb-28 text-parchment">
      <ScreenHeader title="Profile" />

      <section className="mx-auto mt-8 max-w-md px-6">
        <div className="rounded-2xl bg-parchment p-6 text-ink shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">All-Access Pass</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Visitor #HM-9824-AX</h1>
          <p className="mt-1 text-sm text-ink/70">Valid through October 24, 2024</p>
          <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-ink/50">Stops visited</p>
              <p className="font-display text-xl">26</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-ink/50">Museums</p>
              <p className="font-display text-xl">3</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-ink/50">Saved</p>
              <p className="font-display text-xl">{saved.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-md px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-parchment/60">Visit history</p>
        <div className="mt-3 space-y-3">
          {visits.map((v) => (
            <article key={v.date} className="rounded-xl bg-ember/60 p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg">{v.museum}</h3>
                <span className="text-[11px] uppercase tracking-[0.2em] text-parchment/60">{v.date}</span>
              </div>
              <p className="mt-1 text-xs text-parchment/70">Completed {v.stops} stops</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-md px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-parchment/60">Saved works</p>
        <ul className="mt-3 divide-y divide-white/5 rounded-xl bg-white/5">
          {saved.map((s) => (
            <li key={s} className="flex items-center justify-between px-4 py-3">
              <span className="font-display text-base">{s}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-gold">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-8 max-w-md px-6">
        <Link
          to="/"
          className="block rounded-full border border-white/10 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-parchment/70"
        >
          End Session
        </Link>
      </section>

      <FooterNav />
    </main>
  );
}