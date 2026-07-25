import { createFileRoute, Link } from "@tanstack/react-router";
import heroImage from "@/assets/museum-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Heritage Gallery — Welcome" },
      { name: "description", content: "Journey through living history. Validate your ticket to begin." },
      { property: "og:title", content: "Heritage Gallery — Welcome" },
      { property: "og:description", content: "Journey through living history. Validate your ticket to begin." },
    ],
  }),
  component: WelcomeScreen,
});

function WelcomeScreen() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#383838] text-parchment">
      <img
        src={heroImage}
        alt="Heritage Gallery interior"
        width={1024}
        height={1536}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ animation: "fade-up 900ms ease-out both" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#383838] via-[#383838]/70 to-[#383838]/30" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center px-6 pt-16 pb-10">
        <div
          className="flex flex-col items-center"
          style={{ animation: "fade-up 700ms ease-out 300ms both" }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-md border border-gold/60 text-gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8">
              <path d="M3 10L12 3l9 7v11H3z" />
              <path d="M9 21v-6h6v6" />
            </svg>
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-parchment/60">
            Est. 1924
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center text-center">
          <h1
            className="font-display text-6xl font-bold leading-[1.05] text-parchment"
            style={{ animation: "fade-up 800ms ease-out 500ms both" }}
          >
            Heritage
            <br />
            Gallery
          </h1>
          <p
            className="mx-auto mt-6 max-w-xs text-base font-light text-white/70"
            style={{ animation: "fade-up 800ms ease-out 800ms both" }}
          >
            Experience art through a lens of timeless luxury.
          </p>
        </div>

        <Link
          to="/validate"
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-gold px-8 py-4 text-base font-semibold text-[#383838] transition-transform active:scale-[0.98]"
          style={{ animation: "fade-up 800ms ease-out 1100ms both, gold-pulse 2.4s ease-in-out 2s infinite" }}
        >
          Validate Your Ticket
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </main>
  );
}