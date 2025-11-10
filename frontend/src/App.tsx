import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_KEY!
);

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [mood, setMood] = useState("");
  const [note, setNote] = useState("");
  const [reflection, setReflection] = useState("");
  const [summary, setSummary] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Auth ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  async function signInWithMagicLink(email: string) {
    await supabase.auth.signInWithOtp({ email });
    alert("Check your email for the login link.");
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // --- Mood save & reflection ---
  async function saveMood() {
    if (!session?.user) return alert("Please log in first.");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reflect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood,
          note,
          userId: session.user.id,
        }),
      });
      const data = await res.json();
      setReflection(data.reflection);
    } catch (err) {
      console.error("❌ Reflection error:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- Weekly summary ---
  async function generateSummary() {
    if (!session?.user) return alert("Please log in first.");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/summary/${session.user.id}`);
      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      console.error("❌ Summary error:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- Chat with AI ---
  async function sendChatMessage() {
    if (!session?.user) return alert("Please log in first.");
    if (!chatMessage.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          message: chatMessage,
        }),
      });
      const data = await res.json();
      setChatResponse(data.reply);
    } catch (err) {
      console.error("❌ Chat error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ms-bg text-white flex flex-col items-center px-4 py-8 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between w-full max-w-5xl mb-10">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="MyndSelf.ai" className="h-10" />
          <h1 className="text-2xl font-semibold tracking-tight">
            MyndSelf.ai
          </h1>
        </div>

        {session ? (
          <button
            onClick={signOut}
            className="bg-ms-mint hover:bg-ms-teal px-4 py-2 rounded-lg transition"
          >
            Logout
          </button>
        ) : (
          <button
            onClick={() => {
              const email = prompt("Enter your email for login:");
              if (email) signInWithMagicLink(email);
            }}
            className="bg-ms-mint hover:bg-ms-teal px-4 py-2 rounded-lg transition"
          >
            Login
          </button>
        )}
      </header>

      {/* Content */}
      <main className="w-full max-w-3xl space-y-12">
        {/* Reflection Section */}
        <section className="bg-ms-surface p-6 rounded-2.5xl shadow-ms-glow">
          <h2 className="text-xl font-semibold mb-4">Daily Reflection</h2>
          <input
            type="text"
            placeholder="How do you feel today?"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="w-full bg-transparent border border-ms-border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-1 focus:ring-ms-teal"
          />
          <textarea
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-transparent border border-ms-border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-1 focus:ring-ms-teal"
          />
          <button
            onClick={saveMood}
            disabled={loading}
            className="bg-ms-mint hover:bg-ms-teal px-4 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save & Reflect"}
          </button>

          {reflection && (
            <div className="mt-4 p-4 bg-ms-surface border border-ms-border rounded-xl text-ms-mint">
              {reflection}
            </div>
          )}
        </section>

        {/* Weekly Summary */}
        <section className="bg-ms-surface p-6 rounded-2.5xl shadow-ms-glow">
          <h2 className="text-xl font-semibold mb-4">Weekly Summary</h2>
          <button
            onClick={generateSummary}
            disabled={loading}
            className="bg-ms-mint hover:bg-ms-teal px-4 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Summary"}
          </button>

          {summary && (
            <div className="mt-4 p-4 bg-ms-surface border border-ms-border rounded-xl text-ms-mint">
              {summary}
            </div>
          )}
        </section>

        {/* Chat Section */}
        <section className="bg-ms-surface p-6 rounded-2.5xl shadow-ms-glow">
          <h2 className="text-xl font-semibold mb-4">Chat with MyndSelf AI</h2>
          <textarea
            placeholder="Send a message..."
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            className="w-full bg-transparent border border-ms-border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-1 focus:ring-ms-teal"
          />
          <button
            onClick={sendChatMessage}
            disabled={loading}
            className="bg-ms-mint hover:bg-ms-teal px-4 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Message"}
          </button>

          {chatResponse && (
            <div className="mt-4 p-4 bg-ms-surface border border-ms-border rounded-xl text-ms-mint">
              {chatResponse}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 text-sm text-gray-400">
        © 2025 MyndSelf.ai — Empathy through AI
      </footer>
    </div>
  );
}
