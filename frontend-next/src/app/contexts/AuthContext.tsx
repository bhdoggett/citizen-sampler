"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useUIContext } from "./UIContext";
import dotenv from "dotenv";
dotenv.config();

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type AuthContextType = {
  userId: string | null;
  setUserId: (token: string | null) => void;
  username: string | null;
  setUsername: (token: string | null) => void;
  displayName: string | null;
  setDisplayName: (token: string | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: React.PropsWithChildren) => {
  const [userId, setUserIdState] = useState<string | null>(() =>
    localStorage.getItem("userId")
  );
  const [username, setUsernameState] = useState<string | null>(() =>
    localStorage.getItem("username")
  );
  const [displayName, setDisplayNameState] = useState<string | null>(() =>
    localStorage.getItem("displayName")
  );
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem("token")
  );
  const [error, setError] = useState<string | null>(null);
  const { apiResponseMessageRef, setShowDialog } = useUIContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("token", newToken);
    } else {
      localStorage.removeItem("token");
    }
    setTokenState(newToken);
  };

  const setUsername = (newUser: string | null) => {
    if (newUser) {
      localStorage.setItem("username", newUser);
    } else {
      localStorage.removeItem("username");
    }
    setUsernameState(newUser);
  };

  const setUserId = (newUserId: string | null) => {
    if (newUserId) {
      localStorage.setItem("userId", newUserId);
    } else {
      localStorage.removeItem("userId");
    }
    setUserIdState(newUserId);
  };

  const setDisplayName = (newDisplayName: string | null) => {
    if (newDisplayName) {
      localStorage.setItem("displayName", newDisplayName);
    } else {
      localStorage.removeItem("displayName");
    }
    setDisplayNameState(newDisplayName);
  };

  // After Google login the backend redirects here with a one-time code,
  // which is exchanged for the JWT so the token never appears in a URL.
  // The code is single-use, so guard against StrictMode running this twice.
  const loginCodeExchanged = useRef(false);
  useEffect(() => {
    const loginCode = searchParams.get("loginCode");
    if (!loginCode || loginCodeExchanged.current) return;
    loginCodeExchanged.current = true;
    router.replace("/");

    const exchangeLoginCode = async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/exchange`, {
          code: loginCode,
        });
        const { token, userId, displayName } = res.data;
        setToken(token);
        setUserId(userId);
        setDisplayName(displayName);
      } catch (err) {
        console.error("Login code exchange failed:", err);
        apiResponseMessageRef.current = "Google login failed";
        setShowDialog("api-response");
      }
    };
    exchangeLoginCode();
  }, []);

  useEffect(() => {
    const loginError = searchParams.get("loginError");
    if (loginError === "google-auth-failed") {
      apiResponseMessageRef.current = "Google login failed";
      setShowDialog("api-response");
    }

    if (loginError) router.replace("/");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        userId,
        setUserId,
        username,
        setUsername,
        displayName,
        setDisplayName,
        token,
        setToken,
        isAuthenticated: !!token,
        error,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
