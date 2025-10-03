import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { useAuthContext } from "../../contexts/AuthContext";
import { useUIContext } from "../../contexts/UIContext";
import Spinner from "../Spinner";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AuthDialog: React.FC = () => {
  const [formUsername, setFormUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmationPassword, setConfirmationPassword] = useState<string>("");
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setToken, setUserId, setUsername, setDisplayName, error, setError } =
    useAuthContext();
  const { authIsSignup, setAuthIsSignup } = useAuthContext();
  const { apiResponseMessageRef, setShowDialog } = useUIContext();

  console.log("API_BASE_URL:", API_BASE_URL);
  const signup = async () => {
    try {
      if (!authIsSignup) return;
      if (password !== confirmationPassword) {
        setPasswordsMatch(false);
        return;
      } else {
        setPasswordsMatch(true);
        const result = await axios.post(`${API_BASE_URL}/auth/signup`, {
          username: formUsername,
          email,
          password,
        });
        if (result.status === 201) {
          apiResponseMessageRef.current = result.data.message;
          setShowDialog("api-response");
        }
      }
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setError(error.response.data.message);
      } else {
        setError("An unexpected error occurred.");
      }
    }
  };

  const login = async () => {
    try {
      const result = await axios.post(`${API_BASE_URL}/auth/login`, {
        username: formUsername,
        password,
      });

      if (result.status === 200) {
        setToken(result.data.token);
        setUserId(result.data.user._id);
        setUsername(result.data.user.username);
        setDisplayName(result.data.user.displayName);
        setShowDialog(null);
      }
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        // Check for expired confirmation specifically
        if (error.response.data.message === "Confirmation link expired") {
          setShowDialog("resend-confirmation");
          return;
        } else {
          setError(error.response.data.message);
        }
      } else {
        setError("An unexpected error occurred.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (authIsSignup) {
      await signup();
    } else {
      await login();
    }

    setIsLoading(false);
  };

  // Set error to null when component unmounts
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  return error ? (
    <div className="mx-3">
      <span className="text-center text-lg font-bold">{error}</span>
      {error === "Please confirm your email before logging in." ? (
        <button
          onClick={() => {
            setShowDialog("resend-confirmation");
            setIsLoading(false);
            setPasswordsMatch(null);
            setError(null);
            setFormUsername("");
            setEmail("");
            setPassword("");
            setConfirmationPassword("");
          }}
          className="flex mx-auto w-fit justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
        >
          Resend Confirmation Email
        </button>
      ) : (
        <button
          onClick={() => {
            setIsLoading(false);
            setPasswordsMatch(null);
            setError(null);
            setFormUsername("");
            setEmail("");
            setPassword("");
            setConfirmationPassword("");
          }}
          className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
        >
          Try Again?
        </button>
      )}
    </div>
  ) : (
    <form onSubmit={handleSubmit}>
      <h2 className="text-center text-lg font-bold mb-3">
        {authIsSignup ? "Sign Up" : "Login"}
      </h2>
      <div className="mx-auto relative w-full">
        <div className="flex">
          <label htmlFor="formUsername" className="w-1/5 flex justify-end mr-2">
            Username:
          </label>
          <input
            name="formUsername"
            type="text"
            value={formUsername}
            onChange={(e) => setFormUsername(e.target.value)}
            className="shadow-inner text-black shadow-slate-700 w-3/4 mb-2"
          />
        </div>

        {authIsSignup && (
          <div className="flex">
            <label htmlFor="email" className="w-1/5 flex justify-end mr-2">
              Email:
            </label>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow-inner text-black shadow-slate-700 w-3/4 mb-2"
            />
          </div>
        )}

        <div className="flex">
          <label htmlFor="password" className="w-1/5 flex justify-end mr-2">
            Password:
          </label>
          <input
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="shadow-inner text-black shadow-slate-700 w-3/4 mb-2"
          />
        </div>

        {authIsSignup && (
          <div className="flex">
            <label
              htmlFor="confirm-password"
              className="w-1/5 flex justify-end mr-2"
            >
              Confirm:
            </label>
            <input
              name="confirm-password"
              type="password"
              value={confirmationPassword}
              onChange={(e) => setConfirmationPassword(e.target.value)}
              className="shadow-inner text-black shadow-slate-700 w-3/4 mb-2"
            />
          </div>
        )}
      </div>

      <span>
        {authIsSignup && passwordsMatch === false && "Passwords do not match"}
      </span>

      {isLoading ? (
        <Spinner />
      ) : (
        <button
          type="submit"
          className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
        >
          {authIsSignup ? "Create Account" : "Log In"}
        </button>
      )}
      <a
        href={`${API_BASE_URL}/auth/google`}
        className="flex mx-auto justify-center text-sm mt-5 hover:text-slate-200"
      >
        Continue with Google
      </a>

      <span
        onClick={() => {
          setAuthIsSignup(!authIsSignup);
        }}
        className="flex mx-auto justify-center text-xs mt-4 hover:text-slate-200 cursor-pointer"
      >
        {authIsSignup ? "Already have an account?" : "Create a new account?"}
      </span>
    </form>
  );
};

export default AuthDialog;
