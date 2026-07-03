import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    // Mengambil spreadsheetId dari parameter URL (misal: /api/get-obat?spreadsheetId=123)
    const searchParams = req.nextUrl.searchParams;
    const spreadsheetId = searchParams.get("spreadsheetId");

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "spreadsheetId wajib diisi pada parameter URL" },
        { status: 400 },
      );
    }

    // --- Inisialisasi Auth ---
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
          /\\n/g,
          "\n",
        ),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"], // Read-only untuk keamanan
    });

    const sheets = google.sheets({ version: "v4", auth });

    // --- Pengambilan Data (Read) ---
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "obat!A2:B", // Mulai dari baris 2 (mengabaikan header), ambil kolom A dan B
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Data obat kosong.",
        data: [],
      });
    }

    // --- Format Data untuk Dropdown ---
    // Memetakan array dari Sheets (misal: [["id_1", "Paracetamol"]]) menjadi array of objects
    const formattedData = rows
      .map((row) => ({
        obat_id: row[0] || "",
        obat_nama: row[1] || "",
      }))
      .filter((obat) => obat.obat_id !== ""); // Filter baris yang mungkin kosong tanpa sengaja

    log.info("get-obat", "Data obat berhasil diambil.", {
      count: formattedData.length,
    });
    return NextResponse.json({
      success: true,
      message: "Data obat berhasil diambil.",
      data: formattedData,
    });
  } catch (error) {
    log.error(
      "get-obat",
      "Gagal mengambil data obat dari Google Sheets:",
      error,
    );
    const err = error as { message?: string };

    return NextResponse.json(
      { error: "Gagal mengambil data obat", details: err.message },
      { status: 500 },
    );
  }
}
