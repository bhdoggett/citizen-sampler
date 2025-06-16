"use client";
import React, { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import { useUIContext } from "src/app/contexts/UIContext";
dotenv.config();
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const ResendConfirmation: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const { apiResponseMessageRef, setShowDialog } = useUIContext();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      console.warn("Email is required to resend confirmation link.");
      return;
    }

    try {
      const result = await axios.post(
        `${API_BASE_URL}/auth/resend-confirmation`,
        {
          email,
        }
      );
      if (result.status === 200) {
        console.log("Confirmation link sent successfully.");

        apiResponseMessageRef.current = result.data.message;
        setShowDialog("api-response");
      }
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        console.error("Error resending confirmation link:", error);
        apiResponseMessageRef.current = error.response.data.message;
        setShowDialog("api-response");
      } else {
        console.error(
          "An unexpected error occurred while resending confirmation link."
        );
        apiResponseMessageRef.current =
          "An unexpected error occurred while resending confirmation link.";
        setShowDialog("api-response");
      }
    }
  };
  useEffect(() => {
    // Reset email state when component mounts
    setEmail("");
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="song-title" className="text-white">
          Email:
        </label>
        <input
          type="text"
          name="email-for-comfirmation"
          id="email-for-comfirmation"
          className="pl-1 text-black shadow-inner shadow-slate-700 w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white w-1/4"
      >
        Resend Link
      </button>
    </form>
  );
};

export default ResendConfirmation;
