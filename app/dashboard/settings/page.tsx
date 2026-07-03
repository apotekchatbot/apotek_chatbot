"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Loader2,
  Save,
  CheckCircle2,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";

/* ════════════════════════════════════
   GLASS STYLE TOKENS (inline helpers)
════════════════════════════════════ */
const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderColor: "rgba(29,158,117,0.16)",
};

const glassInput: React.CSSProperties = {
  background: "rgba(255,255,255,0.80)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  borderColor: "rgba(29,158,117,0.22)",
};

export default function SettingsPage() {
  const { user, isLoaded } = useUser();

  /* ── Form States ── */
  const [apotekNama, setApotekNama] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [waNumber, setWaNumber] = useState("");

  /* ── Verification States ── */
  const [waVerified, setWaVerified] = useState(false);
  const [spreadsheetVerified, setSpreadsheetVerified] = useState(false);

  /* ── UI States ── */
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [spreadsheetError, setSpreadsheetError] = useState<string | null>(null);

  /* ── 1. Fetch & Init Metadata ── */
  useEffect(() => {
    async function initMetadata() {
      if (!isLoaded || !user) return;

      const email = user.primaryEmailAddress?.emailAddress;
      if (!email) return;

      try {
        const res = await fetch("/api/init-meta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const result = await res.json();

        if (result.success && result.data) {
          setApotekNama(result.data.apotek_nama || "");
          setSpreadsheetId(result.data.spreadsheet_id || "");
          setWaNumber(result.data.wa_number || "");
          setWaVerified(result.data.wa_verified || false);
          setSpreadsheetVerified(result.data.spreadsheet_verified || false);
        }
      } catch (err) {
        console.error("Gagal memuat konfigurasi metadata:", err);
      } finally {
        setInitialLoading(false);
      }
    }

    initMetadata();
  }, [isLoaded, user]);

  /* ── 2. Handle Save Settings ── */
  async function handleSave(e: React.SyntheticEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSpreadsheetError(null); // Reset error sebelum mencoba menyimpan

    const email = user?.primaryEmailAddress?.emailAddress;

    const payload = {
      email,
      apotek_nama: apotekNama,
      spreadsheet_id: spreadsheetId,
      wa_number: waNumber,
    };

    try {
      const res = await fetch("/api/save-setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Gagal menyimpan");

      // Menangkap status verifikasi spreadsheet dari backend
      if (!result.spreadsheetverified) {
        setSpreadsheetError(
          "Koneksi gagal atau struktur sheet tidak lengkap. ID dikembalikan ke versi aman terakhir.",
        );
      } else {
        setSpreadsheetVerified(true);
      }

      // Update state sesuai data terbaru yang dikembalikan server
      if (result.data) {
        setSpreadsheetId(result.data.spreadsheet_id || "");
        setWaNumber(result.data.wa_number || "");
        setWaVerified(result.data.wa_verified || false);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (error) {
      console.error("Gagal menyimpan pengaturan:", error);
      alert("Terjadi kesalahan sistem saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isLoaded || initialLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f8fdf9] text-black">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#1D9E75]" />
          <p className="text-sm text-[#888780] font-medium">
            Memuat pengaturan apotek...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-[#f8fdf9] p-4 text-black font-sans relative">
      {/* Toast Sukses */}
      {saveSuccess && (
        <div className="fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full border px-5 py-2.5 text-[13.5px] font-medium text-[#085041] shadow-sm bg-[rgba(225,245,238,0.95)] backdrop-blur-md border-[rgba(29,158,117,0.3)]">
          <CheckCircle2 size={16} className="text-[#1D9E75]" />
          Pengaturan berhasil disimpan!
        </div>
      )}

      {/* Form Card */}
      <div
        className="w-full max-w-md rounded-2xl border p-6 sm:p-8 shadow-sm relative z-10"
        style={glassCard}
      >
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#111] tracking-tight">
            Pengaturan Cabang
          </h1>
          <p className="text-xs text-[#888780] mt-0.5">
            Konfigurasi database dan gerbang komunikasi bot apotek Anda.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Input Nama Apotek */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-[#2C2C2A]">
              Nama Apotek
            </label>
            <input
              type="text"
              placeholder="Contoh: Apotek Sehat Sejahtera"
              required
              value={apotekNama}
              onChange={(e) => setApotekNama(e.target.value)}
              className="w-full rounded-xl border px-3.5 py-2 text-[14px] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[rgba(29,158,117,0.15)] bg-transparent"
              style={glassInput}
            />
          </div>

          {/* Input Spreadsheet ID + Badge Status */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[13px] font-medium text-[#2C2C2A]">
                Google Spreadsheet ID
              </label>
              {spreadsheetVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-medium text-green-700">
                  <CheckCircle2 size={11} /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  <ShieldAlert size={11} /> Unverified
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="Masukkan Google Sheets ID..."
              value={spreadsheetId}
              required
              onChange={(e) => {
                setSpreadsheetId(e.target.value);
                setSpreadsheetVerified(false); // Reset status jika user mengetik ID baru
                setSpreadsheetError(null);
              }}
              className={`w-full rounded-xl border px-3.5 py-2 text-[14px] outline-none focus:ring-2 bg-transparent transition-all ${
                spreadsheetError
                  ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                  : "focus:border-[#1D9E75] focus:ring-[rgba(29,158,117,0.15)]"
              }`}
              style={glassInput}
            />
            {/* Note Error Spreadsheet */}
            {spreadsheetError && (
              <div className="flex items-start gap-1.5 mt-1 text-[12px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>{spreadsheetError}</p>
              </div>
            )}
          </div>

          {/* Input WhatsApp + Badge Status */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[13px] font-medium text-[#2C2C2A]">
                Nomor WhatsApp Apoteker
              </label>
              {waVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-medium text-green-700">
                  <CheckCircle2 size={11} /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  <ShieldAlert size={11} /> Unverified
                </span>
              )}
            </div>
            <input
              type="tel"
              placeholder="Contoh: +628123456789"
              value={waNumber}
              required
              disabled={waVerified}
              onChange={(e) => setWaNumber(e.target.value)}
              className="w-full rounded-xl border px-3.5 py-2 text-[14px] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[rgba(29,158,117,0.15)] bg-transparent disabled:bg-gray-100 disabled:opacity-60"
              style={glassInput}
            />
          </div>

          {/* ── Text Note (2 Poin Instruksi) ── */}
          <div className="text-[12px] text-[#6E6E6A] bg-[rgba(29,158,117,0.06)] p-3 rounded-xl border border-[rgba(29,158,117,0.12)] space-y-1">
            <p className="font-medium text-[#0F6E56]">
              Info setelah menekan tombol Simpan:
            </p>
            <ul className="list-disc list-inside space-y-0.5 opacity-90 pl-1">
              <li>Sistem akan memverifikasi koneksi Google Spreadsheet.</li>
              <li>
                Sistem akan memverifikasi WhatsApp secara otomatis (harap segera
                cek WhatsApp Anda).
              </li>
            </ul>
          </div>

          {/* Button Save Tunggal */}
          <button
            type="submit"
            disabled={isSaving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D9E75] py-2.5 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-[#0F6E56] disabled:cursor-not-allowed disabled:opacity-70 mt-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Memproses & Memverifikasi...
              </>
            ) : (
              <>
                <Save size={15} />
                Simpan Konfigurasi
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
