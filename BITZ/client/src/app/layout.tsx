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
  description: "Take photos of species and learn about the biodiversity around you.",
  manifest: "/manifest.json",
  themeColor: "#3EC488",
  viewport: "width=device-width, initial-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BITZ",
  },
  icons: {
    apple: "/icon-192x192.png",
  },
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
        <div className="site-container">
          {children}
        </div>
      </body>
    </html>
  );
}