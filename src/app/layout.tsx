import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import { LanguageProvider } from "@/context/LanguageContext";
import "./globals.css";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sabuy MDM Web Hub",
  description: "Device Owner control plane and Nekketsu agent office",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={pixel.variable} suppressHydrationWarning>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
