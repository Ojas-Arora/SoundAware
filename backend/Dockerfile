FROM python:3.11-slim

# Avoid interactive apt prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend project files to image
COPY . .

# Install Python dependencies
RUN python -m pip install --upgrade pip setuptools wheel
RUN pip install -r requirements.txt

# Expose port
ENV PORT=10000
EXPOSE 10000

# Start the server using gunicorn
# app:create_app() --> means create_app() is inside app.py
CMD ["gunicorn", "app:create_app()", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--timeout", "200"]
