import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { spreadsheetId } = await req.json();

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "spreadsheetId wajib diisi" },
        { status: 400 },
      );
    }

    // 1. Inisialisasi Auth
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

    // --- TUGAS 1 & 2: Cek eksistensi file dan ketersediaan Sheet 1, 2, 3 ---
    // Memanggil metadata spreadsheet
    const metaData = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    // Mengambil daftar nama sheet dari metadata
    const existingSheets =
      metaData.data.sheets?.map((sheet) => sheet.properties?.title) || [];

    // Tentukan nama sheet yang diharapkan sesuai desain database Anda
    // (Sesuaikan nama ini dengan yang ada di template Anda)
    const requiredSheets = ["obat", "belanja", "respon"];

    const missingSheets = requiredSheets.filter(
      (reqSheet) => !existingSheets.includes(reqSheet),
    );

    if (missingSheets.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `File ditemukan, tapi sheet berikut hilang: ${missingSheets.join(", ")}`,
          existingSheets,
        },
        { status: 400 },
      );
    }

    // --- TUGAS 3: Lakukan penulisan sederhana (Write Test) ---
    // Kita menulis di sel yang jauh dari data utama agar tidak merusak, misal sel Z99 di sheet pertama
    const testRange = `${requiredSheets[0]}!Z99`;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: testRange,
      valueInputOption: "RAW",
      requestBody: {
        values: [["test_write_ok"]],
      },
    });

    // --- TUGAS 4: Hapus tulisan sederhana (Clear Test) ---
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: testRange,
    });

    // Jika semua proses di atas lolos tanpa error, koneksi aman 100%
    return NextResponse.json({
      success: true,
      message:
        "Database valid. File dan semua sheet ditemukan, akses baca/tulis sukses.",
      spreadsheetTitle: metaData.data.properties?.title,
      sheets: existingSheets,
    });
  } catch (error) {
    console.error("Health Check Error:", error);

    // Memberitahu TypeScript bentuk objek error yang diharapkan dari Google API
    const err = error as { code?: number; message?: string };

    // Tangani error spesifik (misal: file tidak ditemukan atau akses ditolak)
    if (err.code === 404 || err.code === 403) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Spreadsheet tidak ditemukan atau Service Account tidak memiliki akses.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Gagal memverifikasi database",
        details: err.message || "Terjadi kesalahan yang tidak diketahui",
      },
      { status: 500 },
    );
  }
}
