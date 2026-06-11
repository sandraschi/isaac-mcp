import { useState } from "react";

export default function LLM() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [model, setModel] = useState("llama3.2:3b");

  const handleSend = async () => {
    if (!prompt) return;
    setResponse("Thinking...");
    try {
      const r = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt }),
      });
      const data = await r.json();
      setResponse(data.response || data.error || "No response");
    } catch (e) {
      setResponse(String(e));
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">LLM Chat</h1>
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
        <div className="flex gap-3 mb-3">
          <input
            className="w-40 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            placeholder="Model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>
        <textarea
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 mb-3"
          rows={4}
          placeholder="Ask about Isaac Sim, simulations, or robotics..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button onClick={handleSend} className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          Send
        </button>
        {response && (
          <pre className="mt-4 bg-slate-900 rounded-lg p-3 text-xs text-slate-300 max-h-96 overflow-auto whitespace-pre-wrap">
            {response}
          </pre>
        )}
      </div>
    </div>
  );
}
