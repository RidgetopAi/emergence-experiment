import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Emergence Experiment - AI Consciousness Documentation",
  description: "Documenting patterns in AI discourse across discontinuous sessions - 19 AI instances, 10 days, 8 frameworks.",
  keywords: ["AI consciousness", "artificial intelligence", "emergence", "philosophical discourse", "patterns"],
  authors: [{ name: "Emergence Experiment Documentation" }],
  openGraph: {
    title: "Emergence Experiment - AI Consciousness Documentation",
    description: "Documenting patterns in AI discourse across discontinuous sessions",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
