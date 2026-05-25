from typing import List, Optional, Any, Dict
from pydantic import BaseModel


# ── Quality ──────────────────────────────────────────────────────────────────

class QualityViolation(BaseModel):
    type: str
    column: str
    count: int
    description: str


class QualityReport(BaseModel):
    completeness: float
    uniqueness: float
    validity: float
    overall: float
    violations: List[Dict[str, Any]]
    row_count: int


# ── Pipeline Run ──────────────────────────────────────────────────────────────

class PipelineRunResult(BaseModel):
    run_id: int
    started_at: str
    finished_at: str
    status: str
    rows_processed: int
    duration_ms: int
    quality_score: float
    quality_report: Optional[QualityReport] = None


class PipelineRunRecord(BaseModel):
    run_id: int
    started_at: str
    finished_at: str
    status: str
    rows_processed: int
    duration_ms: int
    quality_score: float


# ── Metrics ───────────────────────────────────────────────────────────────────

class MetricsSummary(BaseModel):
    total_revenue: float
    order_count: int
    avg_order_value: float
    customer_count: int
    top_region: str


class MonthlyRevenuePoint(BaseModel):
    month: str
    total_revenue: float
    order_count: int


class TopProduct(BaseModel):
    product_id: int
    name: str
    category: str
    total_revenue: float
    order_count: int


# ── Health ────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str = "1.0.0"
