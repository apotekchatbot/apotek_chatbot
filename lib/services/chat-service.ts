// lib/services/chat-service.ts
import { google } from "googleapis";
import twilio from "twilio";
import { log } from "@/lib/logger";
import { Client } from "@upstash/qstash";

interface SendChatParams {
  spreadsheetId: string;
  belanja_id: string;
  pasien_wa: string;
  apotek_nama: string;
  obat_id: string;
  obat_list: string;
}

/**
 * Fungsi sentral untuk mengirim pertanyaan kuesioner dan mencatat state ke sheet 'respon'.
 * Fungsi ini bisa dipanggil secara aman dari /api/belanja maupun /api/webhook.
 */
export async function triggerChatPertanyaan({
  spreadsheetId,
  belanja_id,
  pasien_wa,
  apotek_nama,
  obat_id,
  obat_list,
}: SendChatParams) {
  try {
    // 1. Inisialisasi Google Auth
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

    // 2. Ambil seluruh data dari sheet 'obat'
    const getObatRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "obat!A:F",
    });

    const allObatData = getObatRes.data.values || [];

    // Mencari data obat utama (yang sedang ditanyakan saat ini)
    const barisObat = allObatData.find((row) => row[0] === obat_id);
    if (!barisObat) {
      throw new Error(
        `Obat dengan ID ${obat_id} tidak ditemukan di sheet 'obat'`,
      );
    }

    const obat_nama = barisObat[1] || "*paracetamol*"; // Fallback nama obat
    const penjelasan = barisObat[2] || "*ini adalah obat generik*";
    const pertanyaan = barisObat[3] || "*Apakah Anda sudah merasa baikan?*";
    const opsiMentah = barisObat[4] || "";

    // ═══════════════════════════════════════════════════════════════
    // 3. TRANSLASI DAFTAR KODE MENJADI DAFTAR NAMA
    // ═══════════════════════════════════════════════════════════════
    const rawListIds = obat_list
      .split(";")
      .map((id) => id.trim())
      .filter(Boolean);

    const listNamaObat = rawListIds.map((id) => {
      const match = allObatData.find((row) => row[0] === id);
      // Jika ID ditemukan di database, ambil namanya (kolom indeks 1)
      // Jika karena alasan tertentu tidak ditemukan, fallback menggunakan ID aslinya
      return match && match[1] ? match[1] : id;
    });

    // Menggabungkan array nama menjadi string rapi: "Bodrex, Paracetamol, Vitamin C"
    const obat_list_names = listNamaObat.join(", ");

    // 3. Parsing dan Pembersihan Opsi (Fallback Kuat)
    const rawOptions = opsiMentah
      .split(";")
      .map((o: string) => o.trim())
      .filter(Boolean);
    const options = rawOptions.slice(0, 3); // Meta membatasi maksimal 3 tombol Quick Reply

    if (options.length === 0) {
      throw new Error(
        `Obat ${obat_nama} tidak memiliki opsi jawaban (respon_opsi kosong)`,
      );
    }

    // 4. Buat chat_id unik untuk tracking webhook
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const randomHex = Math.floor(Math.random() * 65535)
      .toString(16)
      .padStart(4, "0");
    const chat_id = `C-${dateStr}-${randomHex}`;

    // Helper untuk merakit hidden payload:
    const createPayload = (opt: string) =>
      `{cid:${chat_id}|sid:${spreadsheetId}|ans:${opt}}`;
    const cleanDisplayText = (opt: string) =>
      opt.replace(/^\*/, "").substring(0, 20);

    // 5. Rakit Payload Twilio berdasarkan jumlah opsi (sesuai template pengujian Anda)
    let contentSid = "";
    let variablesObj: Record<string, string> = {};

    if (options.length === 1) {
      contentSid = "HXa9846283042ca4932a2a1b686c5c3691";
      variablesObj = {
        "1": apotek_nama,
        "2": cleanDisplayText(options[0]),
        "3": createPayload(options[0]),
      };
    } else if (options.length === 2) {
      // 2 option
      contentSid = "HXbf57c1f218ca1ca1f71d07c7eb1dccd6";
      variablesObj = {
        "1": apotek_nama,
        "2": obat_list_names,
        "3": obat_nama,
        "4": penjelasan,
        "5": pertanyaan,
        "6": cleanDisplayText(options[0]),
        "7": createPayload(options[0]),
        "8": cleanDisplayText(options[1]),
        "9": createPayload(options[1]),
      };
    } else {
      contentSid = "HX4bb0eac5e6eb460def8d8810e8087d32"; // 3 Options
      variablesObj = {
        "1": apotek_nama,
        "2": obat_list_names,
        "3": obat_nama,
        "4": penjelasan,
        "5": pertanyaan,
        "6": cleanDisplayText(options[0]),
        "7": createPayload(options[0]),
        "8": cleanDisplayText(options[1]),
        "9": createPayload(options[1]),
        "10": cleanDisplayText(options[2]),
        "11": createPayload(options[2]),
      };
    }
    // ... [Langkah 1 sampai 5 tetap sama seperti sebelumnya] ...

    // 6. Eksekusi Pengiriman Twilio (Dengan Nested Try-Catch)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error("Kredensial Twilio belum lengkap");
    }

    const client = twilio(accountSid, authToken);
    const formattedNumber = pasien_wa.startsWith("whatsapp:")
      ? pasien_wa
      : `whatsapp:${pasien_wa}`;

    let deliveryStatus = "failed";
    let errorMessage = "";

    try {
      const message = await client.messages.create({
        from: twilioPhone,
        contentSid: contentSid,
        contentVariables: JSON.stringify(variablesObj),
        to: formattedNumber,
      });
      deliveryStatus = message.status; // Biasanya 'queued' atau 'sent'

      log.debug("chat-service", "", message);
      log.info(
        "chat-service",
        `Berhasil memicu pesan Twilio untuk obat ${obat_id}`,
        { chat_id, sid: message.sid },
      );
    } catch (twilioErr) {
      // Menangkap error spesifik dari Twilio (misal: invalid number)
      log.error(
        "chat-service",
        `Twilio gagal mengirim ke ${formattedNumber}`,
        twilioErr,
        null,
      );
      deliveryStatus = "failed";
      errorMessage =
        twilioErr instanceof Error
          ? twilioErr.message
          : "Nomor tidak valid/API Error";
    }

    // 7. Catat status ke sheet 'respon' (Tereksekusi APAPUN hasilnya)
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "respon!A:I",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            chat_id, // Kolom A: chat_id
            belanja_id, // Kolom B: belanja_id
            obat_id, // Kolom C: obat_id
            pertanyaan, // Kolom D: pertanyaan
            deliveryStatus, // Kolom E: kirim_status ('queued', 'sent', atau 'failed')
            now.toISOString(), // Kolom F: kirim_waktu
            errorMessage, // Kolom G: respon (diisi pesan error jika gagal)
            "", // Kolom H: respon_waktu
            deliveryStatus === "failed" ? "GAGAL KIRIM" : "", // Kolom I: respon_flag
          ],
        ],
      },
    });

    // Beritahu pemanggil bahwa siklus ini gagal secara fatal
    if (deliveryStatus === "failed") {
      log.debug(
        "chat-service",
        "Gagal mengirim pesan, nomor mungkin tidak valid.",
        { chat_id },
      );
      return {
        success: false,
        error: "Gagal mengirim pesan, nomor mungkin tidak valid.",
        chat_id,
      };
    }

    try {
      const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/timeout`,
        body: {
          chat_id,
          spreadsheetId,
          belanja_id,
          pasien_wa,
        },
        delay: "3m", //TODO: ubah ke waktu yang diperlukan
      });

      log.info(
        "chat-service -> upstash",
        `Jadwal penutupan otomatis (8 jam) didaftarkan untuk chat ${chat_id}`,
        null,
      );
    } catch (qErr) {
      // Kita tidak melempar error agar kegagalan QStash tidak merusak alur utama
      log.debug("chat-service -> upstash", "Gagal mendaftarkan timer QStash", {
        qErr,
      });
    }

    return { success: true, chat_id };
  } catch (error) {
    // Catch terluar hanya untuk error sistem (misal: Gagal Auth Google)
    log.error("chat-service", "Sistem gagal memproses alur chat", error, null);
    return { success: false, error };
  }
}
