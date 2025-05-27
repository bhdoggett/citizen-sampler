"use client";
import { createContext, useContext, useEffect, useState } from "react";
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
  // const localSignup = async (
  //   username: string,
  //   password: string,
  //   email?: string
  // ) => {
  //   try {
  //     const response = await axios.post("/auth/signup", {
  //       username,
  //       email,
  //       password,
  //     });
  //     console.log("Signup successful:", response.data);

  //     setToken(response.data.token);
  //     setUser(response.data.user);
  //   } catch (err) {
  //     console.error("Signup failed:", err);
  //   }
  // };

  // const googleSignup = async (googleId: string) => {
  //   try {
  //     const response = await axios.post("/auth/signup/google", {
  //       googleId,
  //     });
  //     console.log("Google Signup successful:", response.data);

  //     setUser(response.data.user);
  //   } catch (err) {
  //     console.error("Google Signup failed:", err);
  //   }
  // };

  // test isAuthenticated
  useEffect(() => {
    const isAuthenticated = !!token;
    console.log("isAuthenticated", isAuthenticated);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        username,
        setUsername,
        token,
        // localSignup,
        // googleSignup,
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
