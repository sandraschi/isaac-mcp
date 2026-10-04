import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

interface FleetApp {
  name: string;
  ports: number[];
  blurb: string;
  live: boolean;
}

export default function Apps() {
  const [apps, setApps] = useState<FleetApp[]>([]);
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/fleet/apps`)
      .then((r) => {
        if (!r.ok) throw new Error("backend answered with an error");
        return r.json();
      })
      .then((d) => {
        setApps(d.apps || []);
        setSource(d.source || "");
      })
      .catch((e: unknown) => setFailed(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const visible = apps.filter((a) => !q || a.name.toLowerCase().includes(q));

  return (
    <div data-testid="apps-page">
      <h1 className="text-2xl font-bold mb-2">Fleet Apps</h1>
      <p className="text-sm text-slate-300 mb-6" data-testid="apps-subtitle">
        Every app in the fleet port registry
        {source ? ` (source: ${source})` : ""}. This service is badged live.
      </p>

      <input
        className="w-full max-w-md bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm mb-6 focus:outline-none focus:border-cyan-500"
        placeholder="Search apps..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="apps-search"
      />

      {loading && (
        <div
          className="text-sm text-slate-300 animate-pulse"
          data-testid="apps-loading"
        >
          Loading fleet registry...
        </div>
      )}

      {!loading && failed && (
        <div
          className="bg-red-950/40 border border-red-800 rounded-xl p-5"
          data-testid="apps-error"
        >
          <p className="text-sm text-red-200">
            Could not load registry: {failed}
          </p>
        </div>
      )}

      {!loading && !failed && visible.length === 0 && (
        <div className="text-sm text-slate-300" data-testid="apps-empty">
          No apps match your search.
        </div>
      )}

      {!loading && !failed && visible.length > 0 && (
        <div
          className="bg-slate-800 rounded-xl border border-slate-700"
          data-testid="apps-list"
        >
          <h2 className="text-lg font-semibold p-4 border-b border-slate-700">
            Apps ({visible.length})
          </h2>
          <div className="divide-y divide-slate-700">
            {visible.map((a) => (
              <div
                key={a.name}
                className="p-4 flex items-center justify-between text-sm"
              >
                <div>
                  <span className="font-medium font-mono">{a.name}</span>
                  <span className="text-slate-300 ml-2">
                    {a.ports.join(" / ")}
                  </span>
                  <div className="text-slate-300 text-sm mt-0.5">{a.blurb}</div>
                </div>
                {a.live && (
                  <span className="px-2 py-0.5 rounded text-sm font-medium bg-green-900 text-green-300">
                    live
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
