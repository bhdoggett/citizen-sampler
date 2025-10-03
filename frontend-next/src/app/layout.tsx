import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from "../components/ClientProvider";
import { UIProvider } from "./contexts/UIContext";

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
  icons: [
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      url: "/apple-touch-icon.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      url: "/favicon-32x32.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      url: "/favicon-16x16.png",
    },
  ],
  manifest: "/site.webmanifest",
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
          bg-slate-700`}
      >
        <UIProvider>
          <ClientProviders>{children}</ClientProviders>
        </UIProvider>
      </body>
    </html>
  );
}
