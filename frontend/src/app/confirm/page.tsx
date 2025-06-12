"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "../contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const Confirm = () => {
  const searchParams = useSearchParams();
  const confirmToken = searchParams.get("token");
  const [message, setMessage] = useState("Confirming your email...");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const { setToken, setUserId, setUsername, setDisplayName } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const result = await axios.get(
          `${API_BASE_URL}/auth/confirm-email?confirmToken=${confirmToken}`
        );
        setMessage(result.data.message);
        setStatus("success");
        setToken(result.data.token);
        setUserId(result.data.user._id);
        setUsername(result.data.user.username);
        setDisplayName(result.data.user.displayName);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        setMessage("Confirmation failed. The link may be invalid or expired.");
        setStatus("error");
      }
    };

    confirmEmail();
  }, [confirmToken, setDisplayName, setToken, setUserId, setUsername]);

  return (
    <div className="p-4 max-w-md mx-auto text-center">
      <h1 className="text-xl font-semibold mb-2">
        {status === "loading"
          ? "Loading..."
          : status === "success"
            ? "🙌 Success 🙌"
            : "Error ❌"}
      </h1>
      <p>{message}</p>
      <button
        onClick={() => router.push("/")}
        className="border-2 border-black py-2 px-1 mt-3 bg-slate-600 text-white font-bold shadow-sm shadow-slate-700"
      >
        Go Make Music
      </button>
    </div>
  );
};

export default Confirm;
