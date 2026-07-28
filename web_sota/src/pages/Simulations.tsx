import { useState, useEffect } from "react";
import { API_BASE } from "../lib/api";

interface Job {
  job_id: string;
  scene_name: string;
  running?: boolean;
  completed?: boolean;
}

export default function Simulations() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sceneName, setSceneName] = useState("");

  const fetchJobs = async () => {
    try {
      const r = await fetch(API_BASE + "/api/simulations");
      if (r.ok) {
        const data = await r.json();
        setJobs([...(data.active || []), ...(data.completed || [])]);
      }
    } catch {}
  };

  useEffect(() => { fetchJobs(); const iv = setInterval(fetchJobs, 3000); return () => clearInterval(iv); }, []);

  const handleStart = async () => {
    if (!sceneName) return;
    await fetch(API_BASE + "/api/jobs/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene_name: sceneName }),
    });
    fetchJobs();
  };

  const handleStop = async (jobId: string) => {
    await fetch(`${API_BASE}/api/jobs/${jobId}/stop`, { method: "POST" });
    fetchJobs();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Simulations</h1>
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-6">
        <h2 className="text-lg font-semibold mb-3">Start New Simulation</h2>
        <div className="flex gap-3">
          <input
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            placeholder="Scene name from depot"
            value={sceneName}
            onChange={(e) => setSceneName(e.target.value)}
          />
          <button onClick={handleStart} className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Start
          </button>
        </div>
      </div>
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <h2 className="text-lg font-semibold p-4 border-b border-slate-700">Job History</h2>
        <div className="divide-y divide-slate-700">
          {jobs.map((j) => (
            <div key={j.job_id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{j.scene_name}</span>
                <span className="text-slate-500 ml-2">#{j.job_id}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${j.running ? "bg-green-900 text-green-300" : "bg-slate-700 text-slate-400"}`}>
                  {j.running ? "Running" : "Stopped"}
                </span>
                {j.running && (
                  <button onClick={() => handleStop(j.job_id)} className="text-red-400 hover:text-red-300 text-xs">Stop</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
