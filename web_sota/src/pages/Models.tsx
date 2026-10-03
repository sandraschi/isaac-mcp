import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

interface Scene {
  [key: string]: { uri: string; path: string; size_kb: number; format: string };
}

export default function Models() {
  const [scenes, setScenes] = useState<Scene>({});
  const [uri, setUri] = useState("");
  const [name, setName] = useState("");

  const fetchScenes = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/scenes`);
      if (r.ok) {
        const data = await r.json();
        setScenes(data.scenes || {});
      }
    } catch {}
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Scene Depot</h1>
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-6">
        <h2 className="text-lg font-semibold mb-3">Load Scene</h2>
        <div className="flex gap-3 mb-2">
          <input
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            placeholder="URI (URL or local path)"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
          />
          <input
            className="w-48 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="button"
            onClick={handleLoad}
            className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Load
          </button>
        </div>
      </div>
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <h2 className="text-lg font-semibold p-4 border-b border-slate-700">
          Loaded Scenes ({Object.keys(scenes).length})
        </h2>
        <div className="divide-y divide-slate-700">
          {Object.entries(scenes).map(([key, val]) => (
            <div
              key={key}
              className="p-4 flex items-center justify-between text-sm"
            >
              <div>
                <span className="font-medium">{key}</span>
                <span className="text-slate-500 ml-2">{val.format}</span>
                <span className="text-slate-500 ml-2">{val.size_kb} KB</span>
              </div>
              <span className="text-xs text-slate-500 truncate max-w-96">
                {val.uri}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
