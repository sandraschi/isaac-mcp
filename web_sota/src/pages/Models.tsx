import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../lib/api";

interface SceneMeta {
  uri: string;
  path: string;
  size_kb: number;
  format: string;
}

const PAGE_SIZE = 10;

export default function Models() {
  const [scenes, setScenes] = useState<Record<string, SceneMeta>>({});
  const [uri, setUri] = useState("");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name-asc");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState("");

  const fetchScenes = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/scenes`);
      if (!r.ok) throw new Error("backend answered with an error");
      const data = await r.json();
      setScenes(data.scenes || {});
      setFailed("");
    } catch (e) {
      setFailed(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScenes();
  }, [fetchScenes]);

  const handleLoad = async () => {
    if (!uri || !name) return;
    await fetch(`${API_BASE}/api/scenes/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uri, name }),
    });
    fetchScenes();
    setUri("");
    setName("");
  };

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    const entries = Object.entries(scenes).filter(
      ([key, val]) =>
        !q ||
        key.toLowerCase().includes(q) ||
        val.format.toLowerCase().includes(q),
    );
    return entries.sort(([ka, a], [kb, b]) => {
      if (sort === "name-desc") return kb.localeCompare(ka);
      if (sort === "size-desc") return b.size_kb - a.size_kb;
      if (sort === "size-asc") return a.size_kb - b.size_kb;
      return ka.localeCompare(kb);
    });
  }, [scenes, search, sort]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = visible.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <div data-testid="models-page">
      <h1 className="text-2xl font-bold mb-6">Scene Depot</h1>
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-6">
        <h2 className="text-lg font-semibold mb-3">Load Scene</h2>
        <div className="flex gap-3 mb-2">
          <input
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            placeholder="URI (URL or local path)"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            data-testid="models-uri-input"
          />
          <input
            className="w-48 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="models-name-input"
          />
          <button
            type="button"
            onClick={handleLoad}
            className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            data-testid="models-load-button"
          >
            Load
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="flex-1 min-w-48 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          placeholder="Search scenes..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          data-testid="models-search"
        />
        <select
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(0);
          }}
          data-testid="models-sort"
        >
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
          <option value="size-desc">Largest first</option>
          <option value="size-asc">Smallest first</option>
        </select>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <h2
          className="text-lg font-semibold p-4 border-b border-slate-700"
          data-testid="models-count"
        >
          Loaded Scenes ({visible.length})
        </h2>
        {loading && (
          <div
            className="p-4 text-sm text-slate-300 animate-pulse"
            data-testid="models-loading"
          >
            Loading scenes...
          </div>
        )}
        {!loading && failed && (
          <div className="p-4" data-testid="models-error">
            <p className="text-sm text-red-300 mb-3">
              Could not load scenes: {failed}
            </p>
            <button
              type="button"
              onClick={fetchScenes}
              className="bg-slate-700 hover:bg-slate-600 text-sm px-4 py-2 rounded-lg border border-slate-600"
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !failed && visible.length === 0 && (
          <div
            className="p-4 text-sm text-slate-300"
            data-testid="models-empty"
          >
            No scenes in the depot yet. Load one above by URI or local path.
          </div>
        )}
        {!loading && !failed && pageItems.length > 0 && (
          <div className="divide-y divide-slate-700" data-testid="models-list">
            {pageItems.map(([key, val]) => (
              <div
                key={key}
                className="p-4 flex items-center justify-between text-sm"
              >
                <div>
                  <span className="font-medium">{key}</span>
                  <span className="text-slate-300 ml-2">{val.format}</span>
                  <span className="text-slate-300 ml-2">{val.size_kb} KB</span>
                </div>
                <span className="text-sm text-slate-300 truncate max-w-96">
                  {val.uri}
                </span>
              </div>
            ))}
          </div>
        )}
        {!loading && !failed && totalPages > 1 && (
          <div
            className="flex items-center justify-between p-4 text-sm text-slate-300"
            data-testid="models-pagination"
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
