FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for compiling some Python packages (e.g., NumPy/PyG/SciPy)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files
COPY . .

# Expose the FastAPI port
EXPOSE 8000

# Start the inference server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
