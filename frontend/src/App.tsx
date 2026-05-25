import React, { useState } from "react";
import {
  LayoutDashboard,
  GitBranch,
  Activity,
  History,
  Play,
} from "lucide-react";
import MetricsDashboard from "./components/MetricsDashboard";
import PipelineControl from "./components/PipelineControl";
import LineageGraph from "./components/LineageGraph";
import PipelineHistory from "./components/PipelineHistory";

type Tab = "dashboard" | "pipeline" | "lineage" | "history";

interface NavItem {
  id: Tab;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "pipeline", label: "Pipeline", icon: <Activity size={18} /> },
  { id: "lineage", label: "Lineage", icon: <GitBranch size={18} /> },
  { id: "history", label: "History", icon: <History size={18} /> },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const handleRunPipeline = async () => {
    setRunning(true);
    setRunMessage(null);
    try {
      const res = await fetch("/api/pipeline/run", { method: "POST" });
      if (res.ok) {
        setRunMessage("Pipeline run completed successfully.");
        // Switch to pipeline tab to show results
        setActiveTab("pipeline");
      } else {
        const data = await res.json().catch(() => ({}));
        setRunMessage(`Error: ${data.detail ?? res.statusText}`);
      }
    } catch (err) {
      setRunMessage("Error: Could not reach the backend.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-800">
          <span className="text-lg font-bold text-indigo-400 tracking-tight">
            DataPipeline
          </span>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-800 text-xs text-gray-600">
          v1.0.0
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <h1 className="text-xl font-semibold text-gray-100">
            Data Pipeline Dashboard
          </h1>
          <div className="flex items-center gap-3">
            {runMessage && (
              <span
                className={`text-sm px-3 py-1 rounded-full ${
                  runMessage.startsWith("Error")
                    ? "bg-red-900/50 text-red-300"
                    : "bg-green-900/50 text-green-300"
                }`}
              >
                {runMessage}
              </span>
            )}
            <button
              onClick={handleRunPipeline}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Play size={14} />
              {running ? "Running..." : "Run Pipeline"}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === "dashboard" && <MetricsDashboard />}
          {activeTab === "pipeline" && <PipelineControl />}
          {activeTab === "lineage" && <LineageGraph />}
          {activeTab === "history" && <PipelineHistory />}
        </main>
      </div>
    </div>
  );
}
