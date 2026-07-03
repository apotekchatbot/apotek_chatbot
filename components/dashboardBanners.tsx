// app/dashboard/components/DashboardBanners.tsx
import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";

interface DashboardBannersProps {
  isSheetVerified: boolean;
  isWaVerified: boolean;
}

export function DashboardBanners({
  isSheetVerified,
  isWaVerified,
}: DashboardBannersProps) {
  return (
    <div className="w-full space-y-3.5">
      {/* ── BANNER SPREADSHEET BELUM VERIFIED ── */}
      {!isSheetVerified && (
        <div className="flex w-full flex-col gap-4 rounded-xl border bg-[rgba(254,242,242,0.85)] p-4 text-[13.5px] text-red-950 backdrop-blur-md border-[rgba(239,68,68,0.25)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-600 sm:mt-0"
              aria-hidden="true"
            />
            <p>
              <span className="font-semibold">
                Google Spreadsheet belum terhubung!
              </span>{" "}
              Hubungkan ID Spreadsheet Anda di halaman pengaturan agar data
              transaksi bisa dicatat dengan benar.
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-[12.5px] font-medium text-white transition-colors duration-150 hover:bg-red-700 shrink-0 shadow-sm"
          >
            Atur Spreadsheet
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* ── BANNER WHATSAPP BELUM VERIFIED ── */}
      {!isWaVerified && (
        <div className="flex w-full flex-col gap-4 rounded-xl border bg-[rgba(254,242,242,0.85)] p-4 text-[13.5px] text-red-950 backdrop-blur-md border-[rgba(239,68,68,0.25)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-600 sm:mt-0"
              aria-hidden="true"
            />
            <p>
              <span className="font-semibold">WhatsApp Bot belum aktif!</span>{" "}
              Sesi verifikasi WhatsApp Anda terputus atau belum dikonfigurasi.
              Segera lakukan aktivasi bot.
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-[12.5px] font-medium text-white transition-colors duration-150 hover:bg-red-700 shrink-0 shadow-sm"
          >
            Verifikasi WhatsApp
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
