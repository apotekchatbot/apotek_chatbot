import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { no_wa } = body;

    // 1. Validasi Input
    if (!no_wa) {
      return NextResponse.json(
        { error: "Parameter no_wa wajib diisi" },
        { status: 400 },
      );
    }

    const client = await clerkClient();

    // 2. Tarik daftar user (limit 100 sangat cukup untuk fase PoC)
    const usersList = await client.users.getUserList({ limit: 100 });

    // 3. Cari user secara manual di dalam publicMetadata
    const targetUser = usersList.data.find(
      (user) => user.publicMetadata?.wa_number === no_wa,
    );

    if (!targetUser) {
      return NextResponse.json(
        { error: "User dengan nomor WA tersebut tidak ditemukan di sistem." },
        { status: 404 },
      );
    }

    // 4. Update publicMetadata
    // Menggunakan spread operator (...) agar apotek_nama dan wa_number tidak tertimpa/hilang
    await client.users.updateUserMetadata(targetUser.id, {
      publicMetadata: {
        ...targetUser.publicMetadata,
        wa_verified: true,
      },
    });

    // 5. Ekstraksi Data Kembalian
    const email = targetUser.emailAddresses[0]?.emailAddress || null;
    const apotek_nama = targetUser.publicMetadata?.apotek_nama || null;

    log.info("test-verify", "Status verifikasi berhasil diperbarui", {
      email,
      apotek_nama,
      no_wa,
    });
    return NextResponse.json({
      success: true,
      message: "Status verifikasi berhasil diperbarui",
      data: {
        email,
        apotek_nama,
        wa_number: no_wa,
        wa_verified: true,
      },
    });
  } catch (error) {
    console.error("Test Verify Error:", error);
    log.error("test-verify", "Gagal memproses verifikasi", error, null);
    return NextResponse.json(
      { error: "Gagal memproses verifikasi", details: error },
      { status: 500 },
    );
  }
}
