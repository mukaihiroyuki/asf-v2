import type { Metadata } from "next";
import { Outfit, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: '--font-outfit',
});

const notoJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: '--font-noto-jp',
});

export const metadata: Metadata = {
  title: "Addness Sales Form 2.0",
  description: "Addness Premium Sales Automation System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${outfit.variable} ${notoJP.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
