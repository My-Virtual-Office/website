import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Hexagon, Plus, LogIn, AlertCircle, Check, Sparkles } from "lucide-react";
import { createWorkspace, acceptInvite, slugify } from "../../api/workspace";

import logoWide from "../../assets/logo-wide.png";
import "../authLayout.css";
import "./Onboarding.css";

export default function Onboarding() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Accept a pasted invite link or a raw token.
  const extractToken = (v) => {
    const m = (v || "").trim().match(/[0-9a-fA-F-]{16,}/);
    return m ? m[0] : (v || "").trim();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;
    setBusy(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      await createWorkspace({ name: name.trim(), slug: slugify(name), defaultTimezone: tz });
      navigate("/chat");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create the workspace. Try a different name.");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError("");
    const token = extractToken(invite);
    if (!token) return;
    setBusy(true);
    try {
      await acceptInvite(token);
      navigate("/chat");
    } catch (err) {
      const code = err?.response?.status;
      setError(
        code === 410 ? "That invitation has expired."
          : code === 409 ? "You're already a member (or the invite isn't pending)."
          : "Invalid invitation. Check the link or token.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-split">
        {/* ---------- Brand panel ---------- */}
        <aside className="auth-brand">
          <Link to="/" className="auth-brand-mark" aria-label="Virtual Office home">
            <img src={logoWide} alt="Virtual Office" />
          </Link>

          <div className="auth-brand-body">
            <span className="auth-brand-eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              Almost there
            </span>
            <h2 className="auth-brand-title">Create your space, or join your team.</h2>
            <p className="auth-brand-text">
              Spin up a brand-new workspace and invite your teammates, or hop into one you were
              invited to — you'll be on the floor in seconds.
            </p>
            <ul className="auth-brand-list">
              <li>
                <Check size={18} aria-hidden="true" /> Name it, and you're the admin
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> Invite the whole team with one link
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> Channels, tasks and a 2D office, ready to go
              </li>
            </ul>
          </div>

          <p className="auth-brand-foot">© {new Date().getFullYear()} Virtual Office</p>
        </aside>

        {/* ---------- Form panel ---------- */}
        <main className="auth-panel">
          <div className="auth-card">
            <Link to="/" className="auth-card-logo" aria-label="Virtual Office home">
              <img src={logoWide} alt="Virtual Office" />
            </Link>

            <div className="auth-head auth-head-center">
              <span className="auth-badge" aria-hidden="true">
                <Hexagon size={28} strokeWidth={2.2} />
              </span>
              <h1 className="auth-title">Welcome to Virtual Office</h1>
              <p className="auth-subtitle">
                Create a new workspace or join one you were invited to.
              </p>
            </div>

            <div className="auth-tabs" role="tablist" aria-label="Workspace setup">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 0}
                className={`auth-tab ${tab === 0 ? "is-active" : ""}`}
                onClick={() => {
                  setTab(0);
                  setError("");
                }}
              >
                <Plus size={18} aria-hidden="true" />
                Create
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 1}
                className={`auth-tab ${tab === 1 ? "is-active" : ""}`}
                onClick={() => {
                  setTab(1);
                  setError("");
                }}
              >
                <LogIn size={18} aria-hidden="true" />
                Join
              </button>
            </div>

            {error && (
              <div className="auth-alert auth-alert-error" role="alert">
                <AlertCircle size={18} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {tab === 0 ? (
              <form onSubmit={handleCreate} className="auth-form">
                <p className="auth-hint">Name your workspace — you'll be its admin.</p>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="ws-name">
                    Workspace name
                  </label>
                  <input
                    id="ws-name"
                    className="auth-input"
                    type="text"
                    placeholder="e.g. Acme HQ"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="auth-btn auth-btn-primary auth-btn-block"
                  disabled={busy || !name.trim()}
                >
                  {busy ? <span className="auth-spinner" aria-hidden="true" /> : "Create workspace"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="auth-form">
                <p className="auth-hint">Paste the invitation link or token you received.</p>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="ws-invite">
                    Invitation link or token
                  </label>
                  <input
                    id="ws-invite"
                    className="auth-input"
                    type="text"
                    placeholder="https://…?token=…  or  the token"
                    value={invite}
                    onChange={(e) => setInvite(e.target.value)}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="auth-btn auth-btn-primary auth-btn-block"
                  disabled={busy || !invite.trim()}
                >
                  {busy ? <span className="auth-spinner" aria-hidden="true" /> : "Join workspace"}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
