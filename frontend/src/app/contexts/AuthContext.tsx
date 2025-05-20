"use client";
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import type { UserType } from "../../../../shared/types/UserType";
import dotenv from "dotenv";
dotenv.config();

type AuthContextType = {
  user: UserType | null;
  token: string | null;
  localSignup: (
    username: string,
    password: string,
    email?: string
  ) => Promise<void>;
  googleSignup: (googleId: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: React.PropsWithChildren) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const localSignup = async (
    username: string,
    password: string,
    email?: string
  ) => {
    try {
      const response = await axios.post("/auth/signup", {
        username,
        email,
        password,
      });
      console.log("Signup successful:", response.data);

      setUser(response.data.user);
    } catch (err) {
      console.error("Signup failed:", err);
    }
  };

  const googleSignup = async (googleId: string) => {
    try {
      const response = await axios.post("/auth/signup/google", {
        googleId,
      });
      console.log("Google Signup successful:", response.data);

      setUser(response.data.user);
    } catch (err) {
      console.error("Google Signup failed:", err);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post("/api/login", {
        username,
        password,
      });

      const jwt = response.data.token;
      localStorage.setItem("jwt", jwt);
      setToken(jwt);

      // Option 1: if your backend sends user data with the token
      setUser(response.data.user);

      // Option 2: if not, fetch user separately
      // await fetchUser(jwt);

      console.log("Logged in successfully");
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const fetchUser = async (jwt: string) => {
    try {
      const res = await axios.get("/api/me", {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });
      setUser(res.data.user);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  const logout = () => {
    localStorage.removeItem("jwt");
    setUser(null);
    setToken(null);
  };

  // Load token & user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("jwt");
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, localSignup, googleSignup, login, logout }}
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
