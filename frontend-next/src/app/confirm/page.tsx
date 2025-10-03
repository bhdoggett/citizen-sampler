"use client";
import { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
// import { useAuthContext } from "../contexts/AuthContext";
import { useUIContext } from "../contexts/UIContext";
import Spinner from "src/components/Spinner";
import ResendConfirmation from "src/components/Dialogs/ResendConfirmation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const Confirm = () => {
  const searchParams = useSearchParams();
  const confirmToken = searchParams.get("confirmToken");
  const [message, setMessage] = useState("Confirming your email...");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  // const { setToken, setUserId, setUsername, setDisplayName, setAuthIsSignup } =
  //   useAuthContext();
  const [showResendConfirmation, setShowResendConfirmation] =
    useState<boolean>(false);
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
        if (result.status !== 200) {
          if (result.data.message === "Confirmation link expired") {
            setStatus("error");
            setMessage(
              "Confirmation link expired. Please request a new confirmation link."
            );
            setShowDialog("resend-confirmation");
            return;
          }
          setMessage(result.data.message || "Confirmation failed.");
          return;
        }
        setMessage(result.data.message);
        setStatus("success");
        setShowDialog("auth-dialog");
      } catch (err) {
        const error = err as AxiosError<{ message: string }>;
        setMessage(error.response?.data.message || "Confirmation failed.");
        setStatus("error");
      }
    };

    confirmEmail();
  }, []);

  useEffect(() => {
    console.log("the confirm page mounted briefly");
    if (status === "success") {
      // If confirmation is successful, redirect to home page after a delay
      const timer = setTimeout(() => {
        router.push("/");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  useEffect(() => {
    if (message === "Confirmation link expired") {
      setShowResendConfirmation(true);
    } else {
      setShowResendConfirmation(false);
    }
  }, [message]);

  return (
    <div className="flex flex-col p-4 max-w-md mx-auto text-center items-center border-2 border-black rounded bg-white mt-10 shadow-lg shadow-black">
      <h1 className="text-xl font-semibold mb-2">
        {status === "loading" ? (
          <Spinner />
        ) : status === "success" ? (
          "🙌 Success 🙌"
        ) : (
          "❌ Error ❌"
        )}
      </h1>
      <p className="mb-3">{message}</p>
      {showResendConfirmation ? (
        <div className="flex flex-col items-center border-2 border-black bg-slate-800 pt-5 pb-4 shadow-md shadow-slate-800 text-white">
          <ResendConfirmation />
        </div>
      ) : (
        <button
          onClick={() => router.push("/")}
          className="border-2 border-black py-2 px-1 bg-slate-600 text-white font-bold shadow-sm shadow-slate-700 w-1/3 mx-auto"
        >
          {status === "error" ? "Back to Page" : "Login"}
        </button>
      )}
    </div>
  );
};

export default Confirm;
