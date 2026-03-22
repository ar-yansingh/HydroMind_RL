# --- Stage 1: Build Frontend ---
FROM node:18-slim as build-stage
WORKDIR /app/frontend
COPY command-center/package*.json ./
RUN npm install
COPY command-center/ ./
RUN npm run build

# --- Stage 2: Final Backend Image ---
FROM python:3.10-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application files
COPY . .

# Copy built frontend from stage 1
COPY --from=build-stage /app/frontend/dist ./dist

# Expose the FastAPI port
EXPOSE 8000

# Start the uvicorn server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
