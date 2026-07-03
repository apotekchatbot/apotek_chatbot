// import DashboardPage from "@/components/dash2";

// export default function Home() {
//   return (
//     <main>
//       <DashboardPage />
//     </main>
//   );
// }

// app/dashboard/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";

import { DashboardBanners } from "@/components/dashboardBanners";
import { PurchaseForm } from "@/components/purchase";

export default async function DashboardPage() {
  // 1. Ambil data sesi user dari sisi server (tanpa loading state di frontend)
  const user = await currentUser();

  // Proteksi dasar jika user belum login
  if (!user) {
    redirect("/");
  }

  // 2. Ekstrak metadata Clerk
  const meta = user.publicMetadata || {};
  const isSheetVerified = meta.spreadsheet_verified === true;
  const isWaVerified = meta.wa_verified === true;
  const spreadsheetId = (meta.spreadsheet_id as string) || "";

  // 3. Tentukan status aktif tombol submit
  const isReadyToSubmit = isSheetVerified && isWaVerified;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fdf9] font-sans text-black">
      {/* ── Background blobs (Dipertahankan dari desain asli) ── */}
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

      {/* ════════ MAIN ════════ */}
      <main className="relative z-[1] flex min-h-[calc(100vh-60px)] flex-col items-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 w-full max-w-[768px] space-y-6">
          {/* ── KOMPONEN BANNERS (Dikomen sementara) ── */}
          <DashboardBanners
            isSheetVerified={isSheetVerified}
            isWaVerified={isWaVerified}
          />

          {/* ── HEADER HALAMAN ── */}
          <div>
            <div className="flex items-center gap-2 text-[13px] text-[#888780]">
              <ShoppingBag size={14} aria-hidden="true" />
              <span>Dashboard Penjualan</span>
            </div>
            <h1 className="mt-1 text-[22px] font-medium tracking-tight text-[#111]">
              Input Pembelian Pasien
            </h1>
            <p className="mt-1 text-[14px] text-[#888780]">
              Catat detail pasien dan obat yang ditebus untuk memicu antrean
              kuesioner bot.
            </p>
          </div>
        </div>

        {/* ── KOMPONEN FORM UTAMA (Dikomen sementara) ── */}
        <PurchaseForm
          spreadsheetId={spreadsheetId}
          isDisabled={!isReadyToSubmit}
        />
      </main>
    </div>
  );
}
