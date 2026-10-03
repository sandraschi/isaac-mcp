import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import FloatingChat from "./components/FloatingChat";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Help from "./pages/Help";
import Inbox from "./pages/Inbox";
import LLM from "./pages/LLM";
import Logging from "./pages/Logging";
import Models from "./pages/Models";
import Settings from "./pages/Settings";
import Simulations from "./pages/Simulations";
import Skills from "./pages/Skills";
import Tools from "./pages/Tools";

const navItems = [
  { to: "/", label: "Dashboard", icon: "🏠" },
  { to: "/simulations", label: "Simulations", icon: "🎮" },
  { to: "/models", label: "Models", icon: "📦" },
  { to: "/inbox", label: "Inbox", icon: "📥" },
  { to: "/tools", label: "Tools", icon: "🛠️" },
  { to: "/skills", label: "Skills", icon: "📚" },
  { to: "/chat", label: "Chat", icon: "💬" },
  { to: "/logging", label: "Logging", icon: "📊" },
  { to: "/llm", label: "LLM", icon: "🤖" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
  { to: "/help", label: "Help", icon: "❓" },
];

function Sidebar() {
  return (
    <nav className="w-56 min-h-screen bg-slate-900 border-r border-slate-700 p-4 flex flex-col">
      <div className="text-lg font-bold mb-6 px-2 text-cyan-400">Isaac MCP</div>
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

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/simulations" element={<Simulations />} />
            <Route path="/models" element={<Models />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/logging" element={<Logging />} />
            <Route path="/llm" element={<LLM />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
          </Routes>
        </main>
        <FloatingChat />
      </div>
    </BrowserRouter>
  );
}
