"use client";
import dynamic from "next/dynamic";

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
  return <AudioProvider>{children}</AudioProvider>;
}
