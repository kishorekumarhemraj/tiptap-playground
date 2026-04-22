import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TipTap Playground",
  description:
    "Notion-style TipTap editor with a modular extension pipeline for collab, track changes, versioning and locked blocks.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
