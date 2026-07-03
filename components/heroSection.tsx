"use client";

import { useState } from "react";
import {
  Pill,
  LogIn,
  Zap,
  ListChecks,
  Table2,
  ShieldCheck,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";

const NAV_LINKS = ["Fitur", "Cara kerja", "Tentang"];

const STATS = [
  { icon: <Zap size={17} />, num: "Otomatis", lbl: "Tanpa input manual" },
  {
    icon: <ListChecks size={17} />,
    num: "Berurutan",
    lbl: "Per obat, per pasien",
  },
  {
    icon: <Table2 size={17} />,
    num: "Spreadsheet",
    lbl: "Data tersimpan rapi",
  },
];

export default function HeroSection() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fdf9] font-sans">
      {/* ── Background blobs ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full sm:h-80 sm:w-80 md:h-[420px] md:w-[420px]"
        style={{ background: "rgba(29,158,117,0.10)", filter: "blur(80px)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 bottom-10 h-52 w-52 rounded-full sm:h-64 sm:w-64 md:h-[320px] md:w-[320px]"
        style={{ background: "rgba(93,202,165,0.08)", filter: "blur(80px)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-36 top-40 hidden h-[180px] w-[180px] rounded-full md:block"
        style={{ background: "rgba(29,158,117,0.06)", filter: "blur(80px)" }}
      />

      {/* ── Floating pills — hidden on mobile ── */}
      <FloatingPill
        className="absolute left-5 top-28 hidden lg:flex"
        icon={<CheckCircle2 size={13} className="text-[#1D9E75]" />}
      >
        Pesan terkirim otomatis
      </FloatingPill>
      <FloatingPill
        className="absolute right-4 top-44 hidden lg:flex"
        icon={<ShieldCheck size={13} className="text-[#1D9E75]" />}
      >
        WhatsApp API aktif
      </FloatingPill>
      <FloatingPill
        className="absolute bottom-52 left-4 hidden lg:flex"
        icon={<ShieldCheck size={13} className="text-[#1D9E75]" />}
      >
        Data aman &amp; terenkripsi
      </FloatingPill>

      {/* ══════════ HEADER ══════════ */}

      {/* Mobile nav drawer */}
      {menuOpen && (
        <div
          className="relative z-10 flex flex-col border-b px-5 py-4 md:hidden"
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderColor: "rgba(29,158,117,0.14)",
          }}
        >
          {NAV_LINKS.map((item) => (
            <a
              key={item}
              href="#"
              className="py-3 text-[15px] text-[#5F5E5A] transition-colors hover:text-[#0F6E56]"
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </a>
          ))}
        </div>
      )}

      {/* ══════════ HERO ══════════ */}
      <section
        className="relative z-[1] flex flex-col items-center px-4 pb-14 pt-14 text-center sm:px-6 sm:pb-16 sm:pt-16 md:pt-20 lg:pb-20 lg:pt-24"
        aria-label="Hero"
      >
        {/* Badge */}
        <div
          className="mb-6 flex items-center gap-1.5 rounded-full border px-3 py-[5px] text-[11.5px] font-medium text-[#085041] sm:mb-8 sm:px-3.5 sm:text-[12px]"
          style={{
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderColor: "rgba(29,158,117,0.25)",
          }}
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1D9E75] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1D9E75]" />
          </span>
          Terintegrasi WhatsApp Business API
        </div>

        {/* Headline */}
        <h1
          className="mb-4 max-w-[660px] font-medium leading-[1.13] tracking-tight text-[#111]"
          style={{
            fontSize: "clamp(32px, 6vw, 52px)",
            letterSpacing: "clamp(-0.8px, -0.15vw, -1.8px)",
          }}
        >
          Instruksi obat
          <br />
          sampai ke pasien —<br />
          <span className="text-[#1D9E75]">otomatis.</span>
        </h1>

        {/* Subtitle */}
        <p className="mb-8 max-w-[460px] text-[15px] leading-[1.65] text-[#888780] sm:mb-10 sm:text-[16.5px]">
          Apoteker input data, chatbot kirim ke WhatsApp pasien secara
          berurutan. Tidak ada langkah manual, tidak ada yang terlewat.
        </p>

        {/* CTA — stacked on mobile, pill on md+ */}
        <div className="mb-10 flex w-full flex-col items-center gap-3 sm:mb-12 md:mb-14">
          {/* Glass pill — desktop */}
          <div
            className="hidden items-center gap-3 rounded-full border pl-5 pr-1.5 py-1.5 md:flex"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderColor: "rgba(29,158,117,0.2)",
              boxShadow: "0 2px 20px rgba(29,158,117,0.08)",
            }}
            role="group"
            aria-label="Masuk ke sistem"
          >
            <span className="text-[14px] text-[#5F5E5A]">
              Sudah punya akun?
            </span>
            <a
              href="/dashboard"
              className="flex h-10 items-center gap-1.5 rounded-full bg-[#1D9E75] px-5 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-[#0F6E56]"
            >
              <LogIn size={16} aria-hidden="true" />
              Masuk sebagai apoteker
            </a>
          </div>

          {/* Stacked — mobile */}
          <a
            href="#"
            className="flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-[#1D9E75] py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#0F6E56] md:hidden"
          >
            <LogIn size={17} aria-hidden="true" />
            Masuk sebagai apoteker
          </a>
          <p className="text-[13px] text-[#888780] md:hidden">
            Belum punya akun? Hubungi admin.
          </p>
        </div>

        {/* Stat cards */}
        <div
          className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3"
          role="list"
          aria-label="Keunggulan sistem"
        >
          {STATS.map(({ icon, num, lbl }) => (
            <div
              key={num}
              className="flex items-center gap-3 rounded-2xl border px-4 py-3 sm:flex-col sm:items-start sm:px-5 sm:py-4"
              style={{
                background: "rgba(255,255,255,0.65)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                borderColor: "rgba(29,158,117,0.15)",
              }}
              role="listitem"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#1D9E75]"
                style={{ background: "rgba(29,158,117,0.10)" }}
                aria-hidden="true"
              >
                {icon}
              </div>
              <div>
                <div className="text-[16px] font-medium leading-tight text-[#0F6E56] sm:text-[17px]">
                  {num}
                </div>
                <div className="mt-0.5 text-[11.5px] text-[#888780]">{lbl}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Helper component ── */
function FloatingPill({
  children,
  icon,
  className = "",
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none z-[2] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium text-[#0F6E56] ${className}`}
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderColor: "rgba(29,158,117,0.18)",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {children}
    </div>
  );
}
