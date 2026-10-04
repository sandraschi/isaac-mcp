import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";
import { useLlmStore } from "../store/llm";

export default function LLM() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const providers = useLlmStore((s) => s.providers);
  const setProviders = useLlmStore((s) => s.setProviders);
  const selectedProvider = useLlmStore((s) => s.provider);
  const selectedModel = useLlmStore((s) => s.model);
  const setStoreProvider = useLlmStore((s) => s.setProvider);
  const setStoreModel = useLlmStore((s) => s.setModel);

  useEffect(() => {
    fetch(`${API_BASE}/api/llm/providers`)
      .then((r) => r.json())
      .then((d) => {
        setProviders(d);
        if (d.ollama?.length) {
          const names = d.ollama.map((m: { name: string }) => m.name);
          const saved = localStorage.getItem("llm_model") || "llama3.2:3b";
          if (names.length > 0 && !names.includes(saved)) {
            setStoreModel(names[0]);
          }
        }
      })
      .catch(() => setProviders({ ollama: [{ name: "llama3.2:3b" }] }));
  }, [setProviders, setStoreModel]);

  const updateModel = (model: string) => {
    setStoreModel(model);
  };

  const updateProvider = (provider: string) => {
    setStoreProvider(provider);
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
    <div className="max-w-3xl" data-testid="llm-page">
      <h1 className="text-2xl font-bold mb-6">LLM Chat</h1>
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
        <div className="flex gap-3 mb-3">
          <div>
            <label
              htmlFor="llm-provider"
              className="text-sm text-slate-300 mr-2"
            >
              Provider:
            </label>
            <select
              id="llm-provider"
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
              value={selectedProvider}
              onChange={(e) => updateProvider(e.target.value)}
              data-testid="llm-provider-select"
            >
              {Object.keys(providers).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="llm-model" className="text-sm text-slate-300 mr-2">
              Model:
            </label>
            <select
              id="llm-model"
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
              value={selectedModel}
              onChange={(e) => updateModel(e.target.value)}
              data-testid="llm-model-select"
            >
              {providerModels.map((m) => (
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
          data-testid="llm-prompt"
        />
        <button
          type="button"
          onClick={handleSend}
          className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          data-testid="llm-send"
        >
          Send
        </button>
        {response && (
          <pre
            className="mt-4 bg-slate-900 rounded-lg p-3 text-sm text-slate-300 max-h-96 overflow-auto whitespace-pre-wrap"
            data-testid="llm-response"
          >
            {response}
          </pre>
        )}
      </div>
    </div>
  );
}
