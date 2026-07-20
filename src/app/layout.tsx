import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sally — Group Fitness Tracker",
  description:
    "Had to tell Sally I was going to the navy. Activities, stats, and PRs.",
  icons: {
    icon: "/Badge_of_the_Royal_Canadian_Navy.svg.png",
    apple: "/Badge_of_the_Royal_Canadian_Navy.svg.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e8dfd0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
