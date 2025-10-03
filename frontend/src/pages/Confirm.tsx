import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Confirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (!token) {
      setStatus("error");
      setMessage("No confirmation token provided");
      return;
    }

    const confirmEmail = async () => {
      try {
        const response = await axios.post("/api/auth/confirm", { token });
        setStatus("success");
        setMessage(response.data.message || "Email confirmed successfully!");
        
        // Redirect to home page after 3 seconds
        setTimeout(() => {
          navigate("/");
        }, 3000);
      } catch (error: any) {
        setStatus("error");
        setMessage(error.response?.data?.message || "Failed to confirm email");
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-slate-700 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Email Confirmation</h1>
        
        {status === "loading" && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 mx-auto mb-4"></div>
            <p>Confirming your email...</p>
          </div>
        )}
        
        {status === "success" && (
          <div className="text-center text-green-600">
            <div className="text-4xl mb-4">✅</div>
            <p className="mb-4">{message}</p>
            <p className="text-sm text-slate-600">Redirecting to home page...</p>
          </div>
        )}
        
        {status === "error" && (
          <div className="text-center text-red-600">
            <div className="text-4xl mb-4">❌</div>
            <p className="mb-4">{message}</p>
            <button
              onClick={() => navigate("/")}
              className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800 transition-colors"
            >
              Go to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
