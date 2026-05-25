
interface NodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  sublabel?: string;
  color: string;
  textColor?: string;
}

function Node({ x, y, width, height, label, sublabel, color, textColor = "#f3f4f6" }: NodeProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        ry={8}
        fill={color}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - (sublabel ? 8 : 0)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
        fontSize={13}
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        {label}
      </text>
      {sublabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.55)"
          fontSize={10}
          fontFamily="system-ui, sans-serif"
        >
          {sublabel}
        </text>
      )}
    </g>
  );
}

interface ArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
}

function Arrow({ x1, y1, x2, y2, label }: ArrowProps) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#6366f1"
        strokeWidth={2}
        markerEnd="url(#arrowhead)"
        strokeDasharray={label ? "6 3" : undefined}
      />
      {label && (
        <text
          x={mx}
          y={my - 8}
          textAnchor="middle"
          fill="#818cf8"
          fontSize={10}
          fontFamily="system-ui, sans-serif"
        >
          {label}
        </text>
      )}
    </g>
  );
}

export default function LineageGraph() {
  // Layout: horizontal pipeline, centered vertically
  // Canvas: 860 x 380
  const W = 110;
  const H = 52;
  const cy = 120; // vertical center for main pipeline
  const gap = 130;
  const startX = 40;

  // Source nodes (stacked vertically at x=startX)
  const srcX = startX;
  const srcY = [30, 98, 166];
  const srcLabels = ["raw_orders.csv", "raw_products.csv", "raw_customers.csv"];
  const srcColor = "#1e3a5f";

  // Pipeline stages
  const stages = [
    { label: "Extractor", sublabel: "generate CSVs", color: "#1e3a5f" },
    { label: "Validator", sublabel: "check quality", color: "#3b2a5e" },
    { label: "Transformer", sublabel: "clean + enrich", color: "#1a3a2f" },
    { label: "DuckDB", sublabel: "pipeline.db", color: "#2a3a1e" },
    { label: "FastAPI", sublabel: "REST API", color: "#3a2a1e" },
    { label: "Dashboard", sublabel: "React UI", color: "#1e2a3a" },
  ];

  const stageStartX = startX + W + 50;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-gray-100 mb-1">Data Lineage</h2>
      <p className="text-sm text-gray-400 mb-5">
        End-to-end data flow from source CSV files to the dashboard.
      </p>

      <div className="overflow-x-auto">
        <svg
          width="920"
          height="260"
          style={{ display: "block", minWidth: 860 }}
        >
          {/* Source CSV nodes */}
          {srcLabels.map((label, i) => (
            <Node
              key={label}
              x={srcX}
              y={srcY[i]}
              width={W}
              height={H}
              label={label}
              color={srcColor}
            />
          ))}

          {/* Arrows from sources to Extractor */}
          {srcLabels.map((_label, i) => (
            <Arrow
              key={i}
              x1={srcX + W}
              y1={srcY[i] + H / 2}
              x2={stageStartX}
              y2={cy + H / 2}
            />
          ))}

          {/* Pipeline stage nodes */}
          {stages.map((stage, i) => {
            const x = stageStartX + i * gap;
            return (
              <Node
                key={stage.label}
                x={x}
                y={cy}
                width={W}
                height={H}
                label={stage.label}
                sublabel={stage.sublabel}
                color={stage.color}
              />
            );
          })}

          {/* Arrows between pipeline stages */}
          {stages.slice(0, -1).map((stage, i) => {
            const x1 = stageStartX + i * gap + W;
            const x2 = stageStartX + (i + 1) * gap;
            const y = cy + H / 2;
            return (
              <Arrow key={stage.label} x1={x1} y1={y} x2={x2} y2={y} />
            );
          })}

          {/* Legend */}
          <g>
            <rect x={srcX} y={220} width={12} height={12} rx={2} fill={srcColor} />
            <text x={srcX + 18} y={231} fill="#9ca3af" fontSize={11} fontFamily="system-ui">
              Data Source
            </text>
            <rect x={srcX + 110} y={220} width={12} height={12} rx={2} fill="#1e3a5f" />
            <text x={srcX + 128} y={231} fill="#9ca3af" fontSize={11} fontFamily="system-ui">
              Processing Stage
            </text>
            <line x1={srcX + 270} y1={226} x2={srcX + 295} y2={226} stroke="#6366f1" strokeWidth={2} markerEnd="url(#arrowhead)" />
            <text x={srcX + 300} y={231} fill="#9ca3af" fontSize={11} fontFamily="system-ui">
              Data Flow
            </text>
          </g>
        </svg>
      </div>

      {/* Text description */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-400">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="font-medium text-gray-200 mb-1">Extract</p>
          <p>Generate 1,000 orders, 50 products, 200 customers as synthetic CSV data with intentional quality issues.</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="font-medium text-gray-200 mb-1">Validate &amp; Transform</p>
          <p>Check nulls, duplicates, negatives &amp; referential integrity. Clean and enrich with revenue, margins, LTV.</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="font-medium text-gray-200 mb-1">Load &amp; Serve</p>
          <p>Persist cleaned data and aggregates into DuckDB. Expose metrics via FastAPI for the React dashboard.</p>
        </div>
      </div>
    </div>
  );
}
