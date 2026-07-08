// app/dashboard/components/PurchaseForm.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";

/* ── Types ── */
type ObatRow = { id: string; value: string };
type MasterObat = { obat_id: string; obat_nama: string };
type FormErrors = {
  petugas?: string;
  nama?: string;
  umur?: string;
  wa?: string;
  obat?: string;
};

function makeRow(): ObatRow {
  return { id: crypto.randomUUID(), value: "" };
}

/* ── Style Helpers ── */
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

/* ════════════════════════════════════
   MAIN FORM COMPONENT
════════════════════════════════════ */
interface PurchaseFormProps {
  spreadsheetId: string;
  isDisabled: boolean;
}

export function PurchaseForm({ spreadsheetId, isDisabled }: PurchaseFormProps) {
  /* ── Form State ── */
  const [petugas, setPetugas] = useState("");
  const [nama, setNama] = useState("");
  const [umur, setUmur] = useState("");
  const [gejala, setGejala] = useState("");
  const [durasi, setDurasi] = useState("");
  const [wa, setWa] = useState("");
  const [obatRows, setObatRows] = useState<ObatRow[]>([makeRow()]);

  /* ── Data & UI State ── */
  const [daftarObat, setDaftarObat] = useState<MasterObat[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  /* ── Fetch Data Obat ── */
  useEffect(() => {
    async function fetchObat() {
      if (isDisabled || !spreadsheetId) return;
      try {
        const res = await fetch(`/api/get-obat?spreadsheetId=${spreadsheetId}`);
        const result = await res.json();
        if (result.success) {
          setDaftarObat(result.data);
        }
      } catch (err) {
        console.error("Gagal memuat daftar obat:", err);
      }
    }
    fetchObat();
  }, [spreadsheetId, isDisabled]);

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
    if (!petugas.trim()) e.petugas = "Nama petugas wajib diisi.";
    if (!nama.trim()) e.nama = "Nama pasien wajib diisi.";
    if (!umur.trim()) e.umur = "Umur wajib diisi.";
    if (!wa.trim()) e.wa = "Nomor WhatsApp wajib diisi.";
    if (obatRows.every((r) => !r.value)) e.obat = "Pilih minimal satu obat.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /* ── Submit ── */
  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isDisabled) return; // Proteksi ganda
    if (!validate()) return;

    setLoading(true);

    const belanja_list_obat = obatRows
      .map((r) => r.value)
      .filter(Boolean)
      .join(" ;");

    const payload = {
      spreadsheetId,
      apotek_petugas: petugas,
      pasien_nama: nama,
      pasien_umur: parseInt(umur),
      pasien_gejala: gejala,
      pasien_durasi: durasi,
      pasien_wa: wa,
      belanja_list_obat,
    };
    try {
      const response = await fetch("/api/belanja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Gagal menyimpan");

      setSuccess(true);
      /* Reset Form */
      setPetugas("");
      setNama("");
      setUmur("");
      setGejala("");
      setDurasi("");
      setWa("");
      setObatRows([makeRow()]);
      setErrors({});

      setTimeout(() => setSuccess(false), 4000);
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setLoading(false);
    }
  }

  const usedIds = obatRows.map((r) => r.value).filter(Boolean);

  return (
    <div className="w-full max-w-3xl relative">
      {/* Notifikasi Sukses */}
      {success && (
        <div className="absolute -top-16 left-1/2 z-50 flex w-max -translate-x-1/2 items-center gap-2.5 rounded-full border px-5 py-2.5 text-[13.5px] font-medium text-[#085041] shadow-sm bg-[rgba(225,245,238,0.95)] backdrop-blur-md border-[rgba(29,158,117,0.3)]">
          <CheckCircle2
            size={16}
            className="text-[#1D9E75]"
            aria-hidden="true"
          />
          Data pembelian berhasil disimpan!
        </div>
      )}

      <div className="rounded-2xl border p-6 sm:p-8" style={glassCard}>
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Status Overlay jika form disabled */}
          {isDisabled && (
            <div className="absolute inset-0 z-10 rounded-2xl bg-white/40 backdrop-blur-[1px]"></div>
          )}

          {/* Field Petugas */}
          <div className="space-y-1.5 relative z-20">
            <label className="block text-[13.5px] font-medium text-[#2C2C2A]">
              Nama Apoteker / Petugas{" "}
              <span className="ml-1 text-[#1D9E75]">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Apt. Sarah"
              value={petugas}
              disabled={isDisabled}
              onChange={(e) => {
                setPetugas(e.target.value);
                if (errors.petugas)
                  setErrors((p) => ({ ...p, petugas: undefined }));
              }}
              className="w-full rounded-xl border px-4 py-2.5 text-[14px] text-[#111] placeholder:text-[#B4B2A9] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[rgba(29,158,117,0.15)] bg-transparent disabled:opacity-60"
              style={glassInput}
            />
            {errors.petugas && (
              <p className="text-[12.5px] text-red-500">{errors.petugas}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 relative z-20">
            {/* Field Nama Pasien */}
            <div className="space-y-1.5">
              <label className="block text-[13.5px] font-medium text-[#2C2C2A]">
                Nama Pasien <span className="ml-1 text-[#1D9E75]">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Budi Santoso"
                value={nama}
                disabled={isDisabled}
                onChange={(e) => {
                  setNama(e.target.value);
                  if (errors.nama)
                    setErrors((p) => ({ ...p, nama: undefined }));
                }}
                className="w-full rounded-xl border px-4 py-2.5 text-[14px] text-[#111] placeholder:text-[#B4B2A9] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[rgba(29,158,117,0.15)] bg-transparent disabled:opacity-60"
                style={glassInput}
              />
              {errors.nama && (
                <p className="text-[12.5px] text-red-500">{errors.nama}</p>
              )}
            </div>

            {/* Field WA Pasien */}
            <div className="space-y-1.5">
              <label className="block text-[13.5px] font-medium text-[#2C2C2A]">
                Nomor WhatsApp <span className="ml-1 text-[#1D9E75]">*</span>
              </label>
              <input
                type="tel"
                placeholder="Contoh: 08123456789"
                value={wa}
                disabled={isDisabled}
                onChange={(e) => {
                  setWa(e.target.value);
                  if (errors.wa) setErrors((p) => ({ ...p, wa: undefined }));
                }}
                className="w-full rounded-xl border px-4 py-2.5 text-[14px] text-[#111] placeholder:text-[#B4B2A9] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[rgba(29,158,117,0.15)] bg-transparent disabled:opacity-60"
                style={glassInput}
              />
              {errors.wa && (
                <p className="text-[12.5px] text-red-500">{errors.wa}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 relative z-20">
            {/* Field Umur Pasien */}
            <div className="space-y-1.5">
              <label className="block text-[13.5px] font-medium text-[#2C2C2A]">
                Umur (Tahun) <span className="ml-1 text-[#1D9E75]">*</span>
              </label>
              <input
                type="number"
                placeholder="Contoh: 28"
                value={umur}
                disabled={isDisabled}
                onChange={(e) => {
                  setUmur(e.target.value);
                  if (errors.umur)
                    setErrors((p) => ({ ...p, umur: undefined }));
                }}
                className="w-full rounded-xl border px-4 py-2.5 text-[14px] text-[#111] placeholder:text-[#B4B2A9] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[rgba(29,158,117,0.15)] bg-transparent disabled:opacity-60"
                style={glassInput}
              />
              {errors.umur && (
                <p className="text-[12.5px] text-red-500">{errors.umur}</p>
              )}
            </div>

            {/* Field Durasi Gejala */}
            <div className="space-y-1.5">
              <label className="block text-[13.5px] font-medium text-[#2C2C2A]">
                Durasi Keluhan
              </label>
              <input
                type="text"
                placeholder="Contoh: 3 Hari"
                value={durasi}
                disabled={isDisabled}
                onChange={(e) => setDurasi(e.target.value)}
                className="w-full rounded-xl border px-4 py-2.5 text-[14px] text-[#111] placeholder:text-[#B4B2A9] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[rgba(29,158,117,0.15)] bg-transparent disabled:opacity-60"
                style={glassInput}
              />
            </div>
          </div>

          {/* Field Gejala Pasien */}
          <div className="space-y-1.5 relative z-20">
            <label className="block text-[13.5px] font-medium text-[#2C2C2A]">
              Gejala Spesifik
            </label>
            <input
              type="text"
              placeholder="Contoh: Batuk kering kronis dan nyeri dada"
              value={gejala}
              disabled={isDisabled}
              onChange={(e) => setGejala(e.target.value)}
              className="w-full rounded-xl border px-4 py-2.5 text-[14px] text-[#111] placeholder:text-[#B4B2A9] outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[rgba(29,158,117,0.15)] bg-transparent disabled:opacity-60"
              style={glassInput}
            />
          </div>

          {/* Divider */}
          <div
            className="border-t relative z-20"
            style={{ borderColor: "rgba(29,158,117,0.10)" }}
          />

          {/* Daftar Obat Dinamis */}
          <div className="space-y-3 relative z-20">
            <div className="flex items-center justify-between">
              <span className="text-[13.5px] font-medium text-[#2C2C2A]">
                Obat yang Ditebus <span className="ml-1 text-[#1D9E75]">*</span>
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
                  options={daftarObat}
                  usedIds={usedIds.filter((id) => id !== row.value)}
                  isDisabled={isDisabled}
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

            <button
              type="button"
              onClick={addObat}
              disabled={
                isDisabled || obatRows.length >= Math.max(1, daftarObat.length)
              }
              className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[13.5px] font-medium text-[#0F6E56] transition-all duration-150 hover:bg-[rgba(29,158,117,0.06)] disabled:cursor-not-allowed disabled:opacity-40 bg-[rgba(255,255,255,0.6)] border-[rgba(29,158,117,0.25)]"
            >
              <Plus size={15} aria-hidden="true" />
              Tambah obat
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isDisabled || loading}
            className="relative z-20 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D9E75] py-3 text-[14.5px] font-medium text-white transition-colors duration-150 hover:bg-[#0F6E56] disabled:cursor-not-allowed disabled:opacity-50 sm:py-3.5 mt-4"
          >
            {loading ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Menyimpan & Memulai Antrean…
              </>
            ) : (
              <>
                <CheckCircle2 size={16} aria-hidden="true" />
                Submit Pembelian
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ════════════════════════════════════
   OBAT DROPDOWN COMPONENT
════════════════════════════════════ */
function ObatDropdown({
  index,
  value,
  options,
  usedIds,
  isDisabled,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  value: string;
  options: MasterObat[];
  usedIds: string[];
  isDisabled: boolean;
  onChange: (val: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-medium text-[#0F6E56]"
        style={{ background: "rgba(29,158,117,0.10)" }}
        aria-hidden="true"
      >
        {index + 1}
      </div>

      <div className="relative flex-1">
        <select
          value={value}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border py-2.5 pl-4 pr-9 text-[14px] text-[#111] outline-none transition-all duration-150 focus:border-[#1D9E75] focus:ring-2 focus:ring-[rgba(29,158,117,0.15)] bg-transparent disabled:opacity-60"
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
          {options.length === 0 && (
            <option disabled>Memuat data obat...</option>
          )}
          {options.map((o) => (
            <option
              key={o.obat_id}
              value={o.obat_id}
              disabled={usedIds.includes(o.obat_id)}
              className="text-black"
            >
              {o.obat_nama} {usedIds.includes(o.obat_id) ? " (dipilih)" : ""}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#888780]"
          aria-hidden="true"
        />
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={isDisabled || !canRemove}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[#888780] transition-all duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 bg-[rgba(255,255,255,0.6)] border-[rgba(29,158,117,0.20)]"
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
