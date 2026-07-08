import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Lewatkan semua fungsi internal Next.js dan file static (_next, gambar, dll)
    "/((?!_next|[^?]*\\.[\\w]+$|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    // Selalu jalankan untuk API routes
    "/(api|trpc)(.*)",
  ],
};
