"use client";
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import type { UserType } from "../../../../shared/types/UserType";
import dotenv from "dotenv";
dotenv.config();

type AuthContextType = {
  user: UserType | null;
  setUser: React.Dispatch<React.SetStateAction<UserType | null>>;
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  // localSignup: (
  //   username: string,
  //   password: string,
  //   email?: string
  // ) => Promise<void>;
  // googleSignup: (googleId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: React.PropsWithChildren) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem("token")
  );

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("token", newToken);
    } else {
      localStorage.removeItem("token");
    }
    setTokenState(newToken);
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
        user,
        setUser,
        token,
        // localSignup,
        // googleSignup,
        setToken,
        isAuthenticated: !!token,
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
