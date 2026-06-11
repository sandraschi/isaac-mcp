export default function Help() {
  const tools = [
    ["sim_status", "Health check: Isaac Python, GPU, depot, active jobs"],
    ["load_scene", "Load a USD/URDF scene into the depot"],
    ["spawn_model", "Spawn a model into a loaded scene"],
    ["start_sim", "Launch Isaac Sim as a subprocess"],
    ["stop_sim", "Terminate a running simulation"],
    ["get_state", "Read joint positions, velocities, sensor data"],
    ["apply_control", "Apply control signals to actuators"],
    ["list_scenes", "List loaded scenes in the depot"],
    ["list_jobs", "List active and completed simulation jobs"],
    ["agentic_sim_workflow", "Multi-step AI orchestration via host LLM"],
    ["natural_language_control", "Natural language to actuator values"],
    ["analyze_sim_state", "Analyze robot posture via LLM"],
    ["analyze_sim_logs", "Diagnose sim errors via LLM"],
    ["discover_model", "AI-powered USD/URDF discovery from GitHub"],
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Help</h1>
      <div className="bg-slate-800 rounded-xl border border-slate-700 mb-6">
        <h2 className="text-lg font-semibold p-4 border-b border-slate-700">Tools (14)</h2>
        <div className="divide-y divide-slate-700">
          {tools.map(([name, desc]) => (
            <div key={name} className="p-3 flex items-start gap-3 text-sm">
              <code className="text-cyan-400 font-mono whitespace-nowrap">{name}</code>
              <span className="text-slate-300">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 text-sm text-slate-300 space-y-2">
        <p><strong>Ports:</strong> Frontend 11048 / Backend 11049</p>
        <p><strong>Requirements:</strong> NVIDIA GPU, Isaac Sim installed</p>
        <p><strong>Environment:</strong> ISAAC_SIM_PATH defaults to C:/Program Files/NVIDIA/Isaac Sim</p>
      </div>
    </div>
  );
}
