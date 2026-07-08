// app/api/belanja/route.ts
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { triggerChatPertanyaan } from "@/lib/services/chat-service";

// ═══════════════════════════════════════════════════════════════
// FUNGSI HELPER: Standarisasi Nomor WhatsApp
// ═══════════════════════════════════════════════════════════════
function formatWhatsAppNumber(phone: string): string {
  if (!phone) return "";

  // 1. Hapus semua karakter yang bukan angka (spasi, tanda hubung, dll)
  let cleaned = phone.replace(/\D/g, "");

  // 2. Jika dimulai dengan angka 0, ganti dengan 62
  if (cleaned.startsWith("0")) {
    cleaned = `62${cleaned.substring(1)}`;
  }

  // 3. Pastikan selalu memiliki awalan '+' untuk standar internasional Twilio
  if (!cleaned.startsWith("+")) {
    cleaned = `+${cleaned}`;
  }

  return cleaned;
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      spreadsheetId,
      apotek_petugas,
      pasien_nama,
      pasien_umur,
      pasien_gejala,
      pasien_durasi,
      pasien_wa, // Nomor mentah dari frontend
      belanja_list_obat,
    } = body;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "spreadsheetId wajib diisi" },
        { status: 400 },
      );
    }

    // --- STANDARISASI NOMOR WA ---
    const formatted_wa = formatWhatsAppNumber(pasien_wa);

    if (!formatted_wa || formatted_wa.length < 10) {
      return NextResponse.json(
        { error: "Format nomor WhatsApp tidak valid" },
        { status: 400 },
      );
    }

    // --- Ekstrak Obat Pertama ---
    const daftarObat = belanja_list_obat
      .split(";")
      .map((o: string) => o.trim())
      .filter(Boolean);

    const obatPertama = daftarObat[0];

    if (!obatPertama) {
      return NextResponse.json(
        { error: "Daftar obat tidak boleh kosong" },
        { status: 400 },
      );
    }

    // --- Pembuatan belanja_id ---
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ""); // HHMMSS
    const belanja_id = `B-${dateStr}-${timeStr}`;

    // --- Inisialisasi Auth Google Sheets ---
    if (
      !process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ) {
      throw new Error("Kredensial Google Service Account belum lengkap");
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(
          /\\n/g,
          "\n",
        ),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // ═══════════════════════════════════════════════════════════════
    // PERUBAHAN: Ambil Nama Apotek secara dinamis dari sheet setting!B2
    // ═══════════════════════════════════════════════════════════════
    let apotek_nama = "Apotek";
    try {
      const settingData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "setting!B2",
      });
      apotek_nama = settingData.data.values?.[0]?.[0] || "Apotek";
    } catch (sheetErr) {
      log.error(
        "add-belanja",
        "Gagal mengambil nama apotek dari setting!B2, menggunakan fallback",
        sheetErr,
        null,
      );
    }
    // ═══════════════════════════════════════════════════════════════

    // --- Penulisan ke Baris Baru (Append) ---
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "belanja!A:H",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            belanja_id,
            apotek_petugas,
            pasien_nama,
            pasien_umur,
            pasien_gejala,
            pasien_durasi,
            formatted_wa, // Menyimpan nomor yang sudah rapi ke Google Sheets
            belanja_list_obat,
          ],
        ],
      },
    });

    if (result.status === 200) {
      log.info("add-belanja", "Berhasil menambahkan data belanja", {
        belanja_id,
        spreadsheetId,
        belanja_list_obat,
      });

      // --- TRIGGER CHAT UNTUK OBAT PERTAMA ---
      const chatResult = await triggerChatPertanyaan({
        spreadsheetId,
        belanja_id,
        pasien_wa: formatted_wa, // Meneruskan nomor rapi ke Twilio service
        apotek_nama, // Sekarang berisi string dari setting!B2
        obat_id: obatPertama,
        obat_list: belanja_list_obat,
      });

      if (!chatResult.success) {
        log.warn(
          "add-belanja",
          "Catatan belanja berhasil, tapi chat gagal dikirim",
          chatResult,
        );
      }
    } else {
      throw new Error(
        `Gagal menambahkan data ke Google Sheets (Status: ${result.statusText})`,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data belanja berhasil ditambahkan dan antrean pesan dimulai.",
      data: {
        belanja_id,
      },
    });
  } catch (error) {
    log.error("add-belanja", "Gagal menambahkan data belanja", error, null);
    const err = error as { message?: string };

    return NextResponse.json(
      { error: "Gagal menyimpan data belanja", details: err.message },
      { status: 500 },
    );
  }
}
