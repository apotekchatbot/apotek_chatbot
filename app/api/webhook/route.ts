// app/api/webhook/route.ts
import { NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { triggerChatPertanyaan } from "@/lib/services/chat-service";
import { notifyPharmacist } from "@/lib/services/notify-pharmacist-service";

// ═══════════════════════════════════════════════════════════════
// FUNGSI HELPER: Update Verifikasi ke Clerk & Google Sheets
// ═══════════════════════════════════════════════════════════════
async function verifyUserWhatsApp(
  email: string,
  waNumber: string,
  spreadsheetId: string,
): Promise<boolean> {
  try {
    // 1. Update Metadata Clerk
    const client = await clerkClient();
    const users = await client.users.getUserList({ emailAddress: [email] });

    if (users.data.length === 0) {
      log.error(
        "twilio-webhook",
        `User dengan email ${email} tidak ditemukan`,
        null,
        null,
      );
      return false;
    }

    const targetUser = users.data[0];
    const updatedMeta = {
      ...(targetUser.publicMetadata || {}),
      wa_number: waNumber,
      wa_verified: true,
    };

    await client.users.updateUserMetadata(targetUser.id, {
      publicMetadata: updatedMeta,
    });

    // 2. Inisialisasi Google Auth
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

    // 3. Tulis Nomor WA ke Sheet Tersembunyi (setting!A2)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "setting!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[waNumber]], // Menimpa sel A2 dengan nomor WA yang terverifikasi
      },
    });

    log.info(
      "twilio-webhook",
      `WhatsApp diverifikasi untuk ${email} dan ditulis ke sheet`,
      {
        metadata: updatedMeta,
        spreadsheetId,
      },
    );
    return true;
  } catch (error) {
    log.error(
      "twilio-webhook",
      "Gagal memverifikasi WA di Clerk atau Sheet",
      error,
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
    const bodyText = await req.text();
    const formData = new URLSearchParams(bodyText);

    const from = formData.get("From");
    const body = formData.get("Body");
    const buttonPayload = formData.get("ButtonPayload");

    if (!from) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const no_wa = from.replace("whatsapp:", "");
    const jawaban = buttonPayload || body || "";

    let twimlResponse = `<Response></Response>`;

    log.info("twilio-webhook", `Balasan diterima dari ${no_wa}`, { jawaban });

    // ── LOGIKA 1: VERIFIKASI EMAIL & PENULISAN SHEET ──
    // Format payload baru: {verifyEmail:asd@asd.com|sid:1Bxi...}
    const verifyMatch = jawaban.match(/\{verifyEmail:(.+?)\|sid:(.+?)\}/);

    if (verifyMatch) {
      const extractedEmail = verifyMatch[1].trim();
      const spreadsheetId = verifyMatch[2].trim();

      // Eksekusi fungsi update Clerk & Google Sheets
      const isSuccess = await verifyUserWhatsApp(
        extractedEmail,
        no_wa,
        spreadsheetId,
      );

      const reply = isSuccess
        ? `✅ Nomor WhatsApp Anda telah berhasil diverifikasi dan dihubungkan ke sistem apotek.`
        : `❌ Gagal memverifikasi. Akun tidak ditemukan atau Spreadsheet tidak valid.`;

      return new NextResponse(
        `<Response><Message>${reply}</Message></Response>`,
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        },
      );
    }

    // ── LOGIKA 2: TEST PAYLOAD ──
    const testMatch = jawaban.match(/\{test:(.+?)\}/);
    if (testMatch && testMatch[1]) {
      return new NextResponse(
        `<Response><Message>Test berhasil: ${testMatch[1].trim()}</Message></Response>`,
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        },
      );
    }

    // ── LOGIKA 3: KUESIONER SEQUENTIAL CHAINING ──
    // Format payload: {cid:C-XXXX|sid:1Bxi...|ans:*Mual}
    const chatMatch = jawaban.match(/\{cid:(.+?)\|sid:(.+?)\|ans:(.+?)\}/);

    if (chatMatch) {
      const chat_id = chatMatch[1].trim();
      const spreadsheetId = chatMatch[2].trim();
      const rawAns = chatMatch[3].trim();

      // Sanitasi jawaban dan penentuan flag
      const isFlagged = rawAns.startsWith("*");
      const cleanAns = rawAns.replace(/^\*/, "").trim();
      const responFlag = isFlagged ? "Diteruskan ke Apoteker" : "AMAN";

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

      const responData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "respon!A:D",
      });

      const responRows = responData.data.values || [];
      const rowIndex = responRows.findIndex((row) => row[0] === chat_id);

      if (rowIndex !== -1) {
        const sheetRowNumber = rowIndex + 1;
        const belanja_id = responRows[rowIndex][1];
        const now = new Date().toISOString();

        // 1. UPDATE baris dengan jawaban pasien
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `respon!G${sheetRowNumber}:I${sheetRowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[cleanAns, now, responFlag]],
          },
        });

        // 2. CEK ANTREAN
        const askedObatIds = responRows
          .filter((r) => r[1] === belanja_id)
          .map((r) => r[2]);
        const belanjaData = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "belanja!A:H",
        });
        const belanjaRows = belanjaData.data.values || [];
        const belanjaRow = belanjaRows.find((r) => r[0] === belanja_id);

        if (belanjaRow) {
          const apotek_petugas = belanjaRow[1] || "Apoteker";
          const list_obat_raw = belanjaRow[7] || "";
          const list_obat = list_obat_raw
            .split(";")
            .map((o: string) => o.trim())
            .filter(Boolean);

          const nextObatId = list_obat.find(
            (obatId: string) => !askedObatIds.includes(obatId),
          );

          // 3. LOGIKA PEMUTUSAN RANTAI JIKA FLAGGED
          if (isFlagged) {
            // Tulis status pembatalan untuk sisa obat (Audit Trail)
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
                "Dibatalkan otomatis - Imbas flag pada obat sebelumnya",
                now,
                "CANCELED_BY_FLAG",
              ]);

              await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: "respon!A:I",
                valueInputOption: "USER_ENTERED",
                requestBody: { values: rowsToAppend },
              });
            }

            // ═══════════════════════════════════════════════════════════════
            // EKSEKUSI: Panggil Service Notifikasi Apoteker
            // ═══════════════════════════════════════════════════════════════
            await notifyPharmacist({
              spreadsheetId,
              apotek_petugas,
              pasien_nama: belanjaRow[2] || "Pasien",
              pasien_umur: belanjaRow[3] || "-",
              pasien_gejala: belanjaRow[4] || "-",
              pasien_durasi: belanjaRow[5] || "-",
              pasien_wa: no_wa, // Mengirim nomor asli pasien
              obat_list_raw: list_obat_raw,
              obat_id: responRows[rowIndex][2], // ID obat yang sedang bermasalah di baris ini
            });
            // ═══════════════════════════════════════════════════════════════

            const emergencyReply =
              "Terima kasih atas informasinya. Beberapa keluhan Anda telah kami catat sebagai prioritas. Apoteker kami akan segera menghubungi Anda untuk konsultasi lebih lanjut. Mohon hentikan sementara penggunaan obat tersebut hingga ada arahan.";
            twimlResponse = `<Response><Message>${emergencyReply}</Message></Response>`;
          } else if (nextObatId) {
            // ═══════════════════════════════════════════════════════════════
            // PERUBAHAN DI SINI: Ambil nama apotek dari sheet setting!B2
            // ═══════════════════════════════════════════════════════════════
            const settingData = await sheets.spreadsheets.values.get({
              spreadsheetId,
              range: "setting!B2",
            });
            const apotekNamaTerpusat =
              settingData.data.values?.[0]?.[0] || "Apotek";
            // ═══════════════════════════════════════════════════════════════

            // Jika AMAN dan masih ada obat, teruskan antrean
            await triggerChatPertanyaan({
              spreadsheetId,
              belanja_id,
              pasien_wa: no_wa,
              apotek_nama: apotekNamaTerpusat, // Menggunakan nama apotek dari setting!B2
              obat_id: nextObatId,
              obat_list: list_obat_raw,
            });
            // twimlResponse tetap kosong karena triggerChatPertanyaan mengirim template Twilio
          } else {
            // Jika AMAN dan antrean habis
            const closingMessage =
              "Terima kasih atas waktu Anda. Seluruh evaluasi penggunaan obat telah selesai dicatat.";
            twimlResponse = `<Response><Message>${closingMessage}</Message></Response>`;
          }
        }
      }
    }

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    log.error("twilio-webhook", "Gagal memprocess webhook", error, null);
    return new NextResponse(`<Response></Response>`, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
