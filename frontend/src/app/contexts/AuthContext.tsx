"use client";
import { useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { useUIContext } from "./UIContext";
import dotenv from "dotenv";
dotenv.config();

type AuthContextType = {
  username: string | null;
  setUsername: (token: string | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  authIsSignup: boolean;
  setAuthIsSignup: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  // localSignup: (
  //   username: string,
  //   password: string,
  //   email?: string
  // ) => Promise<void>;
  // googleSignup: (googleId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: React.PropsWithChildren) => {
  const [username, setUsernameState] = useState<string | null>(() =>
    localStorage.getItem("username")
  );
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem("token")
  );
  const [authIsSignup, setAuthIsSignup] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { apiResponseMessageRef, setShowDialog } = useUIContext();
  const searchParams = useSearchParams();
  console.log(searchParams);

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

  useEffect(() => {
    const token = searchParams.get("token");
    const username = searchParams.get("username");
    if (token && username) {
      setToken(token);
      setUsername(username);
    }
  }, []);

  useEffect(() => {
    const loginError = searchParams.get("loginError");
    if (loginError === "google-auth-failed") {
      apiResponseMessageRef.current = "Google login failed";
      setShowDialog("api-response");
    }
  },[]);

  return (
    <AuthContext.Provider
      value={{
        username,
        setUsername,
        token,
        setToken,
        isAuthenticated: !!token,
        authIsSignup,
        setAuthIsSignup,
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
