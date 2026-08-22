import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homeo Life | Dr. Neha Mehta",
  description:
    "Professional homeopathic care in Singapore with online booking, patient stories, blogs, and AI-assisted WhatsApp support.",
  icons: {
    icon: "/homeo-life-logo.svg"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
