import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { useUIContext } from "../../contexts/UIContext";
import Spinner from "../Spinner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ResendConfirmation: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { apiResponseMessageRef, setShowDialog } = useUIContext();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email) {
      console.warn("Email is required to resend confirmation link.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await axios.post(
        `${API_BASE_URL}/auth/resend-confirmation`,
        {
          email,
        }
      );
      if (result.status === 200) {
        apiResponseMessageRef.current = result.data.message;
        setShowDialog("api-response");
      }
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      if (error.response && error.response.data && error.response.data.message)
        if (error.response.data.message === "Email already confirmed") {
          console.warn("Email already confirmed.");
          apiResponseMessageRef.current = error.response.data.message;
          setShowDialog("api-response");
          navigate("/");
        } else if (error.response.data.message === "User not found") {
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
    <form onSubmit={handleSubmit} className="w-5/6 items-center mx-auto ">
      <div className="">
        {/* <label htmlFor="song-title" className="text-white">
          Email:
        </label> */}
        <input
          type="text"
          name="email-for-comfirmation"
          id="email-for-comfirmation"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="pl-1 text-black shadow-inner shadow-slate-700 w-full"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center mt-4">
          <Spinner />
        </div>
      ) : (
        <button
          type="submit"
          className="flex mx-auto w-fit justify-center border border-black mt-5 py-1 px-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
        >
          Resend Link
        </button>
      )}
    </form>
  );
};

export default ResendConfirmation;
