import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../lib/api";

interface Job {
  job_id: string;
  scene_name: string;
  running?: boolean;
  completed?: boolean;
}

const PAGE_SIZE = 8;

export default function Simulations() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sceneName, setSceneName] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("name-asc");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState("");

  const fetchJobs = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/simulations`);
      if (!r.ok) throw new Error("backend answered with an error");
      const data = await r.json();
      setJobs([...(data.active || []), ...(data.completed || [])]);
      setFailed("");
    } catch (e) {
      setFailed(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const iv = setInterval(fetchJobs, 3000);
    return () => clearInterval(iv);
  }, [fetchJobs]);

  const handleStart = async () => {
    if (!sceneName) return;
    await fetch(`${API_BASE}/api/jobs/start`, {
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

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = jobs.filter((j) => {
      if (q && !`${j.scene_name} ${j.job_id}`.toLowerCase().includes(q))
        return false;
      if (statusFilter === "running" && !j.running) return false;
      if (statusFilter === "stopped" && j.running) return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "name-desc") return b.scene_name.localeCompare(a.scene_name);
      if (sort === "status")
        return Number(b.running || false) - Number(a.running || false);
      return a.scene_name.localeCompare(b.scene_name);
    });
    return sorted;
  }, [jobs, search, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = visible.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <div data-testid="simulations-page">
      <h1 className="text-2xl font-bold mb-6">Simulations</h1>
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-6">
        <h2 className="text-lg font-semibold mb-3">Start New Simulation</h2>
        <div className="flex gap-3">
          <input
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            placeholder="Scene name from depot"
            value={sceneName}
            onChange={(e) => setSceneName(e.target.value)}
            data-testid="sim-start-input"
          />
          <button
            type="button"
            onClick={handleStart}
            className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            data-testid="sim-start-button"
          >
            Start
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="flex-1 min-w-48 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          data-testid="sim-search"
        />
        <select
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          data-testid="sim-status-filter"
        >
          <option value="all">All statuses</option>
          <option value="running">Running</option>
          <option value="stopped">Stopped</option>
        </select>
        <select
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(0);
          }}
          data-testid="sim-sort"
        >
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
          <option value="status">Status</option>
        </select>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <h2
          className="text-lg font-semibold p-4 border-b border-slate-700"
          data-testid="sim-count"
        >
          Job History ({visible.length})
        </h2>
        {loading && (
          <div
            className="p-4 text-sm text-slate-300 animate-pulse"
            data-testid="sim-loading"
          >
            Loading jobs...
          </div>
        )}
        {!loading && failed && (
          <div className="p-4" data-testid="sim-error">
            <p className="text-sm text-red-300 mb-3">
              Could not load jobs: {failed}
            </p>
            <button
              type="button"
              onClick={fetchJobs}
              className="bg-slate-700 hover:bg-slate-600 text-sm px-4 py-2 rounded-lg border border-slate-600"
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !failed && visible.length === 0 && (
          <div className="p-4 text-sm text-slate-300" data-testid="sim-empty">
            No jobs yet. Enter a scene name above and press Start.
          </div>
        )}
        {!loading && !failed && pageItems.length > 0 && (
          <div className="divide-y divide-slate-700" data-testid="sim-list">
            {pageItems.map((j) => (
              <div
                key={j.job_id}
                className="p-4 flex items-center justify-between text-sm"
              >
                <div>
                  <span className="font-medium">{j.scene_name}</span>
                  <span className="text-slate-300 ml-2">#{j.job_id}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-sm font-medium ${j.running ? "bg-green-900 text-green-300" : "bg-slate-700 text-slate-300"}`}
                  >
                    {j.running ? "Running" : "Stopped"}
                  </span>
                  {j.running && (
                    <button
                      type="button"
                      onClick={() => handleStop(j.job_id)}
                      className="text-red-300 hover:text-red-200 text-sm"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && !failed && totalPages > 1 && (
          <div
            className="flex items-center justify-between p-4 text-sm text-slate-300"
            data-testid="sim-pagination"
          >
            <button
              type="button"
              className="px-3 py-1 rounded border border-slate-700 hover:bg-slate-700 disabled:opacity-30"
              disabled={safePage <= 0}
              onClick={() => setPage(safePage - 1)}
            >
              Prev
            </button>
            <span>
              Page {safePage + 1} of {totalPages}
            </span>
            <button
              type="button"
              className="px-3 py-1 rounded border border-slate-700 hover:bg-slate-700 disabled:opacity-30"
              disabled={safePage + 1 >= totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
