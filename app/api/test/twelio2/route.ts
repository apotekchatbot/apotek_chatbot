/**
 ** app/api/test/twelio2/route.ts
 * mencoba twelio quick button, 2 button
 */

import { NextResponse } from "next/server";
import twilio from "twilio";
import { log } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { no_wa, obat, apotek_nama } = body;

    if (!no_wa || !obat || !apotek_nama) {
      log.debug("test-twilio2", "Parameter no_wa dan email wajib diisi", null);
      return NextResponse.json(
        { error: "Parameter no_wa wajib diisi" },
        { status: 400 },
      );
    }

    // Mengambil kredensial dari .env.local
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error("Kredensial Twilio di .env.local belum lengkap");
    }

    const client = twilio(accountSid, authToken);
    const formattedNumber = no_wa.startsWith("whatsapp:") // Twilio mewajibkan prefix 'whatsapp:' sebelum nomor
      ? no_wa
      : `whatsapp:${no_wa}`;

    //conten template id
    const ContentSID = "HX9162f0efd27ef42ae0506bc13bf38726";
    //variabel
    const variables = JSON.stringify({
      "1": apotek_nama, // akan diisi ke body, ex: ...di apotek {{1}}.
      "2": obat, // tekt belanja obat
      "3": "apakah sudah merasa baikan?", // text
      "4": "konten1", // tekt pada button 1
      "5": `{test:${apotek_nama}}`, // id button 1
      "6": "konten2", // tekt pada button
      "7": `{test:${obat}}`, // id button 1
    });

    // Mengirim pesan
    const message = await client.messages.create({
      from: twilioPhone,
      contentSid: ContentSID,
      contentVariables: variables,
      to: formattedNumber,
    });

    log.info("test-twilio2", "Pesan uji coba berhasil dikirim", {
      sid: message.sid,
      to: no_wa,
      Variable: variables,
    });
    log.debug("test-twili2", "test data", message);

    return NextResponse.json({
      success: true,
      message: "Pesan uji coba Twilio berhasil dikirim",
      data: {
        sid: message.sid,
        status: message.status,
      },
    });
  } catch (error) {
    log.error("test-twilio2", "Gagal mengirim pesan Twilio", error, null);
    return NextResponse.json(
      { error: "Gagal mengirim pesan", details: error },
      { status: 500 },
    );
  }
}
