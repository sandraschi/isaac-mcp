import { useEffect, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { useZoom } from "./hooks/useZoom";
import { API_BASE } from "./lib/api";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Help from "./pages/Help";
import Inbox from "./pages/Inbox";
import Logging from "./pages/Logging";
import Models from "./pages/Models";
import Settings from "./pages/Settings";
import Setup from "./pages/Setup";
import Simulations from "./pages/Simulations";
import Skills from "./pages/Skills";
import Tools from "./pages/Tools";

const navItems = [
  { to: "/", label: "Dashboard", icon: "🏠" },
  { to: "/setup", label: "Setup", icon: "🧭" },
  { to: "/simulations", label: "Simulations", icon: "🎮" },
  { to: "/models", label: "Models", icon: "📦" },
  { to: "/inbox", label: "Inbox", icon: "📥" },
  { to: "/tools", label: "Tools", icon: "🛠️" },
  { to: "/skills", label: "Skills", icon: "📚" },
  { to: "/chat", label: "Chat", icon: "💬" },
  { to: "/apps", label: "Apps", icon: "🗂️" },
  { to: "/logging", label: "Logging", icon: "📊" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
  { to: "/help", label: "Help", icon: "❓" },
];

type BackendStatus = "unknown" | "ready" | "error";

function Sidebar({
  backendStatus,
  zoomPct,
}: {
  backendStatus: BackendStatus;
  zoomPct: number;
}) {
  const dot =
    backendStatus === "ready"
      ? "bg-green-500"
      : backendStatus === "error"
        ? "bg-red-500"
        : "bg-slate-500";
  return (
    <nav className="w-56 min-h-screen bg-slate-900 border-r border-slate-700 p-4 flex flex-col">
      <div className="text-lg font-bold mb-1 px-2 text-cyan-400">Isaac MCP</div>
      <div className="flex items-center gap-2 px-2 mb-4 text-sm text-slate-300">
        <span
          className={`w-2 h-2 rounded-full ${dot}`}
          data-testid="backend-dot"
        />
        <span>
          {backendStatus === "ready"
            ? "Backend"
            : backendStatus === "error"
              ? "Backend down"
              : "Connecting..."}
        </span>
        <span className="ml-auto text-slate-400" data-testid="zoom-indicator">
          {zoomPct}%
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-cyan-800 text-cyan-100"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Shell() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("unknown");
  const { level, zoomIn, zoomOut, resetZoom } = useZoom();
  const navigate = useNavigate();

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<string>("backend-status", (event) => {
          setBackendStatus(event.payload === "ready" ? "ready" : "error");
        });
      } catch {
        // dev browser has no Tauri runtime; HTTP polling below covers it
      }
    })();
    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/status`);
        if (!cancelled) setBackendStatus(r.ok ? "ready" : "error");
      } catch {
        if (!cancelled) setBackendStatus("error");
      }
    };
    poll();
    const iv = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [zoomIn, zoomOut]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
      if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        navigate("/tools");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetZoom, navigate]);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar
        backendStatus={backendStatus}
        zoomPct={Math.round(level * 100)}
      />
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/simulations" element={<Simulations />} />
          <Route path="/models" element={<Models />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/apps" element={<Apps />} />
          <Route path="/logging" element={<Logging />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
