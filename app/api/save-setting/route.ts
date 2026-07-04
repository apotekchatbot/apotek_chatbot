import { clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { log } from "@/lib/logger";
import twilio from "twilio";

interface UserMetadata {
  apotek_nama?: string;
  wa_number?: string;
  wa_verified?: boolean;
  spreadsheet_id?: string;
  spreadsheet_verified?: boolean;
  [key: string]: unknown;
}

// FUNGSI HELPER: Standarisasi format nomor WhatsApp agar bersih dari spasi/karakter unik
function formatWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, ""); // Hapus semua karakter non-angka
  if (cleaned.startsWith("0")) {
    cleaned = `62${cleaned.substring(1)}`;
  }
  if (!cleaned.startsWith("+")) {
    cleaned = `+${cleaned}`;
  }
  return cleaned;
}

// FUNGSI VERIFIKASI SPREADSHEET
async function verifySpreadsheetConnection(
  spreadsheetId: string,
): Promise<boolean> {
  try {
    if (!spreadsheetId) return false;

    if (
      !process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ) {
      throw new Error(
        "Kredensial Google Service Account tidak ditemukan di .env",
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(
          /\\n/g,
          "\n",
        ),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Mengambil metadata berdasarkan ID murni
    const response = await sheets.spreadsheets.get({ spreadsheetId });

    const sheetsInFile =
      response.data.sheets?.map((s) => s.properties?.title?.toLowerCase()) ||
      [];
    const requiredSheets = ["obat", "belanja", "respon"];

    // Memastikan ketiga sheet yang diperlukan sudah dibuat (case-insensitive)
    const isStructureValid = requiredSheets.every((sheet) =>
      sheetsInFile.includes(sheet.toLowerCase()),
    );

    return isStructureValid;
  } catch (error) {
    log.error(
      "save-setting -> verify-spreadsheet",
      "Gagal memverifikasi spreadsheet",
      error,
      null,
    );
    return false;
  }
}

// FUNGSI KIRIM WA (Hanya mengirim pesan verifikasi awal)
async function sendTwilioVerification(
  wa_number: string,
  email: string,
  apotek_nama: string,
) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error("Kredensial Twilio tidak lengkap di .env");
    }

    const client = twilio(accountSid, authToken);
    const formattedNumber = wa_number.startsWith("whatsapp:")
      ? wa_number
      : `whatsapp:${wa_number}`;

    //conten template id
    const ContentSID = "HXa9846283042ca4932a2a1b686c5c3691";
    //variabel
    const variables = JSON.stringify({
      "1": apotek_nama, // akan diisi ke body, ex: ...di apotek {{1}}.
      "2": "Konfirmasi", // tekt pada button
      "3": `{verifyEmail:${email}}`, // menjadi id button format {verifyEmail:{{3}}}
    });
    //send message
    const message = await client.messages.create({
      from: twilioPhone,
      contentSid: ContentSID,
      contentVariables: variables,
      to: formattedNumber,
    });

    log.info(
      "save-setting -> send-twilio-verification",
      "Pesan konfirmasi berhasil dipicu ke Twilio",
      {
        sid: message.sid,
        to: wa_number,
      },
    );
  } catch (error) {
    log.error(
      "save-setting -> send-twilio-verification",
      "Gagal melakukan registrasi pengiriman ke Twilio",
      error,
      null,
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER (POST)
// ═══════════════════════════════════════════════════════════════
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, apotek_nama, spreadsheet_id, wa_number } = body;

    // 1. Validasi Input Utama
    if (!email) {
      return NextResponse.json(
        { error: "Parameter email wajib diisi" },
        { status: 400 },
      );
    }

    const formattedWaNumber = wa_number ? formatWhatsAppNumber(wa_number) : "";
    const client = await clerkClient();
    const users = await client.users.getUserList({ emailAddress: [email] });

    if (users.data.length === 0) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    const targetUser = users.data[0];
    const currentMeta = (targetUser.publicMetadata || {}) as UserMetadata;

    // 2. Eksekusi Verifikasi Spreadsheet (Langsung menggunakan ID murni)
    const isSpreadsheetValid = spreadsheet_id
      ? await verifySpreadsheetConnection(spreadsheet_id.trim())
      : false;

    // 3. Susun Metadata Baru (Mempertahankan status wa_verified asli tanpa melakukan reset)
    const updatedMeta: UserMetadata = {
      apotek_nama: apotek_nama || currentMeta.apotek_nama || "",
      wa_number: formattedWaNumber || currentMeta.wa_number || "",
      wa_verified: currentMeta.wa_verified || false, // Perubahan status diverifikasi di-handle oleh API lain
      spreadsheet_id: isSpreadsheetValid
        ? spreadsheet_id.trim()
        : currentMeta.spreadsheet_id || "",
      spreadsheet_verified: isSpreadsheetValid,
    };

    // 4. Trigger pengiriman pesan Twilio secara asinkron (Non-blocking) jika nomor diinput
    if (formattedWaNumber) {
      sendTwilioVerification(
        formattedWaNumber,
        email,
        updatedMeta.apotek_nama || "Apoteker",
      );
    }

    // 5. Simpan Perubahan ke Public Metadata Clerk
    await client.users.updateUserMetadata(targetUser.id, {
      publicMetadata: updatedMeta,
    });

    log.info("save-setting", "Pengaturan berhasil diperbarui", {
      email,
      spreadsheetverified: isSpreadsheetValid,
    });

    return NextResponse.json({
      success: true,
      spreadsheetverified: isSpreadsheetValid,
      message: "Pengaturan berhasil diproses dan disimpan.",
      data: updatedMeta,
    });
  } catch (error) {
    log.error("save-setting", "Gagal menyimpan pengaturan", error, null);

    // Mencegah crash HTTP 500 dengan mengekstrak string pesan error saja
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan sistem internal";

    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan", details: errorMessage },
      { status: 500 },
    );
  }
}
