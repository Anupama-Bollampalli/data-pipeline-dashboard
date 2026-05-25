import os
import numpy as np
import pandas as pd

RANDOM_SEED = 42
DATA_DIR = "./data"


def extract() -> dict:
    """Generate synthetic e-commerce CSVs and return their paths."""
    os.makedirs(DATA_DIR, exist_ok=True)

    orders_path = os.path.join(DATA_DIR, "raw_orders.csv")
    products_path = os.path.join(DATA_DIR, "raw_products.csv")
    customers_path = os.path.join(DATA_DIR, "raw_customers.csv")

    rng = np.random.default_rng(RANDOM_SEED)

    # --- Products (50 rows) ---
    if not os.path.exists(products_path):
        categories = ["Electronics", "Clothing", "Books", "Food", "Sports", "Home"]
        product_names = {
            "Electronics": [
                "Wireless Headphones", "Bluetooth Speaker", "USB-C Hub", "Smart Watch",
                "Laptop Stand", "Mechanical Keyboard", "Webcam HD", "Monitor 27in",
                "Portable Charger", "Noise Cancelling Earbuds",
            ],
            "Clothing": [
                "Running Shoes", "Yoga Pants", "Winter Jacket", "Casual T-Shirt",
                "Denim Jeans", "Sports Hoodie", "Baseball Cap", "Wool Socks",
                "Leather Belt", "Swim Trunks",
            ],
            "Books": [
                "Data Engineering Fundamentals", "Clean Code", "Python Cookbook",
                "The Pragmatic Programmer", "Designing Data-Intensive Applications",
                "Machine Learning Yearning", "Deep Work", "Atomic Habits",
                "The DevOps Handbook", "Site Reliability Engineering",
            ],
            "Food": [
                "Organic Coffee Beans", "Green Tea Pack", "Protein Powder",
                "Mixed Nuts 500g", "Dark Chocolate Bar", "Granola Bars",
                "Olive Oil Extra Virgin", "Hot Sauce Collection",
            ],
            "Sports": [
                "Resistance Bands Set", "Foam Roller", "Jump Rope",
                "Water Bottle 1L", "Gym Gloves",
            ],
            "Home": [
                "Bamboo Cutting Board", "Air Purifier", "Desk Lamp LED",
                "Storage Organizer", "Scented Candle",
            ],
        }

        rows = []
        pid = 1
        for cat, names in product_names.items():
            for name in names:
                cost = round(float(rng.uniform(3.0, 200.0)), 2)
                list_price = round(cost * float(rng.uniform(1.2, 2.5)), 2)
                rows.append({
                    "product_id": pid,
                    "name": name,
                    "category": cat,
                    "cost_price": cost,
                    "list_price": list_price,
                })
                pid += 1

        products_df = pd.DataFrame(rows).head(50)
        products_df.to_csv(products_path, index=False)

    # --- Customers (200 rows) ---
    if not os.path.exists(customers_path):
        first_names = [
            "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael",
            "Linda", "William", "Barbara", "David", "Susan", "Richard", "Jessica",
            "Joseph", "Sarah", "Thomas", "Karen", "Charles", "Lisa", "Christopher",
            "Nancy", "Daniel", "Betty", "Matthew", "Margaret", "Anthony", "Sandra",
            "Mark", "Ashley", "Donald", "Dorothy", "Steven", "Kimberly", "Paul",
            "Emily", "Andrew", "Donna", "Joshua", "Michelle", "Kenneth", "Carol",
            "Kevin", "Amanda", "Brian", "Melissa", "George", "Deborah", "Timothy",
            "Stephanie",
        ]
        last_names = [
            "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
            "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
            "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
            "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
            "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
            "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green",
            "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
            "Carter", "Roberts",
        ]
        regions = ["North", "South", "East", "West", "Central"]

        customer_rows = []
        for cid in range(1, 201):
            fn = first_names[rng.integers(0, len(first_names))]
            ln = last_names[rng.integers(0, len(last_names))]
            full_name = f"{fn} {ln}"
            email = f"{fn.lower()}.{ln.lower()}{cid}@example.com"
            region = regions[rng.integers(0, len(regions))]
            signup_days_ago = int(rng.integers(30, 1500))
            signup_date = (
                pd.Timestamp("2025-05-25") - pd.Timedelta(days=signup_days_ago)
            ).strftime("%Y-%m-%d")
            customer_rows.append({
                "customer_id": cid,
                "name": full_name,
                "email": email,
                "region": region,
                "signup_date": signup_date,
            })

        customers_df = pd.DataFrame(customer_rows)
        customers_df.to_csv(customers_path, index=False)

    # --- Orders (1000 rows) ---
    if not os.path.exists(orders_path):
        n = 1000
        order_ids = list(range(1, n + 1))

        # Introduce ~5% duplicate order_ids (replace ~50 ids with earlier ones)
        dup_indices = rng.choice(range(50, n), size=50, replace=False)
        for idx in dup_indices:
            order_ids[idx] = int(rng.integers(1, 50))

        customer_ids = rng.integers(1, 201, size=n)
        product_ids = rng.integers(1, 51, size=n)

        # Quantities with ~5% nulls
        quantities = rng.integers(1, 11, size=n).astype(float)
        null_qty_idx = rng.choice(n, size=int(n * 0.05), replace=False)
        quantities[null_qty_idx] = np.nan

        # Unit prices with ~2% negatives
        unit_prices = np.round(rng.uniform(5.0, 500.0, size=n), 2)
        neg_price_idx = rng.choice(n, size=int(n * 0.02), replace=False)
        unit_prices[neg_price_idx] = -unit_prices[neg_price_idx]

        # Random dates between 2023-01-01 and 2025-05-25
        start_ts = pd.Timestamp("2023-01-01").value // 10**9
        end_ts = pd.Timestamp("2025-05-25").value // 10**9
        random_ts = rng.integers(start_ts, end_ts, size=n)
        order_dates = pd.to_datetime(random_ts, unit="s").strftime("%Y-%m-%d")

        statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
        status_weights = [0.10, 0.10, 0.20, 0.50, 0.10]
        order_statuses = rng.choice(statuses, size=n, p=status_weights)

        orders_df = pd.DataFrame({
            "order_id": order_ids,
            "customer_id": customer_ids,
            "product_id": product_ids,
            "quantity": quantities,
            "unit_price": unit_prices,
            "order_date": order_dates,
            "status": order_statuses,
        })
        orders_df.to_csv(orders_path, index=False)

    return {
        "orders": orders_path,
        "products": products_path,
        "customers": customers_path,
    }
