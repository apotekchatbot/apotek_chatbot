import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Parameter email wajib diisi" },
        { status: 400 },
      );
    }

    const client = await clerkClient();

    // 1. Cari user berdasarkan email
    const users = await client.users.getUserList({
      emailAddress: [email],
    });

    if (users.data.length === 0) {
      log.debug("init-meta", "User dengan email tersebut tidak ditemukan", {
        email,
      });
      return NextResponse.json(
        { error: "User dengan email tersebut tidak ditemukan" },
        { status: 404 },
      );
    }

    const targetUser = users.data[0];
    const currentMeta = targetUser.publicMetadata;

    // Template default
    const defaultMeta = {
      apotek_nama: "",
      wa_number: "",
      wa_verified: false,
      spreadsheet_id: "",
      spreadsheet_verified: false,
    };

    // 2. Pengecekan: Apakah meta masih kosong?
    if (currentMeta?.wa_verified === undefined) {
      // Jika kosong, inisialisasi dengan nilai default
      await client.users.updateUserMetadata(targetUser.id, {
        publicMetadata: defaultMeta,
      });
      log.info("init-meta", "Metadata baru berhasil diinisialisasi", {
        email,
        data: defaultMeta,
      });

      return NextResponse.json({
        success: true,
        message: "Metadata baru berhasil diinisialisasi",
        data: defaultMeta,
      });
    }

    // 3. Jika sudah ada, langsung kembalikan data yang ada (di-merge)
    const mergedMeta = { ...defaultMeta, ...currentMeta };

    log.info("init-meta", "Metadata berhasil diambil", {
      email,
      mergedMeta,
    });
    return NextResponse.json({
      success: true,
      message: "Metadata berhasil diambil",
      data: mergedMeta,
    });
  } catch (error) {
    log.error(
      "init-meta",
      "Gagal menginisialisasi atau mengambil metadata",
      error,
      null,
    );
    return NextResponse.json(
      {
        error: "Gagal menginisialisasi atau mengambil metadata",
        details: error,
      },
      { status: 500 },
    );
  }
}
