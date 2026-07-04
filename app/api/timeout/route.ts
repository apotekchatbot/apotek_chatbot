// app/api/timeout/route.ts
import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { google } from "googleapis";
import twilio from "twilio";
import { log } from "@/lib/logger";

// Handler inti yang dibungkus oleh verifikator Upstash
async function handler(req: Request) {
  try {
    const body = await req.json();
    const { chat_id, spreadsheetId, belanja_id, pasien_wa } = body;

    // 1. Inisialisasi Google Auth
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

    // 2. Cek status di sheet respon (Mengabaikan Race Condition untuk PoC)
    const responData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "respon!A:G", // Cek sampai kolom G (respon jawaban)
    });

    const responRows = responData.data.values || [];
    const rowIndex = responRows.findIndex((row) => row[0] === chat_id);

    if (rowIndex !== -1) {
      const jawabanPasien = responRows[rowIndex][6];

      // Jika kolom jawaban (G) MASIH KOSONG, maka eksekusi penutupan
      if (!jawabanPasien || jawabanPasien.trim() === "") {
        const sheetRowNumber = rowIndex + 1;
        const now = new Date().toISOString();

        // 3. Update baris menjadi ditutup
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `respon!G${sheetRowNumber}:I${sheetRowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [["TIDAK ADA RESPON", now, "CLOSED_BY_UNRESPON"]],
          },
        });

        // 4. Batalkan sisa antrean obat (jika ada)
        // Sama seperti logika pembatalan di webhook sebelumnya
        const askedObatIds = responRows
          .filter((r) => r[1] === belanja_id)
          .map((r) => r[2]);
        const belanjaData = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "belanja!A:H",
        });

        const belanjaRow = belanjaData.data.values?.find(
          (r) => r[0] === belanja_id,
        );
        if (belanjaRow) {
          const list_obat = (belanjaRow[7] || "")
            .split(";")
            .map((o: string) => o.trim())
            .filter(Boolean);
          const remainingObatIds = list_obat.filter(
            (obatId: string) => !askedObatIds.includes(obatId),
          );

          if (remainingObatIds.length > 0) {
            const rowsToAppend = remainingObatIds.map((obatId: string) => [
              `C-CANCEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              belanja_id,
              obatId,
              "-",
              "canceled",
              now,
              "Dibatalkan otomatis - Sistem ditutup karena tidak ada respon",
              now,
              "CANCELED_BY_UNRESPON",
            ]);

            await sheets.spreadsheets.values.append({
              spreadsheetId,
              range: "respon!A:I",
              valueInputOption: "USER_ENTERED",
              requestBody: { values: rowsToAppend },
            });
          }
        }

        // 5. Kirim pesan penutup ke Pasien via Twilio
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN,
        );
        const formattedNumber = pasien_wa.startsWith("whatsapp:")
          ? pasien_wa
          : `whatsapp:${pasien_wa}`;

        const closingMessage =
          "Waktu evaluasi telah berakhir. Karena tidak ada respons lanjutan, sistem otomatis menutup sesi pemantauan obat Anda. Jika Anda masih mengalami keluhan, silakan hubungi Apoteker kami secara langsung.\n\nSemoga lekas sembuh! 🙏";

        await client.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          body: closingMessage, // Mengirim pesan teks biasa (tanpa template)
          to: formattedNumber,
        });

        log.info(
          "timeout-api",
          `Berhasil menutup chat ${chat_id} secara otomatis`,
          null,
        );
      }
    }

    return NextResponse.json({ success: true, message: "Timeout di-handle" });
  } catch (error) {
    log.error("timeout-api", "Gagal mengeksekusi timeout", error, null);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// Membungkus method POST dengan verifikator QStash
export const POST = verifySignatureAppRouter(handler);
