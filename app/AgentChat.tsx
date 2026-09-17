"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = {
  id: number;
  role: "agent" | "user";
  text: string;
};

const starterMessage: Message = {
  id: 1,
  role: "agent",
  text: "Describe what you want to sort and how it should behave. Once the agent connection is enabled, I’ll propose DSL and presentation changes, validate the sort, and show you the result before applying it.",
};

const suggestions = [
  "Sort a poem by its original line order",
  "Make these objects feel like a card game",
  "Explain what the current algorithm is doing",
];

export function AgentChat() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([starterMessage]);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    composerRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const id = Date.now();
    setMessages((current) => [
      ...current,
      { id, role: "user", text },
      { id: id + 1, role: "agent", text: "Request captured for this session. The agent connection is not enabled yet, so the DSL and presentation remain unchanged." },
    ]);
    setDraft("");
  };

  return (
    <>
      <button className="agent-launcher" type="button" aria-expanded={open} aria-controls="agent-chat" onClick={() => setOpen(true)}>
        <span aria-hidden="true">✦</span>
        <span className="agent-launcher-label">Agent</span>
      </button>

      {open && <button className="agent-backdrop" type="button" aria-label="Close agent" onClick={() => setOpen(false)} />}

      {open && <aside id="agent-chat" className="agent-drawer open" role="dialog" aria-modal="true" aria-labelledby="agent-title">
        <header className="agent-header">
          <div className="agent-identity">
            <span className="agent-mark" aria-hidden="true">✦</span>
            <div><h2 id="agent-title">Sort agent</h2><p><span /> Interface prototype</p></div>
          </div>
          <button type="button" className="agent-close" aria-label="Close agent" onClick={() => setOpen(false)}>×</button>
        </header>

        <div className="agent-scope">
          <span>May propose</span>
          <b>Objects</b><b>Order</b><b>Algorithm</b><b>Presentation</b>
          <p>All sort changes must compile and pass the DSL validator before they can be applied.</p>
        </div>

        <div className="agent-messages">
          {messages.map((message) => (
            <article key={message.id} className={`agent-message ${message.role}`}>
              <span>{message.role === "agent" ? "Sort agent" : "You"}</span>
              <p>{message.text}</p>
            </article>
          ))}

          {messages.length === 1 && (
            <div className="agent-suggestions">
              <span>Try a request</span>
              {suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setDraft(suggestion)}>{suggestion}</button>)}
            </div>
          )}
        </div>

        <form className="agent-composer" onSubmit={send}>
          <textarea ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Describe a sorting world…" rows={3} />
          <div><span>Connection not configured</span><button type="submit" disabled={!draft.trim()}>Send</button></div>
        </form>
      </aside>}
    </>
  );
}
