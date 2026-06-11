export default function Settings() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Isaac Sim Path</label>
          <input
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            placeholder="C:/Program Files/NVIDIA/Isaac Sim"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Scenes Directory</label>
          <input
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            placeholder="./scenes/"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Jobs Directory</label>
          <input
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            placeholder="./jobs/"
            readOnly
          />
        </div>
        <div className="pt-2 text-xs text-slate-500">
          Set ISAAC_SIM_PATH and ISAAC_MCP_SCENES_DIR environment variables to customize.
        </div>
      </div>
    </div>
  );
}
