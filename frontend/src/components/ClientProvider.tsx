import { AuthProvider } from "../contexts/AuthContext";
import { AudioProvider } from "../contexts/AudioContext";
import { UIProvider } from "../contexts/UIContext";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UIProvider>
      <AuthProvider>
        <AudioProvider>{children}</AudioProvider>
      </AuthProvider>
    </UIProvider>
  );
}
