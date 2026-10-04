import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

interface Status {
  isaac_available: boolean;
  isaac_version: string | null;
  gpus: string[];
  scenes_in_depot: number;
  active_jobs: number;
}

interface Job {
  job_id: string;
  scene_name: string;
  running?: boolean;
  completed?: boolean;
}

export default function Dashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [onboarding, setOnboarding] = useState<{
    message: string;
    next_steps: string[];
  } | null>(null);
  const [llmOk, setLlmOk] = useState<boolean | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/status`);
      if (r.ok) setStatus(await r.json());
    } catch {}
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/simulations`);
      if (r.ok) {
        const data = await r.json();
        setJobs([...(data.active || []), ...(data.completed || [])]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchJobs();
    fetch(`${API_BASE}/api/llm/onboarding`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d)
          setOnboarding({ message: d.message, next_steps: d.next_steps || [] });
      })
      .catch(() => {});
    fetch(`${API_BASE}/api/llm/discover`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        setLlmOk(
          !!d &&
            (d.providers || []).some(
              (p: { reachable: boolean }) => p.reachable,
            ),
        ),
      )
      .catch(() => setLlmOk(false));
    const iv = setInterval(fetchJobs, 3000);
    return () => clearInterval(iv);
  }, [fetchStatus, fetchJobs]);

  const handleAiExecute = async () => {
    setAiResult("Thinking...");
    try {
      const r = await fetch(`${API_BASE}/api/llm/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2:3b",
          prompt: `You are an Isaac Sim simulation assistant. ${aiPrompt}`,
        }),
      });
      const data = await r.json();
      setAiResult(data.response || data.error || "No response");
    } catch (e) {
      setAiResult(String(e));
    }
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-sm text-slate-400 mb-6" data-testid="dashboard-hero">
        isaac-mcp wraps NVIDIA Isaac Sim / Isaac Lab as MCP tools: load USD
        scenes on the Models page, start GPU-accelerated simulations below or
        from Simulations, then drive joints from the chat or the LLM page.
        Backend status and job counts refresh live; start with Quick AI Workflow
        or pick a scene to load first.
      </p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Isaac Sim",
            value:
              status?.isaac_version ??
              (status?.isaac_available ? "Available" : "N/A"),
          },
          { label: "GPU", value: status?.gpus?.[0]?.split(",")[0] ?? "N/A" },
          { label: "Scenes in Depot", value: status?.scenes_in_depot ?? "..." },
          { label: "Active Jobs", value: status?.active_jobs ?? "..." },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700"
          >
            <div className="text-xs text-slate-400 uppercase tracking-wider">
              {c.label}
            </div>
            <div className="text-2xl font-bold mt-1 text-cyan-300">
              {c.value}
            </div>
          </div>
        ))}
      </div>

      {status && (!status.isaac_available || llmOk === false) && (
        <div
          className="bg-red-950/40 border border-red-800 rounded-xl p-5 mb-8"
          data-testid="onboarding-cue"
        >
          <h2 className="text-lg font-semibold mb-2 text-red-200">
            Finish setup to unlock simulations
          </h2>
          <p className="text-sm text-slate-300 mb-3">
            {onboarding?.message ||
              "Point isaac-mcp at Isaac Sim, then chat with your robot."}
          </p>
          {!status.isaac_available && (
            <p className="text-sm text-slate-400 mb-2">
              Isaac Sim not detected — set ISAAC_SIM_PATH (see .env.example).
            </p>
          )}
          {llmOk === false && (
            <p className="text-sm text-slate-400 mb-2">
              No local LLM reachable — start Ollama on :11434 for the AI tools.
            </p>
          )}
          {(onboarding?.next_steps || []).length > 0 && (
            <ul className="list-disc ml-5 text-sm text-slate-400 mb-3">
              {(onboarding?.next_steps || []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          )}
          <a href="/help" className="text-sm text-cyan-300 hover:text-cyan-200">
            Open the setup guide
          </a>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-8">
        <h2 className="text-lg font-semibold mb-3">Quick AI Workflow</h2>
        <div className="flex gap-3">
          <input
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            placeholder="e.g. load the Franka Panda model and start a simulation"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAiExecute()}
          />
          <button
            type="button"
            onClick={handleAiExecute}
            className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Execute
          </button>
        </div>
        {aiResult && (
          <pre className="mt-3 bg-slate-900 rounded-lg p-3 text-xs text-slate-300 max-h-40 overflow-auto whitespace-pre-wrap">
            {aiResult}
          </pre>
        )}
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <h2 className="text-lg font-semibold p-4 border-b border-slate-700">
          Active Jobs
        </h2>
        <div className="divide-y divide-slate-700">
          {jobs.length === 0 && (
            <div className="p-4 text-sm text-slate-500">
              No jobs yet. Start a simulation from the Simulations page.
            </div>
          )}
          {jobs.map((job) => (
            <div
              key={job.job_id}
              className="p-4 flex items-center justify-between text-sm"
            >
              <div>
                <span className="font-medium">{job.scene_name}</span>
                <span className="text-slate-500 ml-2">#{job.job_id}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  job.running
                    ? "bg-green-900 text-green-300"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {job.running
                  ? "Running"
                  : job.completed
                    ? "Completed"
                    : "Stopped"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
