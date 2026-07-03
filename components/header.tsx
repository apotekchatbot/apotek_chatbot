import Link from "next/link";
import { Pill } from "lucide-react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const glassHeader: React.CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  borderColor: "rgba(29,158,117,0.14)",
};

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 flex h-[60px] w-full items-center justify-between border-b px-4 sm:px-6 md:px-10"
      style={glassHeader}
    >
      {/* ── Logo (Bisa diklik untuk kembali ke Beranda) ── */}
      <Link
        href="/"
        className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#1D9E75]">
          <Pill size={17} className="text-white" aria-hidden="true" />
        </div>
        <span className="text-[15px] font-medium tracking-tight">
          <span className="text-[#111]">Apotek</span>
          <span className="text-[#0F6E56]">Bot</span>
        </span>
      </Link>

      <div className="flex items-center gap-6 text-[14px] font-medium text-[#5F5E5A]">
        <Show when="signed-in">
          <Link href="/dashboard">Dashboard</Link>
        </Show>
        <Link href="/">Forum</Link>
        <Link href="/">FAQ</Link>
        <Link href="/">Kontak</Link>
        <Link href="/">Tentang</Link>
        <Show when="signed-in">
          <Link href="/settings">Settings</Link>
        </Show>
      </div>

      {/* ── Bagian Otentikasi (Otomatis menyesuaikan sesi) ── */}
      <div className="flex items-center gap-3">
        {/* Tampil jika pengguna BELUM login */}
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="rounded-full bg-[#1D9E75] px-5 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-[#0F6E56]">
              Masuk
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <button className="rounded-full bg-[#1D9E75] px-5 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-[#0F6E56]">
              Daftar
            </button>
          </SignUpButton>
        </Show>

        {/* Tampil jika pengguna SUDAH login */}
        <Show when="signed-in">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8 border border-[rgba(29,158,117,0.3)]",
              },
            }}
          />
        </Show>
      </div>
    </header>
  );
}
