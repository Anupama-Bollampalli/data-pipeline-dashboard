import pandas as pd
from typing import List, Dict, Any


def compute_quality(violations: List[Dict[str, Any]], df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute data quality metrics from validation violations and the cleaned DataFrame.

    Returns:
        {
            "completeness": float,   # 0-100
            "uniqueness": float,     # 0-100
            "validity": float,       # 0-100
            "overall": float,        # 0-100 weighted average
            "violations": [...],
            "row_count": int
        }
    """
    row_count = len(df)

    if row_count == 0:
        return {
            "completeness": 0.0,
            "uniqueness": 0.0,
            "validity": 0.0,
            "overall": 0.0,
            "violations": violations,
            "row_count": 0,
        }

    # --- Completeness: fraction of non-null cells across key columns ---
    key_cols = [c for c in ["order_id", "customer_id", "product_id", "quantity", "unit_price", "order_date", "status"] if c in df.columns]
    if key_cols:
        total_cells = row_count * len(key_cols)
        null_cells = df[key_cols].isna().sum().sum()
        completeness = max(0.0, (1.0 - null_cells / total_cells) * 100)
    else:
        completeness = 100.0

    # --- Uniqueness: fraction of unique order_ids ---
    if "order_id" in df.columns:
        unique_orders = df["order_id"].nunique()
        uniqueness = min(100.0, (unique_orders / row_count) * 100)
    else:
        uniqueness = 100.0

    # --- Validity: fraction of rows with valid (non-negative) unit_price ---
    if "unit_price" in df.columns:
        valid_price_count = (df["unit_price"] >= 0).sum()
        validity = (valid_price_count / row_count) * 100
    else:
        validity = 100.0

    # --- Overall: weighted average ---
    overall = completeness * 0.4 + uniqueness * 0.3 + validity * 0.3

    return {
        "completeness": round(completeness, 2),
        "uniqueness": round(uniqueness, 2),
        "validity": round(validity, 2),
        "overall": round(overall, 2),
        "violations": violations,
        "row_count": row_count,
    }
