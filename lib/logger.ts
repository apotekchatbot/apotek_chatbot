// lib/logger.ts

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  service: string;
  message: string;
  payload?: unknown;
  error?: string;
}

const isProd = process.env.NODE_ENV === "production";

const sendLog = (level: LogLevel, data: LogPayload) => {
  // Aturan Emas: Jika di Production, jangan kirim log 'debug' ke Axiom/Vercel
  if (level === "debug" && isProd) {
    return;
  }

  const logObject = {
    level,
    time: new Date().toISOString(),
    ...data,
  };

  if (level === "error") {
    console.error(JSON.stringify(logObject));
  } else {
    console.log(JSON.stringify(logObject));
  }
};

export const log = {
  // Tambahkan fungsi debug
  debug: (service: string, message: string, payload?: unknown) =>
    sendLog("debug", { service, message, payload }),

  info: (service: string, message: string, payload?: unknown) =>
    sendLog("info", { service, message, payload }),

  warn: (service: string, message: string, payload?: unknown) =>
    sendLog("warn", { service, message, payload }),

  error: (
    service: string,
    message: string,
    error?: unknown,
    payload?: unknown,
  ) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendLog("error", { service, message, error: errorMessage, payload });
  },
};
