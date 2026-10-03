import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

interface LlmModel {
  name: string;
}

export default function Settings() {
  const [providers, setProviders] = useState<Record<string, LlmModel[]>>({});
  const [selectedProvider, setSelectedProvider] = useState("ollama");
  const [selectedModel, setSelectedModel] = useState("");
  const [testResult, setTestResult] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/llm/providers`)
      .then((r) => r.json())
      .then((d) => {
        setProviders(d);
        if (d.ollama?.length) {
          const saved = localStorage.getItem("llm_provider") || "ollama";
          const savedModel =
            localStorage.getItem("llm_model") ||
            d.ollama[0]?.name ||
            "llama3.2:3b";
          setSelectedProvider(saved);
          setSelectedModel(savedModel);
        }
      })
      .catch(() => setProviders({ ollama: [{ name: "llama3.2:3b" }] }));
  }, []);

  const saveLlmConfig = (provider: string, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
    localStorage.setItem("llm_provider", provider);
    localStorage.setItem("llm_model", model);
  };

  const testConnection = async () => {
    setTestResult("Testing...");
    try {
      const r = await fetch(`${API_BASE}/api/llm/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
          prompt: "Hello, respond with just: OK",
        }),
      });
      const data = await r.json();
      setTestResult(
        data.response ? "Connected" : `Failed: ${data.error || "no response"}`,
      );
    } catch (e) {
      setTestResult(`Error: ${String(e)}`);
    }
  };

  const providerModels = providers[selectedProvider] || providers.ollama || [];
  const providerReachable = !!providers[selectedProvider];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4 mb-6">
        <div>
          <label
            htmlFor="isaac-sim-path"
            className="block text-sm text-slate-400 mb-1"
          >
            Isaac Sim Path
          </label>
          <input
            id="isaac-sim-path"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            placeholder="C:/Program Files/NVIDIA/Isaac Sim"
            readOnly
          />
        </div>
        <div>
          <label
            htmlFor="scenes-dir"
            className="block text-sm text-slate-400 mb-1"
          >
            Scenes Directory
          </label>
          <input
            id="scenes-dir"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            placeholder="./scenes/"
            readOnly
          />
        </div>
        <div>
          <label
            htmlFor="jobs-dir"
            className="block text-sm text-slate-400 mb-1"
          >
            Jobs Directory
          </label>
          <input
            id="jobs-dir"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            placeholder="./jobs/"
            readOnly
          />
        </div>
        <div className="pt-2 text-xs text-slate-500">
          Set ISAAC_SIM_PATH and ISAAC_MCP_SCENES_DIR environment variables to
          customize.
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
        <h2 className="text-lg font-semibold">Local LLM</h2>
        <p className="text-xs text-slate-400">
          Select which local LLM provider and model to use for AI tools.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="llm-provider"
              className="block text-xs text-slate-400 mb-1"
            >
              Provider
            </label>
            <select
              id="llm-provider"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              value={selectedProvider}
              onChange={(e) => {
                const p = e.target.value;
                const models = providers[p] || [];
                const m = models[0]?.name || "llama3.2:3b";
                saveLlmConfig(p, m);
              }}
            >
              {Object.keys(providers).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="llm-model"
              className="block text-xs text-slate-400 mb-1"
            >
              Model
            </label>
            <select
              id="llm-model"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              value={selectedModel}
              onChange={(e) => saveLlmConfig(selectedProvider, e.target.value)}
            >
              {providerModels.map((m: LlmModel) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${providerReachable ? "bg-green-500" : "bg-red-500"}`}
            />
            {selectedProvider}
          </span>
          <button
            type="button"
            onClick={testConnection}
            className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-1.5 rounded-lg border border-slate-600"
          >
            Test Connection
          </button>
          {testResult && (
            <span
              className={`text-xs ${testResult === "Connected" ? "text-green-400" : "text-yellow-400"}`}
            >
              {testResult}
            </span>
          )}
        </div>

        <div className="text-xs text-slate-500">
          The LLM page uses these settings. Changes are saved to localStorage
          and persist across sessions.
        </div>
      </div>
    </div>
  );
}
