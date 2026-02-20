FROM python:3.11-slim

WORKDIR /app

COPY backend-python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend-python . 

# Copia a pasta bpm para dentro do container
COPY bpm /bpm

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
