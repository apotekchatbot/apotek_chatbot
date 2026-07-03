import { NextResponse } from "next/server";
import twilio from "twilio";
import { log } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { no_wa } = body;

    if (!no_wa) {
      log.debug("test-twilio", "Parameter no_wa wajib diisi", null);
      return NextResponse.json(
        { error: "Parameter no_wa wajib diisi" },
        { status: 400 },
      );
    }

    // Mengambil kredensial dari .env.local
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    // Nomor pengirim Twilio (jika Sandbox biasanya whatsapp:+14155238886)
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error("Kredensial Twilio di .env.local belum lengkap");
    }

    const client = twilio(accountSid, authToken);

    // Twilio mewajibkan prefix 'whatsapp:' sebelum nomor
    const formattedNumber = no_wa.startsWith("whatsapp:")
      ? no_wa
      : `whatsapp:${no_wa}`;

    // Mengirim pesan
    const message = await client.messages.create({
      from: "whatsapp:+14155238886",
      contentSid: "HXb5d07231ffbc3779855f607da159f707", //template untuk dua opsi
      contentVariables:
        '{"1":"Kimia Farma","2":"Amoxcilin, Omeprazole","3":"apakah kamu sudah merasa baikan?","4":"Sudah","5":"Belum"}',
      to: formattedNumber,
    });

    log.info("test-twilio", "Pesan uji coba berhasil dikirim", {
      sid: message.sid,
      to: no_wa,
    });

    return NextResponse.json({
      success: true,
      message: "Pesan uji coba Twilio berhasil dikirim",
      data: {
        sid: message.sid,
        status: message.status,
      },
    });
  } catch (error) {
    log.error("test-twilio", "Gagal mengirim pesan Twilio", error, null);
    return NextResponse.json(
      { error: "Gagal mengirim pesan", details: error },
      { status: 500 },
    );
  }
}
