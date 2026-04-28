FROM python:3.11-slim

# Chromium + ChromeDriver (sürüm uyumu garantili)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

# Root dışı kullanıcı — container escape'e karşı
RUN useradd -m -u 1000 -s /bin/bash appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Dosya sahipliğini kullanıcıya ver
COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 7860

# --no-new-privileges: setuid bit exploit engellemesi
CMD ["python", "-m", "uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "7860", \
     "--no-access-log"]
