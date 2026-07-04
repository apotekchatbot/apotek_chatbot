/**
 ** app/api/test/twelio1/route.ts
 * mencoba twelio quick button, 1 button
 */

import { NextResponse } from "next/server";
import twilio from "twilio";
import { log } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { no_wa, email, apotek_nama } = body;

    if (!no_wa || !email) {
      log.debug("test-twilio1", "Parameter no_wa dan email wajib diisi", null);
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
    const ContentSID = "HXa9846283042ca4932a2a1b686c5c3691";
    //variabel
    const variables = JSON.stringify({
      "1": apotek_nama, // akan diisi ke body, ex: ...di apotek {{1}}.
      "2": "Konfirmasii", // tekt pada button
      "3": `{test:${email}}`, // menjadi id button, format {verifyEmail:{{3}}}
    });
    // Mengirim pesan
    const message = await client.messages.create({
      from: twilioPhone,
      contentSid: ContentSID,
      contentVariables: variables,
      to: formattedNumber,
    });

    log.info("test-twilio1", "Pesan uji coba berhasil dikirim", {
      sid: message.sid,
      to: no_wa,
      Variable: variables,
    });
    log.debug("test-twilio1", "test data", message);

    return NextResponse.json({
      success: true,
      message: "Pesan uji coba Twilio berhasil dikirim",
      data: {
        sid: message.sid,
        status: message.status,
      },
    });
  } catch (error) {
    log.error("test-twilio1", "Gagal mengirim pesan Twilio", error, null);
    return NextResponse.json(
      { error: "Gagal mengirim pesan", details: error },
      { status: 500 },
    );
  }
}
