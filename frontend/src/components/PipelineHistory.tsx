import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

interface PipelineRun {
  run_id: number;
  started_at: string;
  finished_at: string;
  status: string;
  rows_processed: number;
  duration_ms: number;
  quality_score: number;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/40 text-green-300">
        <CheckCircle size={10} />
        success
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/40 text-red-300">
        <XCircle size={10} />
        failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-900/40 text-yellow-300">
      <Clock size={10} />
      {status}
    </span>
  );
}

function fmtDate(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

export default function PipelineHistory() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pipeline/runs");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRuns(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Pipeline Run History</h2>
          <p className="text-sm text-gray-400 mt-0.5">All past pipeline executions</p>
        </div>
        <button
          onClick={fetchRuns}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="text-gray-400 text-sm">Loading history...</div>
      )}

      {error && (
        <div className="text-red-400 text-sm">Error: {error}</div>
      )}

      {!loading && !error && runs.length === 0 && (
        <div className="text-gray-500 text-sm">
          No runs yet. Click "Run Pipeline" to start.
        </div>
      )}

      {!loading && !error && runs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 px-3 text-gray-400 font-medium">Run ID</th>
                <th className="text-left py-2 px-3 text-gray-400 font-medium">Started At</th>
                <th className="text-left py-2 px-3 text-gray-400 font-medium">Status</th>
                <th className="text-right py-2 px-3 text-gray-400 font-medium">Rows</th>
                <th className="text-right py-2 px-3 text-gray-400 font-medium">Duration</th>
                <th className="text-right py-2 px-3 text-gray-400 font-medium">Quality</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.run_id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="py-2.5 px-3 text-gray-300 font-mono">#{run.run_id}</td>
                  <td className="py-2.5 px-3 text-gray-300">{fmtDate(run.started_at)}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-300">
                    {run.rows_processed.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-300">
                    {run.duration_ms}ms
                  </td>
                  <td className={`py-2.5 px-3 text-right font-semibold ${scoreColor(run.quality_score)}`}>
                    {run.quality_score.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
