import { clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

// ═══════════════════════════════════════════════════════════════
// FUNGSI VERIFIKASI SPREADSHEET (Dalam Halaman yang Sama)
// ═══════════════════════════════════════════════════════════════
async function verifySpreadsheetConnection(
  spreadsheetId: string,
): Promise<boolean> {
  try {
    if (!spreadsheetId) return false;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
          /\\n/g,
          "\n",
        ),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Mengambil metadata spreadsheet untuk mengecek akses dan struktur halaman
    const response = await sheets.spreadsheets.get({ spreadsheetId });

    const sheetsInFile =
      response.data.sheets?.map((s) => s.properties?.title) || [];
    const requiredSheets = ["obat", "belanja", "respon"];

    // Memastikan ketiga sheet yang diperlukan sudah dibuat oleh apoteker
    const isStructureValid = requiredSheets.every((sheet) =>
      sheetsInFile.includes(sheet),
    );

    return isStructureValid;
  } catch (error) {
    log.debug(
      "save-setting -> verify-spreadsheet",
      "Gagal memverifikasi spreadsheet",
      null,
    );
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER (POST)
// ═══════════════════════════════════════════════════════════════
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, apotek_nama, spreadsheet_id, wa_number } = body;

    // 1. Validasi Input Dasar
    if (!email) {
      return NextResponse.json(
        { error: "Parameter email wajib diisi" },
        { status: 400 },
      );
    }

    const client = await clerkClient();

    // 2. Cari User Berdasarkan Email
    const users = await client.users.getUserList({
      emailAddress: [email],
    });

    if (users.data.length === 0) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    const targetUser = users.data[0];
    const currentMeta = targetUser.publicMetadata || {};

    // 3. Eksekusi Verifikasi Spreadsheet
    const isSpreadsheetValid =
      await verifySpreadsheetConnection(spreadsheet_id);

    // 4. Logika Status Verifikasi WhatsApp
    // Jika nomor WA berubah dari yang tersimpan sebelumnya, reset status menjadi false
    const isWaNumberChanged = currentMeta.wa_number !== wa_number;
    const nextWaVerifiedStatus = isWaNumberChanged
      ? false
      : currentMeta.wa_verified || false;

    // ═══════════════════════════════════════════════════════════
    // TODO: Send TWILIO VERIFICATION
    // it just send, twalio response will be handled in another route
    // ═══════════════════════════════════════════════════════════

    // 5. Susun Metadata Baru
    const updatedMeta = {
      apotek_nama: apotek_nama || currentMeta.apotek_nama || "",
      wa_number: wa_number || currentMeta.wa_number || "",
      wa_verified: nextWaVerifiedStatus,
      spreadsheet_id: isSpreadsheetValid
        ? spreadsheet_id
        : currentMeta.spreadsheet_id || "",
      spreadsheet_verified: isSpreadsheetValid,
    };

    // 6. Simpan ke Public Metadata Clerk
    await client.users.updateUserMetadata(targetUser.id, {
      publicMetadata: updatedMeta,
    });

    log.info("save-setting", "Pengaturan berhasil disimpan", {
      email,
      spreadsheetverified: isSpreadsheetValid,
      data: updatedMeta,
    });

    return NextResponse.json({
      success: true,
      spreadsheetverified: isSpreadsheetValid,
      message: "Pengaturan berhasil diproses dan disimpan.",
      data: updatedMeta,
    });
  } catch (error) {
    log.error("save-setting", "Gagal menyimpan pengaturan", error, null);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan", details: error },
      { status: 500 },
    );
  }
}
