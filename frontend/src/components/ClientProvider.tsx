"use client";
import dynamic from "next/dynamic";
import { AuthProvider } from "../app/contexts/AuthContext";
const AudioProvider = dynamic(
  () => import("../app/contexts/AudioContext").then((mod) => mod.AudioProvider),
  {
    ssr: false,
  }
);

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AudioProvider>{children}</AudioProvider>
    </AuthProvider>
  );
}
