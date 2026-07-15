import "./AiAssistant.css";
import { useState, useRef, useEffect } from "react";
import { Sparkles, ArrowUp, RotateCcw, AlertTriangle, Search } from "lucide-react";
import { askAi } from "../../../../api/ai";

// The service reports the tools it called so an answer can be traced back to
// real data. Show that as plain language — the raw function names are an
// implementation detail and shouldn't leak into the UI.
const TOOL_LABEL = {
  list_channels: "listed your channels",
  read_channel: "read the channel’s messages",
  catch_up: "read your unread messages",
  get_my_tasks: "read your tasks",
  get_events: "read the calendar",
  create_task: "created a task",
  create_event: "created an event",
};
const toolPhrase = (t) => TOOL_LABEL[t] || t.replace(/_/g, " ");

// Starter prompts. One per capability, each a real job someone actually does —
// vague prompts ("summarise #general") produce vague answers and teach nothing
// about what this can do.
const SUGGESTIONS = [
  { label: "Catch me up — what did I miss?", hint: "Unread only, across your channels",
    prompt: "Catch me up — what did I miss? Focus on anything that needs me." },
  { label: "What's due today or overdue?", hint: "Your tasks, triaged",
    prompt: "What tasks am I assigned that are overdue or due today? List the most urgent first." },
  { label: "Walk me through my day", hint: "Today's meetings + gaps",
    prompt: "What's on the calendar today, and where are my free gaps?" },
  { label: "Summarise today in #release-2-9", hint: "One channel, time-bounded",
    prompt: "Summarise what was discussed in #release-2-9 today — decisions and blockers only." },
  { label: "Assign a task in plain English", hint: "Creates it for real",
    prompt: "Create a high priority task for Karim to fix the analytics timezone bug, due Thursday at 5pm." },
];

// Minimal markdown: **bold**, `code`, and - bullets. The model is told to keep
// it simple, and this avoids pulling a parser in for four cases.
function render(text) {
  return String(text)
    .split("\n")
    .map((line, i) => {
      const bullet = /^\s*[-*]\s+/.test(line);
      const body = line.replace(/^\s*[-*]\s+/, "");
      const parts = body.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
      const nodes = parts.map((p, j) => {
        if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={j}>{p.slice(2, -2)}</strong>;
        if (/^`[^`]+`$/.test(p)) return <code key={j}>{p.slice(1, -1)}</code>;
        return <span key={j}>{p}</span>;
      });
      if (bullet) return <li key={i}>{nodes}</li>;
      if (!line.trim()) return <br key={i} />;
      return <p key={i}>{nodes}</p>;
    });
}

export default function AiAssistant({ workspaceId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy || !workspaceId) return;
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError(null);
    setBusy(true);
    try {
      const { reply, toolsUsed } = await askAi(workspaceId, next);
      setMessages([...next, { role: "assistant", content: reply, toolsUsed }]);
    } catch (e) {
      setError(e.message);
      setMessages(next);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="ai">
      <div className="ai-head">
        <div className="ai-head-title">
          <span className="ai-badge"><Sparkles size={15} /></span>
          <div>
            <h2>Assistant</h2>
            <span className="ai-sub">Ask about your chat, tasks and calendar — or tell it to create something.</span>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="ai-reset" onClick={() => { setMessages([]); setError(null); inputRef.current?.focus(); }}>
            <RotateCcw size={14} /> New chat
          </button>
        )}
      </div>

      <div className="ai-scroll">
        {messages.length === 0 && !error && (
          <div className="ai-empty">
            <span className="ai-empty-badge"><Sparkles size={22} /></span>
            <h3>What can I help with?</h3>
            <p>I can read your channels, tasks and calendar, and create tasks or meetings for you.</p>
            <div className="ai-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s.label} onClick={() => send(s.prompt)} disabled={busy}>
                  <span className="ai-sug-label">{s.label}</span>
                  <span className="ai-sug-hint">{s.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`ai-msg ${m.role}`}>
            {m.role === "assistant" && <span className="ai-avatar"><Sparkles size={13} /></span>}
            <div className="ai-bubble">
              <div className="ai-body">{render(m.content)}</div>
              {m.toolsUsed?.length > 0 && (
                <div className="ai-tools">
                  <Search size={11} aria-hidden="true" />
                  <span>
                    Based on live data — {[...new Set(m.toolsUsed)].map(toolPhrase).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="ai-msg assistant">
            <span className="ai-avatar"><Sparkles size={13} /></span>
            <div className="ai-bubble">
              <div className="ai-typing"><i /><i /><i /></div>
            </div>
          </div>
        )}

        {error && (
          <div className="ai-error">
            <AlertTriangle size={16} />
            <div>{error}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="ai-composer">
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          placeholder="Ask anything, or say “create a task to…”"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={busy}
        />
        <button className="ai-send" onClick={() => send()} disabled={busy || !input.trim()} title="Send">
          <ArrowUp size={17} />
        </button>
      </div>
    </div>
  );
}
