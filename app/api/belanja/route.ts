import { google } from "googleapis";
import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Karena saat ini id-ss belum ditaruh di Clerk metadata,
    // kita asumsikan frontend mengirimkan spreadsheetId melalui payload body
    const {
      spreadsheetId,
      apotek_petugas,
      pasien_nama,
      pasien_umur,
      pasien_gejala,
      pasien_durasi,
      pasien_wa,
      belanja_list_obat,
    } = body;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "spreadsheetId wajib diisi" },
        { status: 400 },
      );
    }

    // --- Pembuatan belanja_id ---
    // Menghasilkan format: B-YYYYMMDD-HHMMSS (contoh: B-20260702-205848)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ""); // HHMMSS
    const belanja_id = `B-${dateStr}-${timeStr}`;

    // --- Inisialisasi Auth ---
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
          /\\n/g,
          "\n",
        ),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // --- Penulisan ke Baris Baru (Append) ---
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "belanja!A:H", // Membidik sheet 'belanja' dari kolom A sampai H
      valueInputOption: "USER_ENTERED", // Menjaga format data seperti diketik manual
      requestBody: {
        values: [
          [
            belanja_id,
            apotek_petugas,
            pasien_nama,
            pasien_umur,
            pasien_gejala,
            pasien_durasi,
            pasien_wa,
            belanja_list_obat,
          ],
        ],
      },
    });

    if (result.status == 200) {
      log.info("add-belanja", "Berhasil menambahkan data belanja", {
        belanja_id,
        spreadsheetId,
        apotek_petugas,
        pasien_nama,
        pasien_umur,
        pasien_gejala,
        pasien_durasi,
        pasien_wa,
        belanja_list_obat,
      });
    } else {
      log.error(
        "add-belanja",
        "Gagal menambahkan data belanja",
        result.statusText,
        {},
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data belanja berhasil ditambahkan.",
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
