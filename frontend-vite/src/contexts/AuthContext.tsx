import { useNavigate, useSearchParams } from "react-router-dom";
import { createContext, useContext, useEffect, useState } from "react";
import { useUIContext } from "./UIContext";

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
  authIsSignup: boolean;
  setAuthIsSignup: React.Dispatch<React.SetStateAction<boolean>>;
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
  const [authIsSignup, setAuthIsSignup] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { apiResponseMessageRef, setShowDialog } = useUIContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  useEffect(() => {
    const token = searchParams.get("token");
    const userId = searchParams.get("userId");
    const username = searchParams.get("username");
    const displayName = searchParams.get("displayName");
    if (userId) {
      setUserId(userId);
    }
    if (token) {
      setToken(token);
    }
    if (username) {
      setUsername(username);
    }
    if (displayName) {
      setDisplayName(displayName);
    }

    if (token || userId || username || displayName) {
      navigate("/", { replace: true });
    }
  }, []);

  useEffect(() => {
    const loginError = searchParams.get("loginError");
    if (loginError === "google-auth-failed") {
      apiResponseMessageRef.current = "Google login failed";
      setShowDialog("api-response");
    }

    if (loginError) navigate("/", { replace: true });
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
