// lib/services/notify-pharmacist-service.ts
import { google } from "googleapis";
import twilio from "twilio";
import { log } from "@/lib/logger";

interface NotifyPharmacistParams {
  spreadsheetId: string;
  apotek_petugas: string;
  pasien_nama: string;
  pasien_umur: string;
  pasien_gejala: string;
  pasien_durasi: string;
  pasien_wa: string;
  obat_list_raw: string;
  obat_id: string; // ID obat yang memicu flag bahaya
}

export async function notifyPharmacist({
  spreadsheetId,
  apotek_petugas,
  pasien_nama,
  pasien_umur,
  pasien_gejala,
  pasien_durasi,
  pasien_wa,
  obat_list_raw,
  obat_id,
}: NotifyPharmacistParams) {
  try {
    // 1. Inisialisasi Google Sheets API
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

    // 2. Ambil Nomor WA Apotek dari sheet tersembunyi 'setting!A2'
    const getSettingRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "setting!A2",
    });

    const waApotekRaw = getSettingRes.data.values?.[0]?.[0];
    if (!waApotekRaw) {
      throw new Error(
        "Nomor WhatsApp Apotek di setting!A2 tidak ditemukan atau kosong.",
      );
    }
    const formattedApotekWa = waApotekRaw.startsWith("whatsapp:")
      ? waApotekRaw
      : `whatsapp:${waApotekRaw}`;

    // 3. Ambil Master Data Obat untuk Translasi Nama
    const getObatRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "obat!A:B", // Cukup ambil Kolom A (ID) dan B (Nama)
    });
    const allObatData = getObatRes.data.values || [];

    // Translasi seluruh daftar belanja obat
    const rawListIds = obat_list_raw
      .split(";")
      .map((id: string) => id.trim())
      .filter(Boolean);
    const listNamaObat = rawListIds.map((id: string) => {
      const match = allObatData.find((row) => row[0] === id);
      return match && match[1] ? match[1] : id;
    });
    const obat_list_names = listNamaObat.join(", ");

    // Translasi obat spesifik yang bermasalah
    const targetObat = allObatData.find((row) => row[0] === obat_id);
    const obat_nama = targetObat && targetObat[1] ? targetObat[1] : obat_id;

    // 4. Sanitasi Nomor WA Pasien Khusus untuk Parameter URL wa.me (Hanya Angka)
    const cleanPasienWaForUrl = pasien_wa.replace(/\D/g, "");

    // 5. Eksekusi Pengiriman Template Twilio ke Apoteker
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error("Kredensial Twilio tidak lengkap di .env");
    }

    const client = twilio(accountSid, authToken);
    const contentSid = "HX3f28eddb84603d4c071b41bc43667f6a";

    // Pemetaan variabel sesuai spesifikasi template Meta Anda
    const variablesObj = {
      "1": apotek_petugas,
      "2": pasien_nama,
      "3": pasien_umur,
      "4": pasien_gejala,
      "5": pasien_durasi,
      "6": obat_list_names,
      "7": obat_nama,
      "8": cleanPasienWaForUrl, // Masuk ke wa.me/{{8}}
    };

    const message = await client.messages.create({
      from: twilioPhone,
      contentSid: contentSid,
      contentVariables: JSON.stringify(variablesObj),
      to: formattedApotekWa,
    });

    log.info(
      "notify-pharmacist",
      `Notifikasi gejala kritis berhasil dikirim ke Apoteker`,
      {
        sid: message.sid,
        tujuan: formattedApotekWa,
      },
    );

    return { success: true };
  } catch (error) {
    log.error(
      "notify-pharmacist",
      "Gagal memproses notifikasi ke apoteker",
      error,
      null,
    );
    return { success: false, error };
  }
}
