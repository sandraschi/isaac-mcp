import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";
import { useLlmStore } from "../store/llm";

interface Discovered {
  id: string;
  reachable: boolean;
  models: string[];
}

export default function Settings() {
  const providers = useLlmStore((s) => s.providers);
  const setProviders = useLlmStore((s) => s.setProviders);
  const selectedProvider = useLlmStore((s) => s.provider);
  const selectedModel = useLlmStore((s) => s.model);
  const setStoreProvider = useLlmStore((s) => s.setProvider);
  const setStoreModel = useLlmStore((s) => s.setModel);
  const gpuDetected = useLlmStore((s) => s.gpuDetected);
  const gpuSummary = useLlmStore((s) => s.gpuSummary);
  const setGpu = useLlmStore((s) => s.setGpu);
  const [discovered, setDiscovered] = useState<Discovered[]>([]);
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
          setStoreProvider(saved);
          setStoreModel(savedModel);
        }
      })
      .catch(() => setProviders({ ollama: [{ name: "llama3.2:3b" }] }));
    fetch(`${API_BASE}/api/llm/discover`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setDiscovered(d.providers || []);
      })
      .catch(() => {});
    fetch(`${API_BASE}/api/status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const gpus: string[] = d?.gpus || [];
        setGpu(gpus.length > 0, gpus[0] ? gpus[0].split(",")[0] : "");
      })
      .catch(() => {});
  }, [setProviders, setStoreProvider, setStoreModel, setGpu]);

  const saveLlmConfig = (provider: string, model: string) => {
    setStoreProvider(provider);
    setStoreModel(model);
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
    <div className="max-w-2xl" data-testid="settings-page">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4 mb-6">
        <div>
          <label
            htmlFor="isaac-sim-path"
            className="block text-sm text-slate-300 mb-1"
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
            className="block text-sm text-slate-300 mb-1"
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
            className="block text-sm text-slate-300 mb-1"
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
        <div className="pt-2 text-sm text-slate-300">
          Set ISAAC_SIM_PATH and ISAAC_MCP_SCENES_DIR environment variables to
          customize.
        </div>
      </div>

      {gpuDetected && discovered.every((p) => !p.reachable) && (
        <div
          className="bg-amber-950/40 border border-amber-800 rounded-xl p-5 mb-6"
          data-testid="gpu-opportunity"
        >
          <p className="text-sm text-amber-200 font-medium mb-1">
            GPU detected ({gpuSummary}) but no local LLM is running.
          </p>
          <p className="text-sm text-slate-300">
            Install Ollama and pull llama3.2:3b to unlock the AI tools — your
            GPU stays free for Isaac Sim afterwards.
          </p>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
        <h2 className="text-lg font-semibold">Local LLM</h2>
        <p className="text-sm text-slate-300">
          Select which local LLM provider and model to use for AI tools.
        </p>

        {discovered.length > 0 && (
          <div
            className="grid grid-cols-2 gap-4"
            data-testid="llm-provider-cards"
          >
            {discovered.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl p-4 border ${
                  p.reachable
                    ? "bg-slate-700/50 border-green-800"
                    : "bg-slate-800 border-slate-700"
                }`}
                data-testid={`llm-provider-card-${p.id}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${p.reachable ? "bg-green-500" : "bg-slate-600"}`}
                  />
                  <span className="text-sm font-medium">
                    {p.id === "lm-studio"
                      ? "LM Studio (free, local)"
                      : "Ollama (free, local)"}
                  </span>
                </div>
                <p className="text-sm text-slate-300">
                  {p.reachable
                    ? `${p.models.length} model(s): ${p.models.slice(0, 3).join(", ") || "—"}`
                    : "not detected on localhost"}
                </p>
                <p className="text-sm text-slate-300">
                  {p.id === "ollama" ? "127.0.0.1:11434" : "127.0.0.1:1234"}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="llm-provider"
              className="block text-sm text-slate-300 mb-1"
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
            <label
              htmlFor="llm-model"
              className="block text-sm text-slate-300 mb-1"
            >
              Model
            </label>
            <select
              id="llm-model"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              value={selectedModel}
              onChange={(e) => saveLlmConfig(selectedProvider, e.target.value)}
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

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm">
            <span
              className={`w-2 h-2 rounded-full ${providerReachable ? "bg-green-500" : "bg-red-500"}`}
            />
            {selectedProvider}
          </span>
          <button
            type="button"
            onClick={testConnection}
            className="bg-slate-700 hover:bg-slate-600 text-sm px-3 py-1.5 rounded-lg border border-slate-600"
            data-testid="llm-test-button"
          >
            Test Connection
          </button>
          {testResult && (
            <span
              className={`text-sm ${testResult === "Connected" ? "text-green-400" : "text-yellow-400"}`}
            >
              {testResult}
            </span>
          )}
        </div>

        <div className="text-sm text-slate-300">
          The LLM page uses these settings. Changes are saved to localStorage
          and persist across sessions.
        </div>
      </div>
    </div>
  );
}
