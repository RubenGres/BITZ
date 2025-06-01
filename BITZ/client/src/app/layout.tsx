import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const inclusiveSans = localFont({
  src: [
    {
      path: './fonts/InclusiveSans-VariableFont_wght.ttf',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: './fonts/InclusiveSans-Italic-VariableFont_wght.ttf',
      weight: '100 900',
      style: 'italic',
    },
  ],
  variable: "--font-inclusive-sans",
});

const spaceMono = localFont({
  src: [
    {
      path: './fonts/SpaceMono-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/SpaceMono-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: './fonts/SpaceMono-Italic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: './fonts/SpaceMono-BoldItalic.ttf',
      weight: '700',
      style: 'italic',
    },
  ],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "BITZ",
  description: "Biodiversity in Transition Zones",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inclusiveSans.variable} ${spaceMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}