/**
 * Sign-in and Registration page.
 * Uses local accounts on our backend (/api/auth/login and /api/auth/register).
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { api } from "@/services/localApi";
import { useAuth } from "@/identity/AuthProvider";
import { Button } from "@/components/ui/button";
import mascot from "@/assets/mascot.png";
import ocean from "@/assets/welcome-ocean.jpg";

export const Route = createFileRoute("/auth")({ component: AuthPage });

export function AuthPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // If the player is already signed in, send them straight to the home screen.
  useEffect(() => {
    if (user) void navigate({ to: "/" });
  }, [user, navigate]);

  function switchMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setPassword("");
    setError("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");
    try {
      const endpoint = mode === "signup" ? "/auth/register" : "/auth/login";
      await api(endpoint, {
        email: email.trim(),
        password,
        name: name.trim(),
      });
      await refresh();
      await navigate({ to: "/" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not sign in. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }

  const isSignUp = mode === "signup";

  return (
    <main className="auth-ocean welcome-page auth-experience">
      <img
        src={ocean}
        alt=""
        width={1536}
        height={1024}
        className="welcome-background"
      />
      <div className="welcome-shade" />

      <div className="auth-layout">
        <Link to="/" className="auth-home-link">
          <ArrowLeft className="size-4" />
          Back to the ocean
        </Link>

        <div className="auth-card">
          <aside className="auth-story">
            <span className="auth-kicker">
              <span />
              A LITTLE OCEAN. A BIG ADVENTURE.
            </span>
            <h2>
              Find your flow.
              <br />
              <span>Make a splash.</span>
            </h2>
            <p>
              Sharp eyes, hidden treasures, and a whole reef waiting to be
              explored.
            </p>
            <div className="auth-art">
              <span className="auth-orbit orbit-one" />
              <span className="auth-orbit orbit-two" />
              <span className="auth-art-spark">✦</span>
              <img
                src={mascot}
                alt="Goldie welcomes you"
                className="mascot"
              />
              <span className="auth-art-caption">
                Your ocean adventure awaits
              </span>
            </div>
            <div className="auth-perks">
              <span>✦ Save your progress</span>
              <span>◈ Unlock treasures</span>
              <span>↗ Challenge friends</span>
            </div>
          </aside>

          <section className="auth-form-panel" aria-labelledby="auth-heading">
            <div className="auth-mode-tabs" aria-label="Account options">
              <button
                type="button"
                className={!isSignUp ? "is-selected" : ""}
                disabled={busy}
                onClick={() => switchMode("signin")}
              >
                Sign in
              </button>
              <button
                type="button"
                className={isSignUp ? "is-selected" : ""}
                disabled={busy}
                onClick={() => switchMode("signup")}
              >
                Register
              </button>
            </div>

            <p className="auth-form-eyebrow">YOUR PLACE IN THE REEF</p>
            <h1 id="auth-heading">
              {isSignUp ? "Make it your ocean." : "Welcome back."}
            </h1>
            <p className="auth-intro">
              {isSignUp
                ? "Create your player profile and dive straight in."
                : "Sign in and pick up your next adventure."}
            </p>

            {error && (
              <p role="alert" className="auth-error">
                {error}
              </p>
            )}

            <form
              aria-label="Account details"
              onSubmit={handleSubmit}
              className="auth-refined-form"
            >
              {isSignUp && (
                <div>
                  <label htmlFor="player-name">Player name</label>
                  <div className="auth-field">
                    <UserRound />
                    <input
                      id="player-name"
                      aria-label="Player name"
                      placeholder="What should we call you?"
                      required
                      maxLength={30}
                      autoComplete="nickname"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="player-email">Email address</label>
                <div className="auth-field">
                  <Mail />
                  <input
                    id="player-email"
                    aria-label="Email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    maxLength={254}
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="player-password">Password</label>
                <div className="auth-field">
                  <LockKeyhole />
                  <input
                    id="player-password"
                    aria-label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder={
                      isSignUp ? "Create a password" : "Enter your password"
                    }
                    autoComplete={
                      isSignUp ? "new-password" : "current-password"
                    }
                    required
                    minLength={isSignUp ? 8 : undefined}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {isSignUp && (
                  <span className="auth-password-hint">
                    At least 8 characters. Make it yours.
                  </span>
                )}
              </div>

              <Button disabled={busy} className="auth-submit">
                {busy
                  ? "Please wait…"
                  : isSignUp
                    ? "Create account"
                    : "Sign in"}
                <span aria-hidden="true">→</span>
              </Button>
            </form>

            <div className="auth-switch">
              <span>
                {isSignUp ? "Already part of the crew?" : "New to the reef?"}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => switchMode(isSignUp ? "signin" : "signup")}
              >
                {isSignUp ? "Sign in instead" : "Create an account"}
              </button>
            </div>

            <div className="auth-reassurance">
              <span aria-hidden="true">✓</span>
              {isSignUp
                ? "No confirmation email. Just register and play."
                : "Your progress. Your treasures. Your adventure."}
            </div>
          </section>
        </div>

        <p className="auth-page-note">
          TREASURE COUNT <span>·</span> A little curiosity goes a long way.
        </p>
      </div>
    </main>
  );
}
