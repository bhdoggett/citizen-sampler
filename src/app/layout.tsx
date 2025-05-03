import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import dynamic from "next/dynamic";
import ClientProviders from "./components/ClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Citizen Sampler",
  description:
    "Citizen Sampler, made possible by Citizen DJ, is an MPC-style sampler making use of public domain audio curated by the Library of Congress",
  keywords: [
    "citizen sampler",
    "citizen dj",
    "citizen dj sampler",
    "citizen dj mpc",
    "citizen dj mpc sampler",
    "citizen dj mpc sampler",
    "citizen dj mpc sampler",
    "library of congress",
    "public domain audio",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`font-mono
          // ${geistSans.variable} ${geistMono.variable} antialiased
          `}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
