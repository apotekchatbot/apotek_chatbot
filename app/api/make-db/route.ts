// app/api/make-db/route.ts
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      log.error("make-db", "Email tidak ditemukan di body request", null, {
        body,
      });
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }

    // 1. Inisialisasi Auth
    // Catatan: replace(/\\n/g, '\n') sangat penting karena newline di .env sering terbaca sebagai string literal
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
          /\\n/g,
          "\n",
        ),
      },
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });
    const templateId = process.env.TEMPLATE_SPREADSHEET_ID;

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID tidak ditemukan di ENV" },
        { status: 500 },
      );
    }

    const targetFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    // Jika undefined atau string kosong, stop di sini
    if (!targetFolderId) {
      throw new Error(
        "ERROR: GOOGLE_DRIVE_ROOT_FOLDER_ID belum diisi di file .env Anda!",
      );
    }

    // 2. Duplikasi File (Copy)
    const copyResponse = await drive.files.copy({
      fileId: templateId,
      requestBody: {
        name: email, // Menamai file dengan email pasien/cabang
        parents: [targetFolderId], // Menyimpan di root Drive
      },
    });

    const newSpreadsheetId = copyResponse.data.id;

    // 3. Berikan Akses Edit ke Email Input
    await drive.permissions.create({
      fileId: newSpreadsheetId as string,
      requestBody: {
        type: "user",
        role: "writer", // Memberikan akses Editor
        emailAddress: email,
      },
      // Mengirimkan notifikasi email bahwa file telah dibagikan
      sendNotificationEmail: true,
    });

    // 4. Kembalikan Kredensial/Data
    log.info("make-db", "Database berhasil dibuat dan dibagikan", {
      spreadsheetId: newSpreadsheetId,
      email,
    });
    return NextResponse.json({
      success: true,
      message: "Database berhasil dibuat dan dibagikan.",
      data: {
        spreadsheetId: newSpreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit`,
      },
    });
  } catch (error) {
    log.error("make-db", "Gagal membuat database", error, { body: req.body });
    return NextResponse.json(
      { error: "Gagal membuat database", details: error },
      { status: 500 },
    );
  }
}
