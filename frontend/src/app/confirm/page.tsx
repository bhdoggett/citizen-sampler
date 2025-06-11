"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const Confirm = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [message, setMessage] = useState("Confirming your email...");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/auth/confirm-email?token=${token}`
        );
        setMessage(res.data.message || "Email confirmed successfully!");
        setStatus("success");
      } catch (err) {
        setMessage("Confirmation failed. The link may be invalid or expired.");
        setStatus("error");
      }
    };

    confirmEmail();
  }, [token]);

  return (
    <div className="p-4 max-w-md mx-auto text-center">
      <h1 className="text-xl font-semibold mb-2">
        {status === "loading"
          ? "Loading..."
          : status === "success"
            ? "Success 🎉"
            : "Error ❌"}
      </h1>
      <p>{message}</p>
    </div>
  );
};

export default Confirm;
