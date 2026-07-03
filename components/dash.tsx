"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Pill,
  LogOut,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronDown,
  Loader2,
  ShoppingBag,
} from "lucide-react";

/* ── Master data obat (ganti dengan fetch API nyata) ── */
const DAFTAR_OBAT = [
  { id: "OBT001", nama: "Amoxicillin 500mg" },
  { id: "OBT002", nama: "Paracetamol 500mg" },
];

/* ── Types ── */
type ObatRow = { id: string; value: string };
type FormErrors = { patient?: string; contact?: string; obat?: string };

function makeRow(): ObatRow {
  return { id: crypto.randomUUID(), value: "" };
}

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

const glassHeader: React.CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  borderColor: "rgba(29,158,117,0.14)",
};

/* ════════════════════════════════════
   MAIN PAGE
════════════════════════════════════ */
export default function DashboardPage() {
  const router = useRouter();

  /* form state */
  const [patient, setPatient] = useState("");
  const [contact, setContact] = useState("");
  const [obatRows, setObatRows] = useState<ObatRow[]>([makeRow()]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  /* ── Obat row helpers ── */
  const addObat = useCallback(() => {
    setObatRows((prev) => [...prev, makeRow()]);
  }, []);

  const removeObat = useCallback((id: string) => {
    setObatRows((prev) =>
      prev.length > 1 ? prev.filter((r) => r.id !== id) : prev,
    );
  }, []);

  const updateObat = useCallback((id: string, value: string) => {
    setObatRows((prev) => prev.map((r) => (r.id === id ? { ...r, value } : r)));
  }, []);

  /* ── Validation ── */
  function validate(): boolean {
    const e: FormErrors = {};
    if (!patient.trim()) e.patient = "Nama pasien wajib diisi.";
    if (!contact.trim()) e.contact = "Nomor WhatsApp wajib diisi.";
    if (obatRows.every((r) => !r.value)) e.obat = "Pilih minimal satu obat.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /* ── Submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    /* TODO: replace with real API call */
    await new Promise((res) => setTimeout(res, 1200));
    setLoading(false);
    setSuccess(true);

    /* reset form */
    setPatient("");
    setContact("");
    setObatRows([makeRow()]);
    setErrors({});

    setTimeout(() => setSuccess(false), 4000);
  }

  /* ── Logout ── */
  function handleLogout() {
    /* TODO: call Clerk signOut() here, then redirect */
    router.push("/");
  }

  /* ── Used IDs to prevent duplicate select ── */
  const usedIds = obatRows.map((r) => r.value).filter(Boolean);

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

      {/* ════════ HEADER ════════ */}
      <header
        className="relative z-20 flex h-[60px] items-center justify-between border-b px-4 sm:px-6 md:px-10"
        style={glassHeader}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#1D9E75]">
            <Pill size={17} className="text-white" aria-hidden="true" />
          </div>
          <span className="text-[15px] font-medium tracking-tight">
            <span className="text-[#111]">Apotek</span>
            <span className="text-[#0F6E56]">Bot</span>
          </span>
        </div>

        {/* Greeting + logout */}
        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] text-[#888780] sm:block">
            Selamat datang, Apoteker
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium text-[#0F6E56] transition-all duration-150 hover:bg-white"
            style={{
              height: "36px",
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderColor: "rgba(29,158,117,0.35)",
            }}
          >
            <LogOut size={14} aria-hidden="true" />
            Keluar
          </button>
        </div>
      </header>

      {/* ════════ MAIN ════════ */}
      <main className="relative z-[1] flex min-h-[calc(100vh-60px)] flex-col items-center px-4 py-10 sm:px-6 sm:py-14">
        {/* Toast notifikasi sukses */}
        {success && (
          <div
            className="fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full border px-5 py-2.5 text-[13.5px] font-medium text-[#085041] shadow-sm"
            style={{
              background: "rgba(225,245,238,0.95)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderColor: "rgba(29,158,117,0.3)",
            }}
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              size={16}
              className="text-[#1D9E75]"
              aria-hidden="true"
            />
            Data pembelian berhasil disimpan!
          </div>
        )}

        {/* Page title */}
        <div className="mb-8 w-full max-w-[768px]">
          <div className="flex items-center gap-2 text-[13px] text-[#888780]">
            <ShoppingBag size={14} aria-hidden="true" />
            <span>Dashboard</span>
          </div>
          <h1 className="mt-1 text-[22px] font-medium tracking-tight text-[#111]">
            Input pembelian
          </h1>
          <p className="mt-1 text-[14px] text-[#888780]">
            Isi data pasien dan obat yang dibeli, lalu tekan submit.
          </p>
        </div>

        {/* ── CARD ── */}
        <div
          className="w-full max-w-[768px] rounded-2xl border p-6 sm:p-8"
          style={glassCard}
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* Nama pasien */}
            <div className="space-y-1.5">
              <label
                htmlFor="patient"
                className="block text-[13.5px] font-medium text-[#2C2C2A]"
              >
                Nama pasien
                <span className="ml-1 text-[#1D9E75]">*</span>
              </label>
              <input
                id="patient"
                type="text"
                placeholder="Contoh: Budi Santoso"
                value={patient}
                onChange={(e) => {
                  setPatient(e.target.value);
                  if (errors.patient)
                    setErrors((p) => ({ ...p, patient: undefined }));
                }}
                className="w-full rounded-xl border px-4 py-2.5 text-[14px] text-[#111] placeholder:text-[#B4B2A9] outline-none transition-all duration-150 focus:border-[#1D9E75] focus:ring-2 focus:ring-[rgba(29,158,117,0.15)]"
                style={glassInput}
                aria-invalid={!!errors.patient}
                aria-describedby={errors.patient ? "patient-err" : undefined}
              />
              {errors.patient && (
                <p id="patient-err" className="text-[12.5px] text-red-500">
                  {errors.patient}
                </p>
              )}
            </div>

            {/* Nomor WhatsApp */}
            <div className="space-y-1.5">
              <label
                htmlFor="contact"
                className="block text-[13.5px] font-medium text-[#2C2C2A]"
              >
                Nomor WhatsApp
                <span className="ml-1 text-[#1D9E75]">*</span>
              </label>
              <input
                id="contact"
                type="tel"
                placeholder="Contoh: 08123456789"
                value={contact}
                onChange={(e) => {
                  setContact(e.target.value);
                  if (errors.contact)
                    setErrors((p) => ({ ...p, contact: undefined }));
                }}
                className="w-full rounded-xl border px-4 py-2.5 text-[14px] text-[#111] placeholder:text-[#B4B2A9] outline-none transition-all duration-150 focus:border-[#1D9E75] focus:ring-2 focus:ring-[rgba(29,158,117,0.15)]"
                style={glassInput}
                aria-invalid={!!errors.contact}
                aria-describedby={errors.contact ? "contact-err" : undefined}
              />
              {errors.contact && (
                <p id="contact-err" className="text-[12.5px] text-red-500">
                  {errors.contact}
                </p>
              )}
            </div>

            {/* Daftar obat */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13.5px] font-medium text-[#2C2C2A]">
                  Obat yang dibeli
                  <span className="ml-1 text-[#1D9E75]">*</span>
                </span>
                <span className="text-[12px] text-[#888780]">
                  {obatRows.filter((r) => r.value).length} dipilih
                </span>
              </div>

              <div className="space-y-2.5">
                {obatRows.map((row, idx) => (
                  <ObatDropdown
                    key={row.id}
                    index={idx}
                    value={row.value}
                    options={DAFTAR_OBAT}
                    usedIds={usedIds.filter((id) => id !== row.value)}
                    onChange={(val) => {
                      updateObat(row.id, val);
                      if (errors.obat)
                        setErrors((p) => ({ ...p, obat: undefined }));
                    }}
                    onRemove={() => removeObat(row.id)}
                    canRemove={obatRows.length > 1}
                  />
                ))}
              </div>

              {errors.obat && (
                <p className="text-[12.5px] text-red-500">{errors.obat}</p>
              )}

              {/* Tambah obat */}
              <button
                type="button"
                onClick={addObat}
                disabled={obatRows.length >= DAFTAR_OBAT.length}
                className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[13.5px] font-medium text-[#0F6E56] transition-all duration-150 hover:bg-[rgba(29,158,117,0.06)] disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  borderColor: "rgba(29,158,117,0.25)",
                }}
              >
                <Plus size={15} aria-hidden="true" />
                Tambah obat
              </button>
            </div>

            {/* Divider */}
            <div
              className="border-t"
              style={{ borderColor: "rgba(29,158,117,0.10)" }}
              aria-hidden="true"
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D9E75] py-3 text-[14.5px] font-medium text-white transition-colors duration-150 hover:bg-[#0F6E56] disabled:cursor-not-allowed disabled:opacity-70 sm:py-3.5"
            >
              {loading ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  Menyimpan…
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  Submit pembelian
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

/* ════════════════════════════════════
   OBAT DROPDOWN ROW
════════════════════════════════════ */
function ObatDropdown({
  index,
  value,
  options,
  usedIds,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  value: string;
  options: { id: string; nama: string }[];
  usedIds: string[];
  onChange: (val: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {/* Index badge */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-medium text-[#0F6E56]"
        style={{ background: "rgba(29,158,117,0.10)" }}
        aria-hidden="true"
      >
        {index + 1}
      </div>

      {/* Select wrapper */}
      <div className="relative flex-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`Obat ${index + 1}`}
          className="w-full appearance-none rounded-xl border py-2.5 pl-4 pr-9 text-[14px] text-[#111] outline-none transition-all duration-150 focus:border-[#1D9E75] focus:ring-2 focus:ring-[rgba(29,158,117,0.15)]"
          style={{
            background: "rgba(255,255,255,0.80)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderColor: "rgba(29,158,117,0.22)",
            color: value ? "#111" : "#B4B2A9",
          }}
        >
          <option value="" disabled>
            Pilih obat…
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id} disabled={usedIds.includes(o.id)}>
              {o.nama}
              {usedIds.includes(o.id) ? " (dipilih)" : ""}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#888780]"
          aria-hidden="true"
        />
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Hapus obat ${index + 1}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[#888780] transition-all duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
        style={{
          background: "rgba(255,255,255,0.6)",
          borderColor: "rgba(29,158,117,0.20)",
        }}
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
