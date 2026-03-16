"use client";
import { useEffect } from "react";
import { useAuthContext } from "../../app/contexts/AuthContext";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const AuthDialog: React.FC = () => {
  const { setError } = useAuthContext();

  // Set error to null when component unmounts
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  return (
    <div className="mx-3 text-center">
      <h2 className="text-lg font-bold mb-4">Login</h2>
      <a
        href={`${API_BASE_URL}/auth/google`}
        className="flex mx-auto justify-center border border-black p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
      >
        Continue with Google
      </a>
    </div>
  );
};

export default AuthDialog;
