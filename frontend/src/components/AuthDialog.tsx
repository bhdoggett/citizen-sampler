"use client";
import { useState } from "react";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import { useAuthContext } from "../app/contexts/AuthContext";
dotenv.config();

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type AuthDialogProps = {
  setShowDialog: React.Dispatch<React.SetStateAction<string | null>>;
  setHotKeysActive: React.Dispatch<React.SetStateAction<boolean>>;
  authIsSignup: boolean;
  setAuthIsSignup: React.Dispatch<React.SetStateAction<boolean>>;
};

const AuthDialog: React.FC<AuthDialogProps> = ({
  setShowDialog,
  setHotKeysActive,
  authIsSignup,
  setAuthIsSignup,
}) => {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmationPassword, setConfirmationPassword] = useState<string>("");
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setToken, setUser } = useAuthContext();

  const signup = async () => {
    try {
      if (!authIsSignup) return;
      if (password !== confirmationPassword) {
        setPasswordsMatch(false);
        return;
      } else {
        setPasswordsMatch(true);
        const result = await axios.post(`${BASE_URL}/auth/signup`, {
          username,
          email,
          password,
        });
        if (result.status === 201) {
          setToken(result.data.token);
          setUser(result.data.user);
          setShowDialog(null);
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
      const result = await axios.post(`${BASE_URL}/auth/login`, {
        username,
        password,
      });

      if (result.status === 200) {
        console.log("result.data", result.data);
        setToken(result.data.token);
        setUser(result.data.user);
        setShowDialog(null);
      } else {
        setError(result.data.message);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (authIsSignup) {
        await signup();
      } else {
        await login();
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

    setHotKeysActive(true);
  };

  return (
    <div className="flex flex-col border-2 border-black bg-slate-800 m-3 p-4 shadow-md shadow-slate-800 text-white">
      <button
        onClick={() => {
          setShowDialog(null);
        }}
        className="absolute top-5 right-6 text-white hover:text-black"
      >
        ✖
      </button>

      {error ? (
        <>
          <span className="text-center text-lg font-bold mb-3">{error}</span>
          <button
            onClick={() => {
              setError(null);
              setUsername("");
              setEmail("");
              setPassword("");
              setConfirmationPassword("");
            }}
            className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
          >
            Try Again?
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <h2 className="text-center text-lg font-bold mb-3">
            {authIsSignup ? "Sign Up" : "Login"}
          </h2>
          <div className="mx-auto relative w-3/4">
            <div className="flex">
              <label htmlFor="username" className="w-1/5 flex justify-end mr-2">
                Username:
              </label>
              <input
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
            {authIsSignup &&
              passwordsMatch === false &&
              "Passwords do not match"}
          </span>
          <button
            type="submit"
            className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
          >
            {authIsSignup ? "Create Account" : "Log In"}
          </button>
          <a href={`${BASE_URL}/auth/google`}>
            <button
              type="button"
              className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
            >
              {authIsSignup ? "Sign Up With Google" : "Sign In With Google"}
            </button>
          </a>

          <button
            type="button"
            onClick={() => {
              setAuthIsSignup(!authIsSignup);
            }}
            className="flex mx-auto justify-center border border-black mt-4 p-2 bg-slate-400 hover:bg-slate-700 rounded-sm text-white"
          >
            {authIsSignup ? "Already have an account?" : "Create a new account"}
          </button>
        </form>
      )}
    </div>
  );
};

export default AuthDialog;
