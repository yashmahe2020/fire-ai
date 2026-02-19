# Fire AI Backend

This is the Python backend for Fire AI, powered by FastAPI and a quantized Llama 3 model.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the server:
   ```bash
   python server.py
   ```
   
   The server will start on http://localhost:8000.
   It will automatically download the required model file (~500MB) on first run.

## API Endpoints

- `POST /fire-score`: Calculate fire risk score based on weather data.
- `GET /health`: Health check.

