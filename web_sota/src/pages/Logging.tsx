import { useState } from "react";

export default function Logging() {
  const [jobId, setJobId] = useState("");
  const [result, setResult] = useState("");

  const handleAnalyze = async () => {
    if (!jobId) return;
    setResult("Analyzing...");
    try {
      const r = await fetch("/api/ai/analyze-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });
      const data = await r.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setResult(String(e));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Job Logs</h1>
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-6">
        <div className="flex gap-3 mb-4">
          <input
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            placeholder="Job ID"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
          />
          <button onClick={handleAnalyze} className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Analyze Logs
          </button>
        </div>
        {result && (
          <pre className="bg-slate-900 rounded-lg p-3 text-xs text-slate-300 max-h-96 overflow-auto whitespace-pre-wrap">
            {result}
          </pre>
        )}
      </div>
    </div>
  );
}
