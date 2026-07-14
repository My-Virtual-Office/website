import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  ListTodo,
  CalendarDays,
  Map,
  Bell,
  Palette,
  Mic,
  ArrowRight,
  Check,
  Menu,
  X,
  Sparkles,
  Users,
  MousePointer2,
} from "lucide-react";

import logoWide from "../../assets/logo-wide.png";
import logoSquare from "../../assets/logo-square.png";
import "./Home.css";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Real-time chat & threads",
    text: "Organized channels for every team and project, threaded replies, mentions, emoji and file sharing — conversations that stay in context.",
  },
  {
    icon: ListTodo,
    title: "Tasks & team spaces",
    text: "Turn a message into a task in one click. Track work across shared boards so everyone knows who owns what and what's due next.",
  },
  {
    icon: CalendarDays,
    title: "Meetings & calendar",
    text: "Schedule stand-ups and reviews, see your team's availability, and jump into video calls without leaving your workspace.",
  },
  {
    icon: Map,
    title: "2D virtual office",
    text: "Walk your avatar around a living floor plan. Meeting rooms, desks and lounges make remote work feel like being in the room together.",
  },
  {
    icon: Bell,
    title: "Smart notifications",
    text: "Stay in the loop without the noise. Get notified about mentions, task assignments and meeting reminders — and mute the rest.",
  },
  {
    icon: Palette,
    title: "Themes & floors",
    text: "Make the space yours with per-floor themes and layouts. Light, dark and custom palettes keep your team comfortable all day.",
  },
];

const STEPS = [
  {
    icon: Users,
    title: "Create your workspace",
    text: "Sign up in seconds, name your office and invite your teammates with a single link.",
  },
  {
    icon: MousePointer2,
    title: "Move in & explore",
    text: "Pick an avatar, walk onto the floor and drop into channels, desks and meeting rooms.",
  },
  {
    icon: Sparkles,
    title: "Work together, live",
    text: "Chat, assign tasks, meet by proximity and get things done — all in one place.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    cadence: "/ month",
    blurb: "For small teams getting started.",
    features: ["Up to 10 members", "Unlimited channels", "1 office floor", "Community support"],
    cta: "Get started free",
    to: "/signup",
    featured: false,
  },
  {
    name: "Team",
    price: "$8",
    cadence: "/ user / month",
    blurb: "For growing teams that live in their office.",
    features: [
      "Unlimited members",
      "Tasks & shared boards",
      "Meetings & proximity voice",
      "Custom floors & themes",
      "Priority support",
    ],
    cta: "Start free trial",
    to: "/signup",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    blurb: "For organizations that need scale & control.",
    features: ["SSO & advanced admin", "Audit logs", "Dedicated success manager", "SLA & onboarding"],
    cta: "Contact sales",
    to: "/signup",
    featured: false,
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const year = new Date().getFullYear();
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="lp" id="top">
      {/* ---------- Header ---------- */}
      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <Link to="/" className="lp-brand" onClick={closeMenu}>
            <img src={logoWide} alt="Virtual Office home" className="lp-brand-img" />
          </Link>

          <nav className={`lp-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary">
            <a href="#features" className="lp-nav-link" onClick={closeMenu}>
              Features
            </a>
            <a href="#how" className="lp-nav-link" onClick={closeMenu}>
              How it works
            </a>
            <a href="#pricing" className="lp-nav-link" onClick={closeMenu}>
              Pricing
            </a>
            <div className="lp-nav-cta">
              <Link to="/login" className="lp-btn lp-btn-ghost" onClick={closeMenu}>
                Sign in
              </Link>
              <Link to="/signup" className="lp-btn lp-btn-primary" onClick={closeMenu}>
                Get started
              </Link>
            </div>
          </nav>

          <button
            type="button"
            className="lp-menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="lp-hero">
        <div className="lp-container lp-hero-inner">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              Your team's home base, online
            </span>
            <h1 className="lp-h1">
              Your whole team,
              <br />
              <span className="lp-h1-accent">one virtual office</span>
            </h1>
            <p className="lp-lede">
              Chat, tasks, meetings and a walkable 2D office in a single workspace. Bring the
              energy of working side-by-side to your remote and hybrid team — talk by proximity,
              collaborate in real time, get things done.
            </p>
            <div className="lp-hero-actions">
              <Link to="/signup" className="lp-btn lp-btn-primary lp-btn-lg">
                Get started free
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-lg">
                Sign in
              </Link>
            </div>
            <p className="lp-hero-note">Free for small teams · No credit card required</p>
          </div>

          {/* Product mockup */}
          <div className="lp-hero-visual">
            <div className="lp-mock" aria-hidden="true">
              <div className="lp-window">
                <div className="lp-window-bar">
                  <span className="lp-dot lp-dot-r" />
                  <span className="lp-dot lp-dot-y" />
                  <span className="lp-dot lp-dot-g" />
                  <span className="lp-window-title">Acme HQ — #general</span>
                </div>
                <div className="lp-window-body">
                  <aside className="lp-side">
                    <div className="lp-side-ws">Acme HQ</div>
                    <div className="lp-side-label">Channels</div>
                    <div className="lp-chan is-active"># general</div>
                    <div className="lp-chan"># design</div>
                    <div className="lp-chan"># engineering</div>
                    <div className="lp-side-label">Direct messages</div>
                    <div className="lp-dm">
                      <i className="lp-presence lp-on" /> Maya
                    </div>
                    <div className="lp-dm">
                      <i className="lp-presence" /> Sam
                    </div>
                  </aside>
                  <div className="lp-chat">
                    <div className="lp-msg">
                      <span className="lp-avatar lp-a1">MK</span>
                      <div className="lp-bubble">
                        <div className="lp-msg-head">
                          <b>Maya Khoury</b>
                          <span className="lp-time">9:41</span>
                        </div>
                        <p>Pushed the new calendar view — reviews are on for Thursday.</p>
                      </div>
                    </div>
                    <div className="lp-msg">
                      <span className="lp-avatar lp-a2">SO</span>
                      <div className="lp-bubble">
                        <div className="lp-msg-head">
                          <b>Sam Osei</b>
                          <span className="lp-time">9:42</span>
                        </div>
                        <p>Nice. Grabbing a desk in the design room if anyone wants to pair.</p>
                      </div>
                    </div>
                    <div className="lp-task">
                      <Check size={14} aria-hidden="true" />
                      Task created · <b>Ship calendar view</b> · due Thu
                    </div>
                    <div className="lp-typing">
                      <span />
                      <span />
                      <span />
                      Priya is typing
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating office minimap */}
              <div className="lp-float lp-office">
                <div className="lp-office-head">
                  <span>2D office · Floor 1</span>
                  <span className="lp-live">
                    <i /> live
                  </span>
                </div>
                <div className="lp-grid">
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-cell" />
                  <span className="lp-ring" />
                  <span className="lp-pin lp-pin-a" />
                  <span className="lp-pin lp-pin-b" />
                  <span className="lp-pin lp-pin-c" />
                </div>
                <div className="lp-office-foot">
                  <Mic size={13} aria-hidden="true" /> Proximity voice · 3 nearby
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Stats strip ---------- */}
      <section className="lp-stats">
        <div className="lp-container lp-stats-inner">
          <div className="lp-stat">
            <span className="lp-stat-num">1</span>
            <span className="lp-stat-label">workspace for chat, tasks &amp; meetings</span>
          </div>
          <div className="lp-stat">
            <span className="lp-stat-num">2D</span>
            <span className="lp-stat-label">walkable office with proximity voice</span>
          </div>
          <div className="lp-stat">
            <span className="lp-stat-num">Real-time</span>
            <span className="lp-stat-label">presence &amp; messaging that never lags</span>
          </div>
          <div className="lp-stat">
            <span className="lp-stat-num">0</span>
            <span className="lp-stat-label">apps to juggle — it's all in here</span>
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="lp-section" id="features">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">Everything in one place</span>
            <h2 className="lp-h2">One workspace for the way your team really works</h2>
            <p className="lp-sub">
              Stop switching between a chat app, a task tracker, a calendar and a video tool.
              Virtual Office brings them together — around a space that actually feels like an
              office.
            </p>
          </div>
          <div className="lp-features">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article className="lp-card" key={title}>
                <span className="lp-card-icon">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="lp-card-title">{title}</h3>
                <p className="lp-card-text">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Showcase strip ---------- */}
      <section className="lp-showcase">
        <div className="lp-container lp-showcase-inner">
          <div className="lp-showcase-copy">
            <span className="lp-kicker lp-kicker-light">The 2D office</span>
            <h2 className="lp-h2">Presence you can see. Conversations that just happen.</h2>
            <p className="lp-sub lp-sub-light">
              Walk your avatar up to a colleague and the call opens automatically — just like
              tapping someone on the shoulder. Gather in meeting rooms, spread out at desks, or
              hang in the lounge between deep-work sessions.
            </p>
            <ul className="lp-check-list">
              <li>
                <Check size={18} aria-hidden="true" /> Talk by proximity — no links, no scheduling
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> See who's around, busy or away at a glance
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> Purpose-built rooms for focus, meetings &amp; socials
              </li>
            </ul>
            <Link to="/signup" className="lp-btn lp-btn-primary">
              Move your team in
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className="lp-showcase-visual" aria-hidden="true">
            <div className="lp-floor">
              <div className="lp-room lp-room-meet">
                <span className="lp-room-tag">Meeting room</span>
                <span className="lp-pin lp-pin-a" />
                <span className="lp-pin lp-pin-b" />
              </div>
              <div className="lp-room lp-room-focus">
                <span className="lp-room-tag">Focus zone</span>
                <span className="lp-pin lp-pin-c" />
              </div>
              <div className="lp-room lp-room-lounge">
                <span className="lp-room-tag">Lounge</span>
                <span className="lp-pin lp-pin-d" />
                <span className="lp-pin lp-pin-e" />
                <span className="lp-ring lp-ring-lounge" />
              </div>
              <div className="lp-room lp-room-desks">
                <span className="lp-room-tag">Desks</span>
                <span className="lp-pin lp-pin-f" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="lp-section lp-how" id="how">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">Up and running in minutes</span>
            <h2 className="lp-h2">How it works</h2>
            <p className="lp-sub">Three steps from empty room to a buzzing office.</p>
          </div>
          <div className="lp-steps">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div className="lp-step" key={title}>
                <span className="lp-step-num">{i + 1}</span>
                <span className="lp-step-icon">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="lp-card-title">{title}</h3>
                <p className="lp-card-text">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section className="lp-section lp-pricing" id="pricing">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">Simple pricing</span>
            <h2 className="lp-h2">Start free. Grow when you're ready.</h2>
            <p className="lp-sub">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="lp-plans">
            {PLANS.map((plan) => (
              <article className={`lp-plan ${plan.featured ? "is-featured" : ""}`} key={plan.name}>
                {plan.featured && <span className="lp-plan-badge">Most popular</span>}
                <h3 className="lp-plan-name">{plan.name}</h3>
                <p className="lp-plan-blurb">{plan.blurb}</p>
                <div className="lp-plan-price">
                  <span className="lp-plan-amount">{plan.price}</span>
                  {plan.cadence && <span className="lp-plan-cadence">{plan.cadence}</span>}
                </div>
                <ul className="lp-plan-features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <Check size={16} aria-hidden="true" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.to}
                  className={`lp-btn ${plan.featured ? "lp-btn-primary" : "lp-btn-ghost"} lp-btn-block`}
                >
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA band ---------- */}
      <section className="lp-cta">
        <div className="lp-container lp-cta-inner">
          <h2 className="lp-cta-title">Ready to move your team in?</h2>
          <p className="lp-cta-text">
            Spin up your virtual office in minutes and feel what it's like to work together again.
          </p>
          <div className="lp-hero-actions lp-cta-actions">
            <Link to="/signup" className="lp-btn lp-btn-ondark lp-btn-lg">
              Get started free
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/login" className="lp-btn lp-btn-ghost-light lp-btn-lg">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <img src={logoSquare} alt="Virtual Office" className="lp-footer-logo" />
            <p className="lp-footer-tag">
              Your whole team, one virtual office. Chat, tasks, meetings and a walkable 2D space —
              together.
            </p>
          </div>
          <nav className="lp-footer-cols" aria-label="Footer">
            <div className="lp-footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how">How it works</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="lp-footer-col">
              <h4>Get started</h4>
              <Link to="/signup">Create account</Link>
              <Link to="/login">Sign in</Link>
            </div>
            <div className="lp-footer-col">
              <h4>Company</h4>
              <a href="#top">About</a>
              <a href="#features">Blog</a>
              <a href="#pricing">Contact</a>
            </div>
          </nav>
        </div>
        <div className="lp-container lp-footer-bottom">
          <span>© {year} Virtual Office. All rights reserved.</span>
          <span className="lp-footer-mini">
            <a href="#top">Privacy</a>
            <a href="#top">Terms</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
