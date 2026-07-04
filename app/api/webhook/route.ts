// app/api/webhook/route.ts
import { NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { clerkClient } from "@clerk/nextjs/server";

// ═══════════════════════════════════════════════════════════════
// FUNGSI TERPISAH: Update Verifikasi ke Clerk
// ═══════════════════════════════════════════════════════════════
async function verifyUserWhatsApp(
  email: string,
  waNumber: string,
): Promise<boolean> {
  try {
    const client = await clerkClient();

    // 1. Cari user berdasarkan email yang diekstrak dari tombol
    const users = await client.users.getUserList({ emailAddress: [email] });

    if (users.data.length === 0) {
      log.error(
        "twilio-webhook",
        `User dengan email ${email} tidak ditemukan di Clerk`,
        null,
        null,
      );
      return false;
    }

    const targetUser = users.data[0];
    const currentMeta = targetUser.publicMetadata || {};

    // 2. Susun metadata baru (ubah wa_verified menjadi true)
    const updatedMeta = {
      ...currentMeta,
      wa_number: waNumber, // Memastikan nomor di Clerk sinkron dengan nomor pengirim aktual
      wa_verified: true,
    };

    // 3. Simpan perubahan ke Clerk
    await client.users.updateUserMetadata(targetUser.id, {
      publicMetadata: updatedMeta,
    });

    log.info("twilio-webhook", `WhatsApp diverifikasi untuk ${email}`, {
      metadata: updatedMeta,
    });
    return true;
  } catch (error) {
    log.error("twilio-webhook", "Gagal memverifikasi WA di Clerk", error, null);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER (POST)
// ═══════════════════════════════════════════════════════════════
export async function POST(req: Request) {
  try {
    // 1. Membaca data url-encoded dari Twilio
    const bodyText = await req.text();
    const formData = new URLSearchParams(bodyText);

    // 2. Mengekstrak variabel penting dari payload Twilio
    const from = formData.get("From");
    const body = formData.get("Body");
    const buttonPayload = formData.get("ButtonPayload");

    if (!from) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 3. Merapikan format data
    const no_wa = from.replace("whatsapp:", "");
    const jawaban = buttonPayload || body || "";

    // 4. Catat balasan masuk
    log.info("twilio-webhook", `Balasan diterima dari ${no_wa}`, {
      no_wa: no_wa,
      jawaban: jawaban,
    });

    let messageReply = `Terima kasih, respons Anda ("${jawaban}") telah tercatat di sistem Apotek.`;

    // 5. LOGIKA EKSTRAKSI EMAIL & VERIFIKASI
    // Mengecek apakah jawaban mengandung format {verifyEmail:email@domain.com}
    const verifyMatch = jawaban.match(/\{verifyEmail:(.+?)\}/);

    if (verifyMatch && verifyMatch[1]) {
      const extractedEmail = verifyMatch[1].trim(); // Mendapatkan email. ex:asd@asd.com

      // Eksekusi fungsi update Clerk
      const isSuccess = await verifyUserWhatsApp(extractedEmail, no_wa);

      if (isSuccess) {
        messageReply = `✅ Nomor WhatsApp Anda telah berhasil diverifikasi dan dihubungkan ke akun ${extractedEmail}.`;
      } else {
        messageReply = `❌ Gagal memverifikasi. Akun dengan email ${extractedEmail} tidak ditemukan dalam sistem kami.`;
      }
    }

    // on test
    const testMatch = jawaban.match(/\{test:(.+?)\}/);
    if (testMatch && testMatch[1]) {
      const extractedPayload = testMatch[1].trim(); // Mendapatkan email. ex:asd@asd.com

      messageReply = `test berhasi dengan payload: ${extractedPayload}.`;
    }

    // 6. Memberikan balasan otomatis ke pasien menggunakan format XML (TwiML)
    const twimlResponse = `
      <Response>
        <Message>${messageReply}</Message>
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
