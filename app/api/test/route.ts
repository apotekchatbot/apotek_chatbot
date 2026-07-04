// app/api/test/route.ts
/**
 * TODO: DELETE
 */


import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

interface SalesRequestBody {
  namaObat: string;
  harga: number;
  stok: number;
}

export async function POST(request: Request) {
  try {
    // Membaca data JSON yang dikirimkan dari Postman
    const body = await request.json();

    const { isValid, error, data } = validateSalesBody(body);

    if (!isValid) {
      log.error("api-test", "Input penjualan tidak valid", error, body);

      return NextResponse.json(
        {
          status: "error",
          service: "api-test",
          shouldBe:
            "Pastikan body request berisi 'namaObat', 'harga', dan 'stok' dengan format yang benar.",
          message: error,
        },
        { status: 400 },
      );
    }

    log.info("api-test", "Input penjualan diterima", data);

    // Mengembalikan data yang sama beserta status sukses
    return NextResponse.json(
      {
        status: "success",
        service: "api-test",
        message: "Data berhasil diterima oleh Next.js",
        dataYangDikirim: data,
      },
      { status: 200 },
    );
  } catch (error) {
    // Antisipasi jika Postman mengirimkan body yang kosong atau bukan format JSON
    log.error("api-test", "Gagal membaca data", error, { body: request.body });

    return NextResponse.json(
      {
        status: "error",
        message:
          "Gagal membaca data. Pastikan format body di Postman adalah JSON (raw -> JSON).",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}

// body must contaoin "namaObat", "harga", and "stok" properties

function validateSalesBody(body: unknown): {
  isValid: boolean;
  error?: string;
  data?: SalesRequestBody;
} {
  // 1. Cek apakah body kosong atau bukan merupakan objek
  if (!body || typeof body !== "object") {
    return {
      isValid: false,
      error: "Format body request harus berupa JSON objek.",
    };
  }

  // Cast body ke type record untuk pengecekan tipe data yang aman
  const payload = body as Record<string, unknown>;

  // 2. Validasi namaObat (Wajib ada dan harus String)
  if (payload.namaObat === undefined || payload.namaObat === null) {
    return { isValid: false, error: "Kolom 'namaObat' wajib diisi." };
  }
  if (typeof payload.namaObat !== "string" || payload.namaObat.trim() === "") {
    return {
      isValid: false,
      error: "Kolom 'namaObat' harus berupa teks yang valid.",
    };
  }

  // 3. Validasi harga (Wajib ada, harus Angka, dan tidak boleh kurang dari 0)
  if (payload.harga === undefined || payload.harga === null) {
    return { isValid: false, error: "Kolom 'harga' wajib diisi." };
  }
  if (
    typeof payload.harga !== "number" ||
    isNaN(payload.harga) ||
    payload.harga < 0
  ) {
    return {
      isValid: false,
      error: "Kolom 'harga' harus berupa angka positif.",
    };
  }

  // 4. Validasi stok (Wajib ada, harus Angka bulat/Integer, dan tidak boleh kurang dari 0)
  if (payload.stok === undefined || payload.stok === null) {
    return { isValid: false, error: "Kolom 'stok' wajib diisi." };
  }
  if (
    typeof payload.stok !== "number" ||
    isNaN(payload.stok) ||
    payload.stok < 0 ||
    !Number.isInteger(payload.stok)
  ) {
    return {
      isValid: false,
      error: "Kolom 'stok' harus berupa angka bulat positif.",
    };
  }

  // Jika semua lolos pengecekan
  return {
    isValid: true,
    data: {
      namaObat: payload.namaObat.trim(),
      harga: payload.harga,
      stok: payload.stok,
    },
  };
}
