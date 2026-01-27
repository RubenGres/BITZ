FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/history /app/history/data /app/history/images /app/static /app/templates

CMD ["gunicorn", "--bind", "unix:/app/socket/gunicorn.sock", "--workers", "4", "--threads", "2", "--timeout", "120", "app:app"]
