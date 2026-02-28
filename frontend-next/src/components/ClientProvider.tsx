"use client";
import dynamic from "next/dynamic";

const AuthProvider = dynamic(
  () => import("../app/contexts/AuthContext").then((mod) => mod.AuthProvider),
  {
    ssr: false,
  }
);

const AudioProvider = dynamic(
  () => import("../app/contexts/AudioContext").then((mod) => mod.AudioProvider),
  {
    ssr: false,
  }
);

const MidiProvider = dynamic(
  () => import("../app/contexts/MidiContext").then((mod) => mod.MidiProvider),
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
      <AudioProvider>
        <MidiProvider>{children}</MidiProvider>
      </AudioProvider>
    </AuthProvider>
  );
}
