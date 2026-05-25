import { useEffect, useState } from "react";
import { Play, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface QualityReport {
  completeness: number;
  uniqueness: number;
  validity: number;
  overall: number;
  violations: Array<{
    type: string;
    column: string;
    count: number;
    description: string;
  }>;
  row_count: number;
}

interface RunResult {
  run_id: number;
  started_at: string;
  status: string;
  rows_processed: number;
  duration_ms: number;
  quality_score: number;
  quality_report?: QualityReport;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

interface MetricBarProps {
  label: string;
  value: number;
}

function MetricBar({ label, value }: MetricBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className={`font-semibold ${scoreColor(value)}`}>
          {value.toFixed(1)}%
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${scoreBg(value)}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

const API = import.meta.env.VITE_API_URL ?? ''

export default function PipelineControl() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [quality, setQuality] = useState<QualityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch latest quality on mount
  useEffect(() => {
    fetch(`${API}/quality/report`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setQuality(d); })
      .catch(() => {});
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`${API}/pipeline/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail ?? res.statusText);
      }
      setResult(data);
      if (data.quality_report) setQuality(data.quality_report);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  const displayQuality = result?.quality_report ?? quality;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Run button + status */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Pipeline Execution</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Runs Extract → Transform → Load for all e-commerce data
            </p>
          </div>
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            <Play size={16} />
            {running ? "Running…" : "Run Pipeline"}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-900/20 border border-red-700 rounded-lg p-4">
            <XCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {result && !error && (
          <div className="flex items-start gap-3 bg-green-900/20 border border-green-700 rounded-lg p-4">
            <CheckCircle size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-300 space-y-0.5">
              <p className="font-semibold">Run #{result.run_id} completed</p>
              <p>
                {result.rows_processed.toLocaleString()} rows processed in{" "}
                {result.duration_ms}ms
              </p>
              <p>Quality score: {result.quality_score.toFixed(1)}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Data Quality Panel */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Data Quality</h2>

        {!displayQuality ? (
          <p className="text-gray-500 text-sm">
            Run the pipeline to see quality metrics.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Overall score */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p
                  className={`text-6xl font-bold ${scoreColor(displayQuality.overall)}`}
                >
                  {displayQuality.overall.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Overall Score</p>
              </div>
              <div className="flex-1 space-y-3">
                <MetricBar label="Completeness" value={displayQuality.completeness} />
                <MetricBar label="Uniqueness" value={displayQuality.uniqueness} />
                <MetricBar label="Validity" value={displayQuality.validity} />
              </div>
            </div>

            <div className="text-xs text-gray-500">
              {displayQuality.row_count.toLocaleString()} rows evaluated
            </div>

            {/* Violations */}
            {displayQuality.violations.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">
                  Violations ({displayQuality.violations.length})
                </h3>
                <div className="space-y-2">
                  {displayQuality.violations.map((v, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 bg-yellow-900/10 border border-yellow-800/40 rounded-lg px-4 py-2.5"
                    >
                      <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium text-yellow-300 capitalize">
                          {v.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-gray-400 ml-1">({v.column})</span>
                        <span className="text-gray-400 ml-1">— {v.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle size={14} />
                No violations detected
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
