import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

function groupOf(name: string): string {
  if (name.startsWith("show_")) return "Prefab cards";
  if (
    name.startsWith("agentic_") ||
    name.startsWith("natural_") ||
    name.startsWith("analyze_") ||
    name.startsWith("discover_")
  )
    return "AI workflows";
  return "Simulation";
}

export default function Tools() {
  const [tools, setTools] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/diagnostics`)
      .then((r) => {
        if (!r.ok) throw new Error("backend answered with an error");
        return r.json();
      })
      .then((d) => setTools(d.tools || []))
      .catch((e: unknown) => setFailed(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tools.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase()),
  );
  const groups = ["Simulation", "AI workflows", "Prefab cards"];

  return (
    <div data-testid="tools-page">
      <h1 className="text-2xl font-bold mb-2">Tools</h1>
      <p className="text-sm text-slate-400 mb-6" data-testid="tools-subtitle">
        Every MCP operation this server exposes, live from the backend.
      </p>

      <input
        className="w-full max-w-md bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm mb-6 focus:outline-none focus:border-cyan-500"
        placeholder="Search tools..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="tools-search"
      />

      {loading && (
        <div
          className="text-sm text-slate-400 animate-pulse"
          data-testid="tools-loading"
        >
          Loading tool catalog...
        </div>
      )}

      {!loading && failed && (
        <div
          className="bg-red-950/40 border border-red-800 rounded-xl p-5"
          data-testid="tools-error"
        >
          <p className="text-sm text-red-200">Could not load tools: {failed}</p>
        </div>
      )}

      {!loading && !failed && filtered.length === 0 && (
        <div className="text-sm text-slate-500" data-testid="tools-empty">
          No tools match your search.
        </div>
      )}

      {!loading &&
        !failed &&
        groups.map((group) => {
          const names = filtered.filter((t) => groupOf(t) === group);
          if (names.length === 0) return null;
          return (
            <div
              key={group}
              className="bg-slate-800 rounded-xl border border-slate-700 mb-6"
            >
              <h2 className="text-lg font-semibold p-4 border-b border-slate-700">
                {group} ({names.length})
              </h2>
              <div className="divide-y divide-slate-700">
                {names.map((name) => (
                  <div
                    key={name}
                    className="p-4 text-sm font-mono text-cyan-300"
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}
