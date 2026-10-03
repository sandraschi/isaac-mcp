import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

interface LlmModel {
  name: string;
}

export default function LLM() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [providers, setProviders] = useState<Record<string, LlmModel[]>>({});
  const [selectedProvider, setSelectedProvider] = useState("ollama");
  const [selectedModel, setSelectedModel] = useState("llama3.2:3b");

  useEffect(() => {
    const savedProvider = localStorage.getItem("llm_provider") || "ollama";
    const savedModel = localStorage.getItem("llm_model") || "llama3.2:3b";
    setSelectedProvider(savedProvider);
    setSelectedModel(savedModel);

    fetch(`${API_BASE}/api/llm/providers`)
      .then((r) => r.json())
      .then((d) => {
        setProviders(d);
        if (d.ollama?.length) {
          const names = d.ollama.map((m: { name: string }) => m.name);
          if (names.length > 0 && !names.includes(savedModel)) {
            setSelectedModel(names[0]);
          }
        }
      })
      .catch(() => setProviders({ ollama: [{ name: "llama3.2:3b" }] }));
  }, []);

  const updateModel = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem("llm_model", model);
  };

  const updateProvider = (provider: string) => {
    setSelectedProvider(provider);
    localStorage.setItem("llm_provider", provider);
    const models = providers[provider] || [];
    if (models.length > 0) {
      updateModel(models[0].name);
    }
  };

  const handleSend = async () => {
    if (!prompt) return;
    setResponse("Thinking...");
    try {
      const r = await fetch(`${API_BASE}/api/llm/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
          prompt,
        }),
      });
      const data = await r.json();
      setResponse(data.response || data.error || "No response");
    } catch (e) {
      setResponse(String(e));
    }
  };

  const providerModels = providers[selectedProvider] || providers.ollama || [];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">LLM Chat</h1>
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
        <div className="flex gap-3 mb-3">
          <div>
            <label htmlFor="llm-provider" className="text-xs text-slate-400 mr-2">Provider:</label>
            <select
              id="llm-provider"
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
              value={selectedProvider}
              onChange={(e) => updateProvider(e.target.value)}
            >
              {Object.keys(providers).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="llm-model" className="text-xs text-slate-400 mr-2">Model:</label>
            <select
              id="llm-model"
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
              value={selectedModel}
              onChange={(e) => updateModel(e.target.value)}
            >
              {providerModels.map((m: LlmModel) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <textarea
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 mb-3"
          rows={4}
          placeholder="Ask about Isaac Sim, simulations, or robotics..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button
          type="button"
          onClick={handleSend}
          className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
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
