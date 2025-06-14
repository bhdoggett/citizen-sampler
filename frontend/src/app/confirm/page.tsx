"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
// import { useAuthContext } from "../contexts/AuthContext";
import { useUIContext } from "../contexts/UIContext";
import Spinner from "src/components/Spinner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const Confirm = () => {
  const searchParams = useSearchParams();
  const confirmToken = searchParams.get("token");
  const [message, setMessage] = useState("Confirming your email...");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  // const { setToken, setUserId, setUsername, setDisplayName, setAuthIsSignup } =
  //   useAuthContext();
  const { setShowDialog } = useUIContext();
  const router = useRouter();

  useEffect(() => {
    if (!confirmToken) {
      setMessage("No confirmation token provided.");
      setStatus("error");
      return;
    }
    const confirmEmail = async () => {
      try {
        const result = await axios.get(
          `${API_BASE_URL}/auth/confirm-email?confirmToken=${confirmToken}`
        );
        // router.push(`/confirm?token=${result.data.token}`);
        setMessage(result.data.message);
        setStatus("success");
        setShowDialog("auth-dialog");

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        setMessage("Confirmation failed. The link may be invalid or expired.");
        setStatus("error");
      }
    };

    confirmEmail();
  }, []);

  return (
    <div className="flex p-4 max-w-md mx-auto text-center">
      <h1 className="text-xl font-semibold mb-2">
        {status === "loading" ? (
          <Spinner />
        ) : status === "success" ? (
          "🙌 Success 🙌"
        ) : (
          "Error ❌"
        )}
      </h1>
      <p>{message}</p>
      <button
        onClick={() => router.push("/")}
        className="border-2 border-black py-2 px-1 mt-3 bg-slate-600 text-white font-bold shadow-sm shadow-slate-700"
      >
        {status === "error" ? "Back to Page" : "Go Make Music"}
      </button>
    </div>
  );
};

export default Confirm;
