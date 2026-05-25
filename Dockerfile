FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Backend stage ─────────────────────────────────────────────────────────────
FROM python:3.14-slim

WORKDIR /app

# Install backend deps
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./

# Copy built frontend into a static directory
COPY --from=frontend-builder /app/frontend/dist ./static

# Create data directory
RUN mkdir -p data

EXPOSE 7862

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7862"]
