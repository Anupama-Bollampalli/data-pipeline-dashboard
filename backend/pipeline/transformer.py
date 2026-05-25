import pandas as pd
import numpy as np
from typing import Dict, Any

from pipeline.quality import compute_quality


def transform(
    orders_df: pd.DataFrame,
    products_df: pd.DataFrame,
    customers_df: pd.DataFrame,
) -> Dict[str, Any]:
    """Full transformation pipeline: validate → clean → enrich → aggregate."""

    # ------------------------------------------------------------------ #
    # 1. VALIDATE                                                          #
    # ------------------------------------------------------------------ #
    violations = []

    # Null checks
    null_qty = orders_df["quantity"].isna().sum()
    if null_qty > 0:
        violations.append({
            "type": "null_values",
            "column": "quantity",
            "count": int(null_qty),
            "description": f"{null_qty} null values in quantity column",
        })

    null_price = orders_df["unit_price"].isna().sum()
    if null_price > 0:
        violations.append({
            "type": "null_values",
            "column": "unit_price",
            "count": int(null_price),
            "description": f"{null_price} null values in unit_price column",
        })

    # Duplicate order_ids
    dup_orders = orders_df.duplicated(subset=["order_id"]).sum()
    if dup_orders > 0:
        violations.append({
            "type": "duplicate_records",
            "column": "order_id",
            "count": int(dup_orders),
            "description": f"{dup_orders} duplicate order_id values",
        })

    # Negative prices
    neg_prices = (orders_df["unit_price"] < 0).sum()
    if neg_prices > 0:
        violations.append({
            "type": "invalid_values",
            "column": "unit_price",
            "count": int(neg_prices),
            "description": f"{neg_prices} negative unit_price values",
        })

    # Referential integrity: orders → products
    valid_pids = set(products_df["product_id"].unique())
    invalid_pids = (~orders_df["product_id"].isin(valid_pids)).sum()
    if invalid_pids > 0:
        violations.append({
            "type": "referential_integrity",
            "column": "product_id",
            "count": int(invalid_pids),
            "description": f"{invalid_pids} orders reference non-existent product_ids",
        })

    # Referential integrity: orders → customers
    valid_cids = set(customers_df["customer_id"].unique())
    invalid_cids = (~orders_df["customer_id"].isin(valid_cids)).sum()
    if invalid_cids > 0:
        violations.append({
            "type": "referential_integrity",
            "column": "customer_id",
            "count": int(invalid_cids),
            "description": f"{invalid_cids} orders reference non-existent customer_ids",
        })

    # ------------------------------------------------------------------ #
    # 2. CLEAN                                                             #
    # ------------------------------------------------------------------ #
    df = orders_df.copy()

    # Fill null quantities with median
    median_qty = df["quantity"].median()
    df["quantity"] = df["quantity"].fillna(median_qty)

    # Deduplicate by order_id, keep first occurrence
    df = df.drop_duplicates(subset=["order_id"], keep="first")

    # Convert negative prices to absolute values
    df["unit_price"] = df["unit_price"].abs()

    # ------------------------------------------------------------------ #
    # 3. ENRICH                                                            #
    # ------------------------------------------------------------------ #
    # Revenue = quantity * unit_price
    df["revenue"] = df["quantity"] * df["unit_price"]

    # Join with products to get cost_price
    df = df.merge(
        products_df[["product_id", "cost_price", "name", "category"]],
        on="product_id",
        how="left",
    )

    # Profit margin = (revenue - cost) / revenue
    df["total_cost"] = df["quantity"] * df["cost_price"]
    df["profit_margin"] = np.where(
        df["revenue"] > 0,
        (df["revenue"] - df["total_cost"]) / df["revenue"],
        0.0,
    )

    # Order month
    df["order_date"] = pd.to_datetime(df["order_date"])
    df["order_month"] = df["order_date"].dt.to_period("M").astype(str)

    # Customer LTV = sum of revenue per customer
    customer_ltv = df.groupby("customer_id")["revenue"].sum().reset_index()
    customer_ltv.columns = ["customer_id", "customer_ltv"]
    df = df.merge(customer_ltv, on="customer_id", how="left")

    # ------------------------------------------------------------------ #
    # 4. AGGREGATE                                                         #
    # ------------------------------------------------------------------ #
    # Monthly revenue
    monthly_revenue = (
        df.groupby("order_month")
        .agg(total_revenue=("revenue", "sum"), order_count=("order_id", "count"))
        .reset_index()
        .sort_values("order_month")
    )

    # Customer segments
    ltv_per_customer = (
        df.groupby("customer_id")["revenue"].sum().reset_index()
    )
    ltv_per_customer.columns = ["customer_id", "total_revenue"]

    def segment(rev: float) -> str:
        if rev > 1000:
            return "VIP"
        elif rev >= 100:
            return "Regular"
        return "Occasional"

    ltv_per_customer["segment"] = ltv_per_customer["total_revenue"].apply(segment)

    customer_segments = (
        ltv_per_customer.groupby("segment")
        .agg(customer_count=("customer_id", "count"), avg_revenue=("total_revenue", "mean"))
        .reset_index()
    )

    # ------------------------------------------------------------------ #
    # 5. QUALITY REPORT                                                    #
    # ------------------------------------------------------------------ #
    quality_report = compute_quality(violations, df)

    return {
        "orders": df,
        "monthly_revenue": monthly_revenue,
        "customer_segments": customer_segments,
        "quality_report": quality_report,
    }
