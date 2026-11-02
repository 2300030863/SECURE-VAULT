import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, LockKeyhole, Mail, ArrowRight, AlertCircle, KeyRound, Sparkles } from "lucide-react";
import { API_BASE_URL } from "../config/api";
import "../styles/admin.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fillDefaultCredentials = () => {
    setEmail("admin@docqevrilo.com");
    setPassword("Admin@DocQevrilo2026!");
    setError("");
  };

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Admin sign-in failed. Please verify your credentials.");
      }

      if (!data.token) {
        throw new Error("No authentication token received from the server.");
      }

      sessionStorage.setItem("sv_admin_token", data.token);
      sessionStorage.setItem("sv_token", data.token);
      localStorage.setItem("sv_token", data.token);
      navigate("/admin", { replace: true });
    } catch (err) {
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        setError(
          "Cannot reach the backend server on http://localhost:5000. Please ensure the backend is running (`npm start` or `node backend/server.js`)."
        );
      } else {
        setError(err.message || "Unable to sign in.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card">
        <div className="admin-brand-mark">
          <ShieldCheck size={28} />
        </div>
        <span className="admin-eyebrow">RESTRICTED ACCESS</span>
        <h1>Admin sign in</h1>
        <p>Sign in to manage DocQevrilo users, documents, permissions, and security audit logs.</p>

        {error && (
          <div className="admin-error" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit}>
          <label htmlFor="admin-email">Admin email</label>
          <div className="admin-input-wrap">
            <Mail size={17} />
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              placeholder="admin@docqevrilo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label htmlFor="admin-password">Password</label>
          <div className="admin-input-wrap">
            <LockKeyhole size={17} />
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="admin-primary-btn" disabled={busy}>
            {busy ? "Verifying..." : "Access admin panel"} <ArrowRight size={17} />
          </button>
        </form>

        <div className="admin-demo-creds">
          <div className="admin-demo-creds-title">
            <KeyRound size={14} />
            <span>Default Administrator Credentials</span>
          </div>
          <div className="admin-demo-creds-body">
            <div>Email: <code>admin@docqevrilo.com</code></div>
            <div>Password: <code>Admin@DocQevrilo2026!</code></div>
          </div>
          <button
            type="button"
            className="admin-autofill-btn"
            onClick={fillDefaultCredentials}
          >
            <Sparkles size={14} /> Auto-fill credentials
          </button>
        </div>

        <Link className="admin-back-link" to="/login">
          ← Return to user sign in
        </Link>
      </section>
    </main>
  );
}
