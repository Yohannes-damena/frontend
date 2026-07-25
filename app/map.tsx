import { createFileRoute } from "@tanstack/react-router";
import { FooterNav, ScreenHeader } from "@/components/FooterNav";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Map — Heritage Gallery" },
      { name: "description", content: "Locate partner museums and points of interest nearby." },
      { property: "og:title", content: "Map — Heritage Gallery" },
      { property: "og:description", content: "Locate partner museums and points of interest nearby." },
    ],
  }),
  component: MapScreen,
});

const pins = [
  { name: "Heritage Gallery", dist: "0.4 km", top: "34%", left: "42%" },
  { name: "Palazzo della Luce", dist: "1.2 km", top: "58%", left: "62%" },
  { name: "Museum of Antiquities", dist: "2.8 km", top: "22%", left: "70%" },
  { name: "Linea Contemporary", dist: "3.5 km", top: "72%", left: "28%" },
];

function MapScreen() {
  return (
    <main className="relative min-h-screen bg-[#383838] pb-28 text-parchment">
      <ScreenHeader title="Map" />
      <section className="mx-auto mt-6 max-w-md px-6">
        <h1 className="font-display text-3xl font-semibold">Nearby</h1>
        <p className="mt-1 text-sm text-parchment/60">Four venues within walking distance.</p>
      </section>
      <section className="mx-auto mt-6 max-w-md px-6">
        <div
          className="relative h-[360px] overflow-hidden rounded-2xl border border-white/10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, rgba(192,138,46,0.15), transparent 50%), radial-gradient(circle at 80% 70%, rgba(140,59,59,0.25), transparent 55%), linear-gradient(135deg, #2b2b2b 0%, #3d3230 100%)",
          }}
        >
          <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 400 400" preserveAspectRatio="none">
            <path d="M0 80 L400 120" stroke="rgba(240,230,210,0.15)" strokeWidth="1" />
            <path d="M0 200 L400 240" stroke="rgba(240,230,210,0.15)" strokeWidth="1" />
            <path d="M0 320 L400 300" stroke="rgba(240,230,210,0.15)" strokeWidth="1" />
            <path d="M120 0 L100 400" stroke="rgba(240,230,210,0.15)" strokeWidth="1" />
            <path d="M260 0 L280 400" stroke="rgba(240,230,210,0.15)" strokeWidth="1" />
          </svg>
          {pins.map((p) => (
            <div key={p.name} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ top: p.top, left: p.left }}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold shadow-[0_0_0_6px_rgba(192,138,46,0.2)]">
                <span className="h-2 w-2 rounded-full bg-white" />
              </span>
            </div>
          ))}
          <div className="absolute inset-x-4 bottom-4 rounded-xl bg-parchment/95 p-3 text-ink">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">You are here</p>
            <p className="mt-1 font-display text-lg">Piazza del Popolo</p>
          </div>
        </div>
      </section>
      <section className="mx-auto mt-6 max-w-md space-y-2 px-6">
        {pins.map((p) => (
          <div key={p.name} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-gold" />
              <span className="font-display text-base">{p.name}</span>
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-parchment/60">{p.dist}</span>
          </div>
        ))}
      </section>
      <FooterNav />
    </main>
  );
}