import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../lib/api";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface LlmModel {
  name: string;
}

const PERSONALITIES = [
  {
    id: "helpful",
    label: "Helpful",
    prompt:
      "You are a helpful Isaac Sim assistant. Explain clearly, assume a robotics beginner.",
  },
  {
    id: "expert",
    label: "Expert",
    prompt:
      "You are an expert NVIDIA Isaac Sim engineer. Be precise: name tools, files, and parameters exactly.",
  },
  {
    id: "concise",
    label: "Concise",
    prompt:
      "You are a concise assistant. Answer in at most three sentences unless asked for more.",
  },
  { id: "custom", label: "Custom", prompt: "" },
];

const EXAMPLES = [
  "What can isaac-mcp do?",
  "Is Isaac Sim available on this machine?",
  "How do I load a USD scene?",
  "Walk me through starting a simulation",
  "How does apply_control address joints?",
  "How do I diagnose a crashed sim?",
];

export default function Chat() {
  const [chat, setChat] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [providers, setProviders] = useState<Record<string, LlmModel[]>>({});
  const [provider, setProvider] = useState(
    () => localStorage.getItem("llm_provider") || "ollama",
  );
  const [model, setModel] = useState(
    () => localStorage.getItem("llm_model") || "llama3.2:3b",
  );
  const [personality, setPersonality] = useState(
    () => localStorage.getItem("chat_personality") || "helpful",
  );
  const [customPrompt, setCustomPrompt] = useState(
    () => localStorage.getItem("chat_custom_prompt") || "",
  );
  const idRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("isaac_chat");
      if (saved) {
        const loaded = JSON.parse(saved) as Omit<Message, "id">[];
        setChat(loaded.map((m) => ({ ...m, id: idRef.current++ })));
      }
    } catch {
      // corrupt history starts fresh
    }
  }, []);

  useEffect(() => {
    if (chat.length > 0) {
      localStorage.setItem("isaac_chat", JSON.stringify(chat.slice(-100)));
    } else {
      localStorage.removeItem("isaac_chat");
    }
  }, [chat]);

  useEffect(() => {
    fetch(`${API_BASE}/api/skills`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: unknown) => {
        if (Array.isArray(d))
          setSkills(d.map((s) => (s as { name: string }).name || String(s)));
      })
      .catch(() => {});
    fetch(`${API_BASE}/api/llm/providers`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: unknown) => setProviders(d as Record<string, LlmModel[]>))
      .catch(() => {});
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: chat is the intentional refire trigger
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = async (text: string) => {
    setChat((prev) => [
      ...prev,
      { id: idRef.current++, role: "user", content: text },
    ]);
    setLoading(true);
    try {
      const sp = PERSONALITIES.find((p) => p.id === personality);
      const base = personality === "custom" ? customPrompt : sp?.prompt || "";
      const system =
        skills.length > 0
          ? `${base}\nAvailable skills: ${skills.join(", ")}.`
          : base;
      const r = await fetch(`${API_BASE}/api/llm/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, prompt: text, system }),
      });
      const data = await r.json();
      setChat((prev) => [
        ...prev,
        {
          id: idRef.current++,
          role: "assistant",
          content: data.response || data.error || "No response",
        },
      ]);
    } catch {
      setChat((prev) => [
        ...prev,
        {
          id: idRef.current++,
          role: "assistant",
          content: "Request failed. Is the backend running?",
        },
      ]);
    }
    setLoading(false);
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleExport = () => {
    if (chat.length === 0) return;
    const lines = chat.map((m) => `[${m.role.toUpperCase()}] ${m.content}`);
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "isaac-chat.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setChat([]);
    localStorage.removeItem("isaac_chat");
  };

  const providerNames = Object.keys(providers);
  const reachable = providerNames.length > 0;

  return (
    <div className="max-w-3xl" data-testid="chat-page">
      <h1 className="text-2xl font-bold mb-2">Chat</h1>
      <p className="text-sm text-slate-400 mb-6">
        Skill-first assistant: skill content loads on mount and shapes every
        answer.
      </p>

      <div
        className="flex flex-wrap items-center gap-3 mb-4 text-xs"
        data-testid="chat-controls"
      >
        <select
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          value={personality}
          onChange={(e) => {
            setPersonality(e.target.value);
            localStorage.setItem("chat_personality", e.target.value);
          }}
          data-testid="personality-select"
        >
          {PERSONALITIES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {personality === "custom" && (
          <input
            className="flex-1 min-w-48 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            placeholder="Custom system prompt..."
            value={customPrompt}
            onChange={(e) => {
              setCustomPrompt(e.target.value);
              localStorage.setItem("chat_custom_prompt", e.target.value);
            }}
            data-testid="chat-custom-prompt"
          />
        )}
        <span
          className="flex items-center gap-1.5 text-slate-400"
          data-testid="chat-provider-status"
        >
          <span
            className={`w-2 h-2 rounded-full ${reachable ? "bg-green-500" : "bg-red-500"}`}
          />
          {reachable ? `${provider} / ${model}` : "no LLM detected"}
        </span>
        <span className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={handleExport}
            disabled={chat.length === 0}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs px-3 py-2 rounded-lg border border-slate-600"
            data-testid="chat-export"
          >
            Export
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={chat.length === 0}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs px-3 py-2 rounded-lg border border-slate-600"
            data-testid="chat-clear"
          >
            Clear
          </button>
        </span>
      </div>

      {skills.length > 0 && (
        <p className="text-xs text-slate-500 mb-3" data-testid="chat-skills">
          Skills in context: {skills.join(", ")}
        </p>
      )}

      <div
        className="bg-slate-800 rounded-xl border border-slate-700 p-4 h-[50vh] overflow-y-auto space-y-3 mb-4"
        data-testid="chat-messages"
      >
        {chat.length === 0 && (
          <div className="text-center pt-6">
            <p className="text-slate-300 text-sm font-medium mb-1">
              Ask about simulations, scenes, or control
            </p>
            <p className="text-slate-500 text-xs mb-4">
              Try an example below, or type your own question.
            </p>
            <div
              className="flex flex-wrap justify-center gap-2"
              data-testid="example-prompts"
            >
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setInput(ex)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-3 py-1.5 rounded-full border border-slate-600"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-cyan-800 text-cyan-100"
                  : "bg-slate-900 text-slate-300"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-slate-500 text-xs animate-pulse">
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-3">
        <input
          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          placeholder="Ask about Isaac Sim..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          data-testid="chat-input"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          data-testid="chat-send"
        >
          Send
        </button>
      </div>
    </div>
  );
}
