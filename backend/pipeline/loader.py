import os
import time
import datetime
import duckdb
import pandas as pd
from typing import Dict, Any

DB_PATH = "pipeline.db"


def _get_connection():
    return duckdb.connect(DB_PATH)


def _ensure_schema(con: duckdb.DuckDBPyConnection):
    con.execute("""
        CREATE TABLE IF NOT EXISTS pipeline_runs (
            run_id      INTEGER PRIMARY KEY,
            started_at  TIMESTAMP,
            finished_at TIMESTAMP,
            status      VARCHAR,
            rows_processed INTEGER,
            duration_ms INTEGER,
            quality_score DOUBLE,
            notes       VARCHAR
        )
    """)

    con.execute("""
        CREATE SEQUENCE IF NOT EXISTS pipeline_runs_seq START 1
    """)

    con.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            order_id      INTEGER,
            customer_id   INTEGER,
            product_id    INTEGER,
            quantity      DOUBLE,
            unit_price    DOUBLE,
            order_date    DATE,
            status        VARCHAR,
            revenue       DOUBLE,
            cost_price    DOUBLE,
            name          VARCHAR,
            category      VARCHAR,
            total_cost    DOUBLE,
            profit_margin DOUBLE,
            order_month   VARCHAR,
            customer_ltv  DOUBLE
        )
    """)

    con.execute("""
        CREATE TABLE IF NOT EXISTS monthly_revenue (
            order_month   VARCHAR,
            total_revenue DOUBLE,
            order_count   INTEGER
        )
    """)

    con.execute("""
        CREATE TABLE IF NOT EXISTS customer_segments (
            segment        VARCHAR,
            customer_count INTEGER,
            avg_revenue    DOUBLE
        )
    """)


def load(data: Dict[str, Any]) -> Dict[str, Any]:
    """Load transformed data into DuckDB and record a pipeline run."""
    started_at = datetime.datetime.utcnow()
    t0 = time.time()

    orders_df: pd.DataFrame = data["orders"]
    monthly_revenue_df: pd.DataFrame = data["monthly_revenue"]
    customer_segments_df: pd.DataFrame = data["customer_segments"]
    quality_report: dict = data.get("quality_report", {})

    con = _get_connection()
    _ensure_schema(con)

    # Truncate and reload dimension/fact tables
    con.execute("DELETE FROM orders")
    con.execute("DELETE FROM monthly_revenue")
    con.execute("DELETE FROM customer_segments")

    con.register("orders_tmp", orders_df)
    con.execute("""
        INSERT INTO orders
        SELECT
            order_id, customer_id, product_id, quantity, unit_price,
            TRY_CAST(order_date AS DATE),
            status, revenue, cost_price, name, category,
            total_cost, profit_margin, order_month, customer_ltv
        FROM orders_tmp
    """)

    con.register("monthly_revenue_tmp", monthly_revenue_df)
    con.execute("INSERT INTO monthly_revenue SELECT * FROM monthly_revenue_tmp")

    con.register("customer_segments_tmp", customer_segments_df)
    con.execute("INSERT INTO customer_segments SELECT * FROM customer_segments_tmp")

    finished_at = datetime.datetime.utcnow()
    duration_ms = int((time.time() - t0) * 1000)
    rows_processed = len(orders_df)
    quality_score = quality_report.get("overall", 0.0)

    # Insert pipeline run record
    con.execute("""
        INSERT INTO pipeline_runs (run_id, started_at, finished_at, status, rows_processed, duration_ms, quality_score, notes)
        VALUES (nextval('pipeline_runs_seq'), ?, ?, ?, ?, ?, ?, ?)
    """, [started_at, finished_at, "success", rows_processed, duration_ms, quality_score, "ETL run completed"])

    run_id_row = con.execute("SELECT MAX(run_id) FROM pipeline_runs").fetchone()
    run_id = run_id_row[0] if run_id_row else 0

    con.close()

    return {
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "status": "success",
        "rows_processed": rows_processed,
        "duration_ms": duration_ms,
        "quality_score": quality_score,
    }
