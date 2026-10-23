import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")),
  title: "Meet & Himani · સીમંત સંસ્કાર · A Little Bloom",
  description: "મીત અને હિમાનીના સીમંત સંસ્કારનું સ્નેહભર્યું આમંત્રણ. ૧૭ નવેમ્બર ૨૦૨૬, સવારે ૯:૩૦ વાગ્યે — Concord Restaurant & Banquet, Surat. Join the celebration and send your RSVP.",
  openGraph: {
    title: "Meet & Himani – Baby Shower – 17 November 2026",
    description: "Tiny little feet, a whole lot of love. Join us on 17 November 2026, 9:30 AM, at Concord Restaurant & Banquet, Surat.",
    type: "website",
    url: "/",
    siteName: "A Little Bloom",
    images: [{
      url: "/baby-shower-preview.jpg",
      width: 1200,
      height: 630,
      type: "image/jpeg",
      alt: "Meet & Himani – Baby Shower – 17 November 2026, with a teddy bear, pastel balloons and gold decorations",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Meet & Himani – Baby Shower – 17 November 2026",
    description: "Celebrate with us on 17 November 2026 at Concord Restaurant & Banquet, Surat.",
    images: ["/baby-shower-preview.jpg"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="gu">
      <body>{children}</body>
    </html>
  );
}
