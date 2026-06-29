import type { Metadata } from "next";
import "../globals.css";
import { Providers } from "./providers";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Cinova",
  description:
    "Cinova - Film ve dizi tutkunları için kişiselleştirilmiş izleme listesi platformu.",
  keywords: "film, dizi, izleme listesi, cinova, watchlist, tmdb, sinema",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  let initialUser = null;
  let initialAccessToken = null;

  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      initialAccessToken = session.access_token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiUrl}/me`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        next: { revalidate: 0 }, // Do not cache the session result
      });
      if (response.ok) {
        initialUser = await response.json();
      }
    }
  } catch (err) {
    console.error("Sunucu tarafında oturum veya kullanıcı bilgisi alınamadı:", err);
  }

  return (
    <html lang={lang} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers initialUser={initialUser} initialAccessToken={initialAccessToken}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
