import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

interface Job {
  job_id: string;
  scene_name: string;
  running?: boolean;
  completed?: boolean;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  kind: string;
  detail: string;
}

export default function Inbox() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [errors, setErrors] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFailed("");
    try {
      const [jobsRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/api/simulations`),
        fetch(`${API_BASE}/api/logs?level=ERROR&limit=20&sort=desc`),
      ]);
      if (!jobsRes.ok || !logsRes.ok)
        throw new Error("backend answered with an error");
      const jobsData = await jobsRes.json();
      const logsData = await logsRes.json();
      setJobs([...(jobsData.completed || [])]);
      setErrors(logsData.entries || []);
    } catch (e) {
      setFailed(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div data-testid="inbox-page">
      <h1 className="text-2xl font-bold mb-2">Inbox</h1>
      <p className="text-sm text-slate-400 mb-6" data-testid="inbox-subtitle">
        Finished simulations and recent errors that need attention.
      </p>

      {loading && (
        <div
          className="text-sm text-slate-400 animate-pulse"
          data-testid="inbox-loading"
        >
          Loading activity...
        </div>
      )}

      {!loading && failed && (
        <div
          className="bg-red-950/40 border border-red-800 rounded-xl p-5"
          data-testid="inbox-error"
        >
          <p className="text-sm text-red-200 mb-3">
            Could not load activity: {failed}
          </p>
          <button
            type="button"
            onClick={fetchAll}
            className="bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !failed && jobs.length === 0 && errors.length === 0 && (
        <div
          className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center"
          data-testid="inbox-empty"
        >
          <p className="text-sm text-slate-300 font-medium mb-1">All clear</p>
          <p className="text-sm text-slate-500">
            No finished simulations or errors. Start one from the Simulations
            page.
          </p>
        </div>
      )}

      {!loading && !failed && errors.length > 0 && (
        <div
          className="bg-slate-800 rounded-xl border border-slate-700 mb-6"
          data-testid="inbox-errors"
        >
          <h2 className="text-lg font-semibold p-4 border-b border-slate-700">
            Recent errors ({errors.length})
          </h2>
          <div className="divide-y divide-slate-700">
            {errors.map((e) => (
              <div key={e.id} className="p-4 text-sm">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-300 mr-2">
                  {e.level}
                </span>
                <span className="text-slate-300">{e.detail}</span>
                <span className="text-slate-500 ml-2 text-xs">
                  {e.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !failed && jobs.length > 0 && (
        <div
          className="bg-slate-800 rounded-xl border border-slate-700"
          data-testid="inbox-jobs"
        >
          <h2 className="text-lg font-semibold p-4 border-b border-slate-700">
            Finished simulations ({jobs.length})
          </h2>
          <div className="divide-y divide-slate-700">
            {jobs.map((j) => (
              <div
                key={j.job_id}
                className="p-4 flex items-center justify-between text-sm"
              >
                <div>
                  <span className="font-medium">{j.scene_name}</span>
                  <span className="text-slate-500 ml-2">#{j.job_id}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300">
                  {j.completed ? "Completed" : "Stopped"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
