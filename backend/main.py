import os
from typing import List

import duckdb
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    HealthResponse,
    MetricsSummary,
    MonthlyRevenuePoint,
    PipelineRunRecord,
    PipelineRunResult,
    QualityReport,
    TopProduct,
)
from pipeline.extractor import extract
from pipeline.loader import load
from pipeline.transformer import transform

DB_PATH = "pipeline.db"

app = FastAPI(title="Data Pipeline Dashboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helpers ───────────────────────────────────────────────────────────────────


def _get_db() -> duckdb.DuckDBPyConnection:
    return duckdb.connect(DB_PATH)


def _db_exists() -> bool:
    if not os.path.exists(DB_PATH):
        return False
    try:
        con = _get_db()
        con.execute("SELECT 1 FROM pipeline_runs LIMIT 1")
        con.close()
        return True
    except Exception:
        return False


# ── Endpoints ─────────────────────────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok")


@app.post("/pipeline/run", response_model=PipelineRunResult)
def run_pipeline():
    """Run the full ETL pipeline: extract → transform → load."""
    try:
        # Extract
        paths = extract()
        orders_df = pd.read_csv(paths["orders"])
        products_df = pd.read_csv(paths["products"])
        customers_df = pd.read_csv(paths["customers"])

        # Transform
        result = transform(orders_df, products_df, customers_df)

        # Load
        run_stats = load(result)

        quality_report = QualityReport(**result["quality_report"])

        return PipelineRunResult(
            run_id=run_stats["run_id"],
            started_at=run_stats["started_at"],
            finished_at=run_stats["finished_at"],
            status=run_stats["status"],
            rows_processed=run_stats["rows_processed"],
            duration_ms=run_stats["duration_ms"],
            quality_score=run_stats["quality_score"],
            quality_report=quality_report,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/pipeline/runs", response_model=List[PipelineRunRecord])
def get_pipeline_runs():
    """Return list of past pipeline runs."""
    if not _db_exists():
        return []
    try:
        con = _get_db()
        rows = con.execute(
            "SELECT run_id, started_at, finished_at, status, rows_processed, duration_ms, quality_score "
            "FROM pipeline_runs ORDER BY run_id DESC LIMIT 100"
        ).fetchall()
        con.close()
        return [
            PipelineRunRecord(
                run_id=r[0],
                started_at=str(r[1]),
                finished_at=str(r[2]),
                status=r[3],
                rows_processed=r[4],
                duration_ms=r[5],
                quality_score=float(r[6]) if r[6] is not None else 0.0,
            )
            for r in rows
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/metrics/summary", response_model=MetricsSummary)
def metrics_summary():
    """Return high-level KPI metrics."""
    if not _db_exists():
        raise HTTPException(status_code=404, detail="No pipeline data. Run the pipeline first.")
    try:
        con = _get_db()

        total_rev = con.execute("SELECT COALESCE(SUM(revenue), 0) FROM orders").fetchone()[0]
        order_count = con.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
        avg_order_val = float(total_rev) / order_count if order_count else 0.0
        customer_count = con.execute("SELECT COUNT(DISTINCT customer_id) FROM orders").fetchone()[0]

        # Top region requires joining with customers table — fall back gracefully
        try:
            top_region_row = con.execute("""
                SELECT c.region, SUM(o.revenue) AS rev
                FROM orders o
                JOIN (
                    SELECT customer_id, region FROM read_csv_auto('./data/raw_customers.csv')
                ) c ON o.customer_id = c.customer_id
                GROUP BY c.region
                ORDER BY rev DESC
                LIMIT 1
            """).fetchone()
            top_region = top_region_row[0] if top_region_row else "N/A"
        except Exception:
            top_region = "N/A"

        con.close()

        return MetricsSummary(
            total_revenue=round(float(total_rev), 2),
            order_count=int(order_count),
            avg_order_value=round(avg_order_val, 2),
            customer_count=int(customer_count),
            top_region=top_region,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/metrics/monthly", response_model=List[MonthlyRevenuePoint])
def metrics_monthly():
    """Return monthly revenue time series."""
    if not _db_exists():
        raise HTTPException(status_code=404, detail="No pipeline data. Run the pipeline first.")
    try:
        con = _get_db()
        rows = con.execute(
            "SELECT order_month, total_revenue, order_count FROM monthly_revenue ORDER BY order_month"
        ).fetchall()
        con.close()
        return [
            MonthlyRevenuePoint(month=r[0], total_revenue=round(float(r[1]), 2), order_count=int(r[2]))
            for r in rows
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/metrics/top-products", response_model=List[TopProduct])
def metrics_top_products():
    """Return top 10 products by revenue."""
    if not _db_exists():
        raise HTTPException(status_code=404, detail="No pipeline data. Run the pipeline first.")
    try:
        con = _get_db()
        rows = con.execute("""
            SELECT product_id, name, category,
                   SUM(revenue) AS total_revenue,
                   COUNT(*) AS order_count
            FROM orders
            GROUP BY product_id, name, category
            ORDER BY total_revenue DESC
            LIMIT 10
        """).fetchall()
        con.close()
        return [
            TopProduct(
                product_id=int(r[0]),
                name=r[1] or "Unknown",
                category=r[2] or "Unknown",
                total_revenue=round(float(r[3]), 2),
                order_count=int(r[4]),
            )
            for r in rows
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/quality/report", response_model=QualityReport)
def quality_report():
    """Return the quality report from the latest pipeline run."""
    if not _db_exists():
        raise HTTPException(status_code=404, detail="No pipeline data. Run the pipeline first.")
    try:
        # Re-run quality computation from current DB state
        con = _get_db()
        order_count = con.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
        null_qty = con.execute("SELECT COUNT(*) FROM orders WHERE quantity IS NULL").fetchone()[0]
        dup_orders = con.execute(
            "SELECT COUNT(*) - COUNT(DISTINCT order_id) FROM orders"
        ).fetchone()[0]
        neg_prices = con.execute("SELECT COUNT(*) FROM orders WHERE unit_price < 0").fetchone()[0]
        con.close()

        violations = []
        if null_qty > 0:
            violations.append({"type": "null_values", "column": "quantity", "count": int(null_qty), "description": f"{null_qty} null quantity values"})
        if dup_orders > 0:
            violations.append({"type": "duplicate_records", "column": "order_id", "count": int(dup_orders), "description": f"{dup_orders} duplicate order_ids"})
        if neg_prices > 0:
            violations.append({"type": "invalid_values", "column": "unit_price", "count": int(neg_prices), "description": f"{neg_prices} negative prices"})

        total_cells = order_count * 7 if order_count else 1
        null_cells = null_qty
        completeness = max(0.0, (1.0 - null_cells / total_cells) * 100) if total_cells else 100.0
        uniqueness = min(100.0, ((order_count - dup_orders) / order_count * 100)) if order_count else 100.0
        validity = ((order_count - neg_prices) / order_count * 100) if order_count else 100.0
        overall = completeness * 0.4 + uniqueness * 0.3 + validity * 0.3

        return QualityReport(
            completeness=round(completeness, 2),
            uniqueness=round(uniqueness, 2),
            validity=round(validity, 2),
            overall=round(overall, 2),
            violations=violations,
            row_count=int(order_count),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
