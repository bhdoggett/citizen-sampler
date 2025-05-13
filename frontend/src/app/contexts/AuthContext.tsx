"use client";
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import type { UserType } from "../../../../shared/types/UserType";

type AuthContextType = {
  user: UserType | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: React.PropsWithChildren) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setToken] = useState<string | null>(null);

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
    <AuthContext.Provider value={{ user, token, login, logout }}>
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
