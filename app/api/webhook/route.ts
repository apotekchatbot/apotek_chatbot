import { NextResponse } from "next/server";
import { log } from "@/lib/logger"; // Sesuaikan dengan path logger Anda

export async function POST(req: Request) {
  try {
    // 1. Membaca data url-encoded dari Twilio
    const bodyText = await req.text();
    const formData = new URLSearchParams(bodyText);

    // 2. Mengekstrak variabel penting dari payload Twilio
    const from = formData.get("From"); // Contoh format: whatsapp:+62812...
    const body = formData.get("Body"); // Berisi teks jawaban atau teks tombol yang diklik
    const buttonPayload = formData.get("ButtonPayload"); // Terkadang tombol mengirim ID rahasia ke sini

    if (!from) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 3. Merapikan format data
    const no_wa = from.replace("whatsapp:", "");
    // Prioritaskan ButtonPayload jika ada, jika tidak gunakan Body
    const jawaban = buttonPayload || body || "";

    // 4. Catat jawaban (Nantinya di sini logika update ke Database/Spreadsheet)
    log.info("twilio-webhook", `Balasan diterima dari ${no_wa}`, {
      no_wa: no_wa,
      jawaban: jawaban,
      all: bodyText,
    });

    // 5. Memberikan balasan otomatis ke pasien menggunakan format XML (TwiML)
    // Twilio mewajibkan response HTTP 200 yang berisi format XML <Response>
    const twimlResponse = `
      <Response>
        <Message>Terima kasih, respons Anda ("${jawaban}") telah tercatat di sistem Apotek.</Message>
      </Response>
    `;

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    log.error("twilio-webhook", "Gagal memproses webhook", error, null);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
