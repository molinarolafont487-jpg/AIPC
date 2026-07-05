import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phantom AI Workstation",
  description: "Enterprise digital employee workstation MVP."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

