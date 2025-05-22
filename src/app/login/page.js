"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    if (!name || !password) {
      setError("Name and password are required.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(data.message || "Registration successful!");
        setName("");
        setPassword("");
        // Optionally redirect or clear form
      } else {
        setError(data.message || "Registration failed.");
      }
    } catch (err) {
      setError("An unexpected error occurred during registration.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    if (!name || !password) {
      setError("Name and password are required.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(data.message || "Login successful!");
        // Store user session/token if applicable
        // For now, just redirect to home page
        localStorage.setItem("loggedInUser", data.user.name); // Store logged-in user's name
        router.push("/");
      } else {
        setError(data.message || "Login failed. Invalid credentials.");
      }
    } catch (err) {
      setError("An unexpected error occurred during login.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex flex-col items-center justify-center text-white p-4">
      <div className="bg-white bg-opacity-25 backdrop-filter backdrop-blur-lg shadow-xl rounded-xl p-8 md:p-12 w-full max-w-md">
        <h1 className="text-4xl font-bold mb-8 text-center animate-pulse">
          Login / Register
        </h1>

        <form className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-pink-200"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-white bg-opacity-50 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              placeholder="Enter your unique name"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-pink-200"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-white bg-opacity-50 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              placeholder="Choose a password"
              required
            />
          </div>

          {error && (
            <p className="text-red-300 bg-red-800 bg-opacity-50 p-3 rounded-md text-sm">
              {error}
            </p>
          )}
          {successMessage && (
            <p className="text-green-300 bg-green-800 bg-opacity-50 p-3 rounded-md text-sm">
              {successMessage}
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 transition duration-150 ease-in-out"
            >
              {isLoading ? "Processing..." : "Login"}
            </button>
            <button
              type="button"
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-pink-500 rounded-md shadow-sm text-sm font-medium text-pink-400 bg-transparent hover:bg-pink-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 transition duration-150 ease-in-out"
            >
              {isLoading ? "Processing..." : "Register"}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="font-medium text-pink-300 hover:text-pink-200 transition duration-150 ease-in-out"
          >
            &larr; Back to Motto Page
          </Link>
        </div>
      </div>
       <footer className="absolute bottom-4 text-center w-full text-xs text-gray-300">
        Security Note: Passwords are handled in plaintext. This is for demonstration purposes only and is not secure for production environments.
      </footer>
    </div>
  );
}
