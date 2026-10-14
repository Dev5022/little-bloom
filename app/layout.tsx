import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meet & Himani · શ્રીમંત સંસ્કાર · A Little Bloom",
  description: "મીટ અને હિમાનીના શ્રીમંત સંસ્કારનું સ્નેહભર્યું આમંત્રણ. ૧૭ નવેમ્બર ૨૦૨૬, સવારે ૧૦ વાગ્યે — Royal Dine, Surat. Join the celebration and send your RSVP.",
  openGraph: { title: "A Little Bloom · Meet & Himani’s Baby Shower", description: "Tiny little feet, a whole lot of love. Join us on 17 November 2026, 10 AM IST, in Surat.", type: "website" },
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
