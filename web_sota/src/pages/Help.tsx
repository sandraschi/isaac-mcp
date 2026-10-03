import { useState } from "react";

const TABS = ["Overview", "Tools", "Setup", "Troubleshooting"];

const TOOLS = [
  {
    name: "sim_status",
    desc: "Health check: Isaac Python, GPU, depot, active jobs",
    group: "Core Sim",
  },
  {
    name: "load_scene",
    desc: "Load a USD/URDF scene into the depot",
    group: "Core Sim",
  },
  {
    name: "spawn_model",
    desc: "Spawn a model into a loaded scene",
    group: "Core Sim",
  },
  {
    name: "start_sim",
    desc: "Launch Isaac Sim as a subprocess",
    group: "Core Sim",
  },
  {
    name: "stop_sim",
    desc: "Terminate a running simulation",
    group: "Core Sim",
  },
  {
    name: "get_state",
    desc: "Read joint positions, velocities, sensor data",
    group: "Core Sim",
  },
  {
    name: "apply_control",
    desc: "Apply control signals to actuators",
    group: "Core Sim",
  },
  {
    name: "list_scenes",
    desc: "List loaded scenes in the depot",
    group: "Core Sim",
  },
  {
    name: "list_jobs",
    desc: "List active and completed simulation jobs",
    group: "Core Sim",
  },
  {
    name: "agentic_sim_workflow",
    desc: "Multi-step AI orchestration via host LLM",
    group: "AI Workflow",
  },
  {
    name: "natural_language_control",
    desc: "NL to actuator values",
    group: "AI Workflow",
  },
  {
    name: "analyze_sim_state",
    desc: "NL analysis of robot posture/behaviour",
    group: "AI Workflow",
  },
  {
    name: "analyze_sim_logs",
    desc: "NL diagnosis of sim errors",
    group: "AI Workflow",
  },
  {
    name: "discover_model",
    desc: "AI-powered USD/URDF discovery from GitHub",
    group: "AI Workflow",
  },
];

const TROUBLES = [
  {
    symptom: "sim_status: No NVIDIA GPU detected",
    cause: "Missing NVIDIA GPU or outdated driver",
    fix: "Install NVIDIA driver 580.65.06+. Minimum 8 GB VRAM (RTX 3060+).",
  },
  {
    symptom: "Isaac Sim fails to start",
    cause: "ISAAC_PYTHON not found or wrong version",
    fix: "Set ISAAC_PYTHON env var to the Python 3.11 binary in your Isaac Sim venv. Default: .venv-isaac311/Scripts/python.exe",
  },
  {
    symptom: "ImportError: no module named isaacsim",
    cause: "Isaac Sim pip install missing or wrong Python version",
    fix: "Create .venv-isaac311 with Python 3.11, then: pip install isaacsim[all,extscache]==5.1.0 --extra-index-url https://pypi.nvidia.com",
  },
  {
    symptom: "First launch takes >10 minutes",
    cause: "Omniverse Kit extensions downloading",
    fix: "Normal. first_launch.ps1 accepts the EULA and pulls ~2 GB of extensions. Only happens once.",
  },
  {
    symptom: "NVIDIA Omniverse EULA not accepted",
    cause: "Interactive EULA prompt blocks startup",
    fix: "Run scripts/first_launch.ps1 which handles the acceptance flow automatically.",
  },
  {
    symptom: "Out of GPU memory",
    cause: "Scene too large for available VRAM",
    fix: "Simplify the USD scene or reduce physics complexity. Isaac Sim requires ~4 GB VRAM idle.",
  },
  {
    symptom: "Web dashboard not loading",
    cause: "Backend or Vite not running",
    fix: "Ensure backend (11049) and Vite (11048) are both running. Check browser console.",
  },
  {
    symptom: "Port already in use",
    cause: "Previous instance still listening",
    fix: "Get-NetTCPConnection -LocalPort 11048,11049 | Stop-Process -Id {OwningProcess} -Force",
  },
  {
    symptom: "Scene loads but models are invisible",
    cause: "USD path resolution issue",
    fix: "Use absolute paths for USD assets. Relative paths resolve from the scene file location.",
  },
  {
    symptom: "apply_control: joint not found",
    cause: "Joint name mismatch between scene and tool call",
    fix: "Use get_state() first to list available joints, then exact-match names in apply_control.",
  },
];

export default function Help() {
  const [tab, setTab] = useState(0);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Help</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t, i) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === i ? "bg-blue-600 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-100"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && <Overview />}
      {tab === 1 && <Tools />}
      {tab === 2 && <Setup />}
      {tab === 3 && <Troubleshooting />}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Overview() {
  return (
    <div className="space-y-4">
      <Card title="What It Is">
        <p className="text-sm text-slate-600 mb-2">
          <strong>isaac-mcp</strong> wraps NVIDIA Isaac Sim / Isaac Lab as MCP
          tools. Start, control, and query Isaac Sim simulations from any MCP
          client.
        </p>
        <p className="text-sm text-slate-600">
          <strong>Requires an NVIDIA GPU</strong> with at least 8 GB VRAM (RTX
          3060+) and driver 580.65.06+.
          <strong>Isaac Sim is a separate install</strong> — either via pip (
          <code className="text-xs bg-slate-100 px-1 rounded">
            isaacsim[all,extscache]==5.1.0
          </code>
          ) or a binary install (2023.1+). The server auto-detects the Python
          interpreter.
        </p>
        <p className="text-sm text-slate-600">
          USD scenes only. Each simulation runs as an isolated subprocess with
          state sync via the fleet file-protocol (
          <code className="text-xs bg-slate-100 px-1 rounded">state.json</code>{" "}
          /{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">
            control.json
          </code>{" "}
          /{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">stop.signal</code>
          ).
        </p>
      </Card>

      <Card title="Architecture">
        <pre className="bg-slate-900 text-green-300 text-xs p-4 rounded font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto mb-3">
          {`MCP Client (Claude Desktop, Cursor)
    │  stdio / HTTP
    ▼
FastMCP server (port 11049, Python 3.12)
    │  subprocess (Isaac Sim Python)
    ▼
Isaac Sim runner (Python 3.11 + isaacsim)
    │  USD scene loaded
    │  PhysX GPU physics + RTX rendering
    │  state sync via JSON over pipe`}
        </pre>
        <p className="text-sm text-slate-600">
          <strong>Two Python envs:</strong> Server runs on Python 3.12
          (FastMCP). Sims launch under a dedicated Python 3.11 interpreter
          (Isaac Sim 5.x requirement).
        </p>
      </Card>

      <Card title="Ports">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-2 pr-4 font-medium">Port</th>
              <th className="pb-2 font-medium">Service</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 pr-4 text-xs font-mono">11049</td>
              <td className="py-2 text-xs text-slate-600">
                FastAPI backend + MCP HTTP
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-xs font-mono">11048</td>
              <td className="py-2 text-xs text-slate-600">
                Vite React frontend (dev)
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card title="Badges">
        <div className="flex gap-2 flex-wrap">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
            Python 3.11+
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
            NVIDIA GPU Required
          </span>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
            14 tools
          </span>
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
            Isaac Sim 5.1
          </span>
          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
            NVIDIA EULA
          </span>
        </div>
      </Card>
    </div>
  );
}

function Tools() {
  const sim = TOOLS.filter((t) => t.group === "Core Sim");
  const ai = TOOLS.filter((t) => t.group === "AI Workflow");
  return (
    <div className="space-y-4">
      <Card title="Core Simulation Tools (9)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 pr-4 font-medium">Tool</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {sim.map((t) => (
                <tr key={t.name} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-xs font-mono text-blue-700 whitespace-nowrap">
                    {t.name}
                  </td>
                  <td className="py-2 text-xs text-slate-600">{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="AI Workflow Tools (5)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 pr-4 font-medium">Tool</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {ai.map((t) => (
                <tr key={t.name} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-xs font-mono text-blue-700 whitespace-nowrap">
                    {t.name}
                  </td>
                  <td className="py-2 text-xs text-slate-600">{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Full reference:{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">
            docs/TOOLS.md
          </code>{" "}
          in the repo.
        </p>
      </Card>
    </div>
  );
}

function Setup() {
  return (
    <div className="space-y-4">
      <Card title="Prerequisites">
        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
          <li>
            <strong>NVIDIA GPU</strong> — 8+ GB VRAM (RTX 3060+), driver
            580.65.06+
          </li>
          <li>
            <strong>Python 3.11</strong> — for the sim venv (Isaac Sim 5.x pip
            requirement)
          </li>
          <li>
            <strong>Python 3.11–3.12</strong> — for the MCP server
          </li>
          <li>
            <strong>Isaac Sim 5.1</strong> — via pip or binary install
          </li>
          <li>
            <strong>Git</strong> — for cloning the repo
          </li>
          <li>
            <strong>uv</strong> (recommended) —{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">
              pip install uv
            </code>
          </li>
        </ul>
      </Card>

      <Card title="Quick Install">
        <pre className="bg-slate-900 text-green-300 text-xs p-3 rounded font-mono whitespace-pre-wrap">
          {`git clone https://github.com/sandraschi/isaac-mcp
cd isaac-mcp
uv sync

# Simulation venv: Isaac Sim 5.1 requires Python 3.11
uv venv .venv-isaac311 -p 3.11
uv pip install "isaacsim[all,extscache]==5.1.0" ${"\\`"}
  --extra-index-url https://pypi.nvidia.com -p .venv-isaac311

# Accept EULA + pull extensions (10+ min, one-time)
.scripts\first_launch.ps1

uv run python -m isaac_mcp`}
        </pre>
      </Card>

      <Card title="Configuration">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 pr-4 font-medium">Variable</th>
                <th className="pb-2 pr-4 font-medium">Default</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4 text-xs font-mono">ISAAC_SIM_PATH</td>
                <td className="py-2 pr-4 text-xs text-slate-500">
                  C:/Program Files/NVIDIA/Isaac Sim
                </td>
                <td className="py-2 text-xs text-slate-600">
                  Path to binary Isaac Sim install
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4 text-xs font-mono">ISAAC_PYTHON</td>
                <td className="py-2 pr-4 text-xs text-slate-500">
                  auto-detect
                </td>
                <td className="py-2 text-xs text-slate-600">
                  Explicit Python interpreter for Isaac Sim
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4 text-xs font-mono">
                  ISAAC_MCP_SCENES_DIR
                </td>
                <td className="py-2 pr-4 text-xs text-slate-500">./scenes/</td>
                <td className="py-2 text-xs text-slate-600">
                  Custom scene depot directory
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-xs font-mono">ISAAC_MCP_PORT</td>
                <td className="py-2 pr-4 text-xs text-slate-500">11049</td>
                <td className="py-2 text-xs text-slate-600">
                  MCP server HTTP port
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Development Commands">
        <pre className="bg-slate-900 text-green-300 text-xs p-3 rounded font-mono whitespace-pre-wrap">
          {`just lint     # ruff check
just test     # pytest
just dev      # backend + frontend with hot reload
just e2e      # Playwright e2e tests`}
        </pre>
      </Card>
    </div>
  );
}

function Troubleshooting() {
  return (
    <Card title="Common Issues">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-2 pr-4 font-medium">Symptom</th>
              <th className="pb-2 pr-4 font-medium">Cause</th>
              <th className="pb-2 font-medium">Fix</th>
            </tr>
          </thead>
          <tbody>
            {TROUBLES.map((t) => (
              <tr key={t.symptom} className="border-b border-slate-100">
                <td className="py-2 pr-4 text-xs text-red-700 font-medium align-top">
                  {t.symptom}
                </td>
                <td className="py-2 pr-4 text-xs text-slate-600 align-top">
                  {t.cause}
                </td>
                <td className="py-2 text-xs text-slate-800 font-mono align-top whitespace-pre-wrap">
                  {t.fix}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 p-3 bg-slate-50 rounded text-xs text-slate-600">
        <p className="mb-1">
          <strong>Log files:</strong> Per-job log in{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">
            jobs/&lt;job_id&gt;/
          </code>
          , Isaac Sim stderr/subprocess output
        </p>
        <p className="mb-1">
          <strong>Reset:</strong> Delete{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">jobs/</code> and{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">
            scenes/.depot/registry.json
          </code>{" "}
          to clear all state
        </p>
      </div>
    </Card>
  );
}
