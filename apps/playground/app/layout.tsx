import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TipTap Playground",
  description:
    "Demo host for @tiptap-playground/editor - driver-injected editor for regulated document management.",
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
