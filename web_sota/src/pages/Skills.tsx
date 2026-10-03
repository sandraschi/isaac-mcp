import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

interface Skill {
  name: string;
  title: string;
}

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/skills`)
      .then((r) => {
        if (!r.ok) throw new Error("backend answered with an error");
        return r.json();
      })
      .then((d: unknown) => setSkills(Array.isArray(d) ? (d as Skill[]) : []))
      .catch((e: unknown) => setFailed(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div data-testid="skills-page">
      <h1 className="text-2xl font-bold mb-2">Skills</h1>
      <p className="text-sm text-slate-400 mb-6" data-testid="skills-subtitle">
        Reusable playbooks the chat loads as system context. Same source as{" "}
        <code className="text-xs bg-slate-800 px-1 rounded">
          GET /api/skills
        </code>
        .
      </p>

      {loading && (
        <div
          className="text-sm text-slate-400 animate-pulse"
          data-testid="skills-loading"
        >
          Loading skills...
        </div>
      )}

      {!loading && failed && (
        <div
          className="bg-red-950/40 border border-red-800 rounded-xl p-5"
          data-testid="skills-error"
        >
          <p className="text-sm text-red-200">
            Could not load skills: {failed}
          </p>
        </div>
      )}

      {!loading && !failed && skills.length === 0 && (
        <div className="text-sm text-slate-500" data-testid="skills-empty">
          No skills registered yet.
        </div>
      )}

      {!loading && !failed && skills.length > 0 && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          data-testid="skills-list"
        >
          {skills.map((s) => (
            <div
              key={s.name}
              className="bg-slate-800 rounded-xl p-5 border border-slate-700"
            >
              <div className="font-mono text-cyan-300 text-sm mb-1">
                {s.name}
              </div>
              <div className="text-sm text-slate-300 mb-3">{s.title}</div>
              <a
                href="/chat"
                className="text-sm text-cyan-300 hover:text-cyan-200"
              >
                Use in Chat
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
