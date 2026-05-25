# Data Pipeline Dashboard

End-to-end data engineering pipeline: ingest synthetic e-commerce data → validate → transform → load into DuckDB → REST API → React dashboard.

## Architecture

```
CSV Sources          Extract          Validate/Transform       Load            Serve
─────────────────────────────────────────────────────────────────────────────────────
raw_orders.csv   →
raw_products.csv → → Extractor → Validator → Transformer → DuckDB → FastAPI → React
raw_customers.csv →
```

## Concepts Map

| This Project        | Cloud Equivalent                         |
|---------------------|------------------------------------------|
| DuckDB              | Snowflake / BigQuery                     |
| Pandas transforms   | dbt models                               |
| ETL pipeline        | Azure Data Factory / Databricks          |
| Quality checks      | Great Expectations                       |
| FastAPI             | AWS API Gateway / Azure API Management   |
| React dashboard     | Power BI / Tableau (custom)              |

## Tech Stack

**Backend**
- Python 3.11+
- FastAPI (REST API framework)
- Pandas (data transformation)
- NumPy (numerical operations)
- DuckDB (embedded analytical database)
- Pydantic (data validation / API models)
- Uvicorn (ASGI server)

**Frontend**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (utility-first styling)
- Recharts (charting)
- Lucide React (icons)

## Setup & Running

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
# API available at http://localhost:8002
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Dev server at http://localhost:5173/data-pipeline-dashboard/
```

### Run the pipeline

```bash
curl -X POST http://localhost:8002/pipeline/run
```

Or click the **Run Pipeline** button in the dashboard.

## API Endpoints

| Method | Path                  | Description                        |
|--------|-----------------------|------------------------------------|
| GET    | /health               | Health check                       |
| POST   | /pipeline/run         | Execute full ETL                   |
| GET    | /pipeline/runs        | List past pipeline runs            |
| GET    | /metrics/summary      | KPI summary                        |
| GET    | /metrics/monthly      | Monthly revenue time series        |
| GET    | /metrics/top-products | Top 10 products by revenue         |
| GET    | /quality/report       | Latest data quality report         |

## Docker

```bash
docker build -t data-pipeline-dashboard .
docker run -p 7862:7862 data-pipeline-dashboard
```
