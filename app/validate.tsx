import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/validate")({
  head: () => ({
    meta: [
      { title: "Validate Access — Heritage Gallery" },
      { name: "description", content: "Present your digital or physical ticket for gallery entry." },
      { property: "og:title", content: "Validate Access — Heritage Gallery" },
      { property: "og:description", content: "Present your digital or physical ticket for gallery entry." },
    ],
  }),
  component: ValidateScreen,
});

type Tab = "qr" | "otp";

function ValidateScreen() {
  const [tab, setTab] = useState<Tab>("qr");
  const [code, setCode] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function submitTicket() {
    if (!code.trim() && tab === "qr") {
      // simulate scanner activation → success
      navigate({ to: "/affirmation" });
      return;
    }
    if (code.trim().length < 4) {
      setError("Invalid ticket. Please try again.");
      setTimeout(() => setError(null), 2000);
      return;
    }
    navigate({ to: "/affirmation" });
  }

  useEffect(() => {
    if (otp.every((d) => d !== "")) {
      navigate({ to: "/affirmation" });
    }
  }, [otp, navigate]);

  return (
    <main
      className="relative min-h-screen w-full bg-[#383838] px-5 pt-14 pb-10 text-parchment"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 40%, rgba(140,59,59,0.18), transparent 60%)",
      }}
    >
      <header className="mx-auto flex max-w-md items-center justify-between">
        <div className="h-9 w-9 rounded-full border border-parchment/20 bg-[#2a2a2a]" />
        <p className="text-sm font-medium uppercase tracking-[0.4em] text-parchment/90 font-display">
          The Gallery
        </p>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-parchment/80">
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </header>

      <section className="mx-auto mt-10 max-w-md">
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-parchment">
          Validate Access
        </h1>
        <p className="mt-3 text-base text-parchment/70">
          Present your digital or physical ticket for gallery entry.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-md rounded-3xl border border-white/5 bg-[#2b2b2b]/70 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur">
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-black/30 p-1">
          <TabButton active={tab === "qr"} onClick={() => setTab("qr")}>
            Scan QR
          </TabButton>
          <TabButton active={tab === "otp"} onClick={() => setTab("otp")}>
            Enter OTP
          </TabButton>
        </div>

        {tab === "qr" ? (
          <QrPanel error={error} code={code} setCode={setCode} onSubmit={submitTicket} />
        ) : (
          <OtpPanel otp={otp} setOtp={setOtp} />
        )}
      </section>
    </main>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors ${
        active ? "bg-gold text-[#383838]" : "text-parchment/70 hover:text-parchment"
      }`}
    >
      {children}
    </button>
  );
}

function QrPanel({
  error,
  code,
  setCode,
  onSubmit,
}: {
  error: string | null;
  code: string;
  setCode: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <div
        className={`relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${
          error ? "border-deep-red" : "border-parchment/25"
        } bg-black/30`}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-parchment/50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-14 w-14">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01" />
          </svg>
          <p className="text-xs font-semibold uppercase tracking-[0.3em]">Awaiting scan</p>
        </div>
        {/* corner brackets */}
        <Corner className="left-3 top-3 border-l-2 border-t-2" />
        <Corner className="right-3 top-3 border-r-2 border-t-2" />
        <Corner className="left-3 bottom-3 border-l-2 border-b-2" />
        <Corner className="right-3 bottom-3 border-r-2 border-b-2" />
        {/* scan sweep */}
        <div className="pointer-events-none absolute inset-x-6 top-0 h-full overflow-hidden">
          <div
            className="h-[2px] w-full bg-gradient-to-r from-transparent via-gold to-transparent"
            style={{ animation: "scan-sweep 2.4s linear infinite" }}
          />
        </div>
      </div>

      <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-parchment/50">
        <div className="h-px flex-1 bg-parchment/15" />
        Or enter manually
        <div className="h-px flex-1 bg-parchment/15" />
      </div>

      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.25em] text-parchment/70">
        Ticket Code
      </label>
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-parchment/50">
          <path d="M2 9a2 2 0 012-2h16a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 000-4V9z" />
          <path d="M9 8v8" />
        </svg>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. GLRY-2024-XXXX"
          className="flex-1 bg-transparent text-sm text-parchment placeholder:text-parchment/40 focus:outline-none"
        />
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-deep-red/90 px-3 py-2 text-center text-sm font-medium text-white">
          {error}
        </p>
      )}

      <button
        onClick={onSubmit}
        className="mt-6 w-full rounded-full bg-gold px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#383838] transition-transform active:scale-[0.98]"
      >
        · Activate Scanner
      </button>
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return <div className={`absolute h-6 w-6 border-gold ${className}`} />;
}

function OtpPanel({ otp, setOtp }: { otp: string[]; setOtp: (v: string[]) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [phone, setPhone] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function updateDigit(i: number, v: string) {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  }

  return (
    <div className="py-2">
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.25em] text-parchment/70">
        Registered Mobile
      </label>
      <div className="flex items-center gap-2 border-b border-parchment/25 pb-2 focus-within:border-gold">
        <span className="text-sm text-parchment/80">+91</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Registered mobile number"
          className="flex-1 bg-transparent text-sm text-parchment placeholder:text-parchment/30 focus:outline-none"
        />
        <button
          disabled={phone.length < 6 || cooldown > 0}
          onClick={() => setCooldown(60)}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-gold disabled:opacity-30"
        >
          {cooldown > 0 ? `${cooldown}s` : "Send Code"}
        </button>
      </div>

      <div className="mt-8 flex justify-between gap-2">
        {otp.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => updateDigit(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
            }}
            className={`h-14 w-11 rounded-lg border bg-black/30 text-center font-display text-2xl font-semibold text-parchment focus:outline-none ${
              d ? "border-gold" : "border-white/20"
            }`}
          />
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-parchment/50">
        Didn't receive a code?{" "}
        <button className="font-semibold text-gold">Resend</button>
      </p>
    </div>
  );
}