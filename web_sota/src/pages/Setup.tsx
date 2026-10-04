import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../lib/api";

interface SimStatus {
  isaac_available: boolean;
  isaac_version: string | null;
  isaac_python: string | null;
  gpus: string[];
}

interface Discovered {
  id: string;
  reachable: boolean;
  models: string[];
}

type StepState = "wait" | "pass" | "fail";

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard unavailable (permissions, non-secure context) — value stays visible
  }
}

export default function Setup() {
  const [status, setStatus] = useState<SimStatus | null>(null);
  const [llmOk, setLlmOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState("");
  const [firstLaunchDone, setFirstLaunchDone] = useState<boolean>(() => {
    try {
      return localStorage.getItem("setup_first_launch") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setFailed("");
      try {
        const [statusRes, llmRes] = await Promise.all([
          fetch(`${API_BASE}/api/status`),
          fetch(`${API_BASE}/api/llm/discover`),
        ]);
        if (!statusRes.ok) throw new Error("backend answered with an error");
        const s = await statusRes.json();
        const d = llmRes.ok ? await llmRes.json() : null;
        if (cancelled) return;
        setStatus({
          isaac_available: !!s.isaac_available,
          isaac_version: s.isaac_version || null,
          isaac_python: s.isaac_python || null,
          gpus: s.gpus || [],
        });
        setLlmOk(
          !!d &&
            Array.isArray(d.providers) &&
            d.providers.some((p: Discovered) => p.reachable),
        );
      } catch (e) {
        if (!cancelled) setFailed(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const attestFirstLaunch = (done: boolean) => {
    setFirstLaunchDone(done);
    try {
      localStorage.setItem("setup_first_launch", done ? "1" : "0");
    } catch {
      // storage unavailable — attestation lasts for this session only
    }
  };

  const gpuState: StepState = !status
    ? "wait"
    : status.gpus.length > 0
      ? "pass"
      : "fail";
  const isaacState: StepState = !status
    ? "wait"
    : status.isaac_available
      ? "pass"
      : "fail";
  const pythonState: StepState = !status
    ? "wait"
    : status.isaac_python
      ? "pass"
      : "fail";
  const launchState: StepState = !status
    ? "wait"
    : firstLaunchDone
      ? "pass"
      : "fail";
  const llmState: StepState = llmOk === null ? "wait" : llmOk ? "pass" : "fail";

  const requiredDone = [gpuState, isaacState, pythonState, launchState].filter(
    (s) => s === "pass",
  ).length;
  const complete = requiredDone === 4;

  const dot = (s: StepState) =>
    s === "pass"
      ? "bg-green-500"
      : s === "fail"
        ? "bg-red-500"
        : "bg-slate-500";

  return (
    <div className="max-w-3xl" data-testid="setup-page">
      <h1 className="text-2xl font-bold mb-2">Setup wizard</h1>
      <p className="text-sm text-slate-300 mb-6" data-testid="setup-subtitle">
        Four required steps plus one optional. Each step checks live state — fix
        what is red, then Re-check. ({requiredDone}/4 required done)
      </p>

      {loading && (
        <div
          className="text-sm text-slate-300 animate-pulse"
          data-testid="setup-loading"
        >
          Checking system state...
        </div>
      )}

      {!loading && failed && (
        <div
          className="bg-red-950/40 border border-red-800 rounded-xl p-5 mb-6"
          data-testid="setup-error"
        >
          <p className="text-sm text-red-200 mb-3">
            Could not reach the backend: {failed}
          </p>
          <p className="text-sm text-slate-300">
            Start it with{" "}
            <code className="text-xs bg-slate-900 px-1 rounded">
              .\web_sota\start.ps1
            </code>
            , then Re-check below.
          </p>
        </div>
      )}

      {!loading && !failed && status && (
        <div className="space-y-4" data-testid="setup-steps">
          <div
            className="bg-slate-800 rounded-xl p-5 border border-slate-700"
            data-testid="setup-step-gpu"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${dot(gpuState)}`} />
              <h2 className="text-lg font-semibold">1. GPU</h2>
            </div>
            {gpuState === "pass" ? (
              <div className="text-sm text-slate-300">
                {status.gpus.map((g) => (
                  <div key={g} className="font-mono text-xs mb-1">
                    {g}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-300">
                No NVIDIA GPU detected. Isaac Sim needs 8 GB+ VRAM (RTX 3060+,
                driver 580.65.06+). Without a GPU the dashboard still works, but
                simulations will not start.
              </p>
            )}
          </div>

          <div
            className="bg-slate-800 rounded-xl p-5 border border-slate-700"
            data-testid="setup-step-isaac"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${dot(isaacState)}`} />
              <h2 className="text-lg font-semibold">2. Isaac Sim install</h2>
            </div>
            {isaacState === "pass" ? (
              <p className="text-sm text-slate-300">
                Detected
                {status.isaac_version
                  ? ` (version ${status.isaac_version})`
                  : ""}
                . Binary install or pip package — either works.
              </p>
            ) : (
              <div className="text-sm text-slate-300 space-y-2">
                <p>
                  Not found. Install Isaac Sim 5.x (free NVIDIA account), then
                  point the server at it:
                </p>
                <p>
                  <code className="text-xs bg-slate-900 px-1 rounded">
                    ISAAC_SIM_PATH=C:\Program Files\NVIDIA\Isaac Sim
                  </code>{" "}
                  in{" "}
                  <code className="text-xs bg-slate-900 px-1 rounded">
                    .env
                  </code>{" "}
                  (see{" "}
                  <code className="text-xs bg-slate-900 px-1 rounded">
                    .env.example
                  </code>
                  ).
                </p>
                <p>
                  Pip alternative: Python 3.11 venv +{" "}
                  <code className="text-xs bg-slate-900 px-1 rounded">
                    pip install "isaacsim[all,extscache]==5.1.0"
                    --extra-index-url https://pypi.nvidia.com
                  </code>
                </p>
              </div>
            )}
          </div>

          <div
            className="bg-slate-800 rounded-xl p-5 border border-slate-700"
            data-testid="setup-step-python"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${dot(pythonState)}`} />
              <h2 className="text-lg font-semibold">
                3. Isaac Python interpreter
              </h2>
            </div>
            {pythonState === "pass" && status.isaac_python ? (
              <div className="flex items-center gap-3">
                <code className="text-xs bg-slate-900 px-2 py-1 rounded font-mono break-all">
                  {status.isaac_python}
                </code>
                <button
                  type="button"
                  onClick={() => copyText(status.isaac_python || "")}
                  className="bg-slate-700 hover:bg-slate-600 text-sm px-3 py-1.5 rounded-lg border border-slate-600 shrink-0"
                >
                  Copy
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-300">
                No interpreter resolved. Set{" "}
                <code className="text-xs bg-slate-900 px-1 rounded">
                  ISAAC_PYTHON
                </code>{" "}
                to the Isaac Sim Python 3.11 binary and Re-check.
              </p>
            )}
          </div>

          <div
            className="bg-slate-800 rounded-xl p-5 border border-slate-700"
            data-testid="setup-step-first-launch"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${dot(launchState)}`} />
              <h2 className="text-lg font-semibold">
                4. First launch (EULA + extensions)
              </h2>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              The first start pulls ~2 GB of Omniverse extensions and asks for
              EULA acceptance. Run{" "}
              <code className="text-xs bg-slate-900 px-1 rounded">
                scripts/first_launch.ps1
              </code>{" "}
              once (10+ minutes, one time), then tick the box:
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={firstLaunchDone}
                onChange={(e) => attestFirstLaunch(e.target.checked)}
                data-testid="setup-first-launch-check"
              />
              I ran the first launch (EULA accepted, extensions pulled)
            </label>
          </div>

          <div
            className="bg-slate-800 rounded-xl p-5 border border-slate-700"
            data-testid="setup-step-llm"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${dot(llmState)}`} />
              <h2 className="text-lg font-semibold">
                5. Local LLM{" "}
                <span className="text-sm font-normal text-slate-400">
                  (optional)
                </span>
              </h2>
            </div>
            <p className="text-sm text-slate-300">
              {llmState === "pass"
                ? "A local provider is reachable — the AI tools (NL control, log analysis) will work."
                : "Not required for simulations. Install Ollama and pull llama3.2:3b to unlock the AI tools."}
            </p>
          </div>

          {complete ? (
            <div
              className="bg-green-950/40 border border-green-800 rounded-xl p-5"
              data-testid="setup-complete"
            >
              <p className="text-sm text-green-200 font-medium mb-3">
                Setup complete — load a USD scene on Models and start your first
                simulation.
              </p>
              <Link
                to="/"
                className="inline-block bg-green-800 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium"
                data-testid="setup-goto-dashboard"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-cyan-700 hover:bg-cyan-600 text-white text-sm px-4 py-2 rounded-lg font-medium"
              data-testid="setup-recheck"
            >
              Re-check
            </button>
          )}
        </div>
      )}
    </div>
  );
}
