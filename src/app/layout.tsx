import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sabuy MDM Web Hub",
  description: "Backend API & Database Engine for Sabuy MDM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
