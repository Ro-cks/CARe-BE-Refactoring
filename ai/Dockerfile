FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libxcb1 \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*


COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# DeepFace Facenet512 모델을 HuggingFace 미러에서 사전 다운로드
RUN mkdir -p /root/.deepface/weights && \
    curl -fSL -o /root/.deepface/weights/facenet512_weights.h5 \
    "https://huggingface.co/WePrompt/deepface-weights/resolve/main/facenet512_weights.h5"

COPY . .


EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
