import { createFileRoute, Link } from "@tanstack/react-router";
import { FooterNav } from "@/components/FooterNav";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Hub — Heritage Gallery" },
      { name: "description", content: "Explore exhibitions, guides, and the museum shop." },
      { property: "og:title", content: "Hub — Heritage Gallery" },
      { property: "og:description", content: "Explore exhibitions, guides, and the museum shop." },
    ],
  }),
  component: HomeScreen,
});

const featured = [
  {
    tag: "Featured Exhibition",
    title: "Light of the Renaissance",
    body: "A curated journey through the pivotal masterworks of the 15th century.",
  },
];

const queue = [
  { title: "Modern Voices", body: "Contemporary works from twelve living artists." },
  { title: "Sculpture Court", body: "Marble and bronze from the classical period." },
  { title: "The Gilded Room", body: "Decorative arts from the Belle Époque." },
];

function HomeScreen() {
  return (
    <main className="relative min-h-screen w-full bg-[#383838] pb-28 pt-14 text-parchment">
      <header className="mx-auto flex max-w-md items-center justify-between px-6">
        <div className="h-9 w-9 rounded-full border border-parchment/20 bg-black/40" />
        <p className="font-display text-sm uppercase tracking-[0.4em]">The Gallery</p>
        <span className="h-9 w-9" />
      </header>

      <section className="mx-auto mt-8 max-w-md px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">Welcome back</p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-tight">Today's Journey</h1>
      </section>

      <section className="mx-auto mt-6 max-w-md space-y-4 px-6">
        {featured.map((f) => (
          <Link
            key={f.title}
            to="/museums/$museumId/guide/$guideId"
            params={{ museumId: "heritage", guideId: "renaissance" }}
            className="block rounded-2xl bg-parchment p-6 text-ink shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">{f.tag}</p>
            <h2 className="mt-3 font-display text-2xl font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm text-ink/70">{f.body}</p>
            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold">
                  <svg viewBox="0 0 24 24" fill="#fff" className="h-3.5 w-3.5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/70">Begin tour</span>
              </div>
              <span className="font-display text-lg text-ink/40">01 / 12</span>
            </div>
          </Link>
        ))}

        <div className="pt-2">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-parchment/60">Up next</p>
          <div className="space-y-3">
            {queue.map((q) => (
              <Link
                key={q.title}
                to="/museums"
                className="rounded-xl bg-ember/70 p-4 text-parchment shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
              >
                <h3 className="font-display text-lg font-semibold">{q.title}</h3>
                <p className="mt-1 text-xs text-parchment/70">{q.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FooterNav />
    </main>
  );
}

