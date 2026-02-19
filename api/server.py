from fastapi import FastAPI, HTTPException
from llama_cpp import Llama
from huggingface_hub import hf_hub_download
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Download the model from Hugging Face (only on server startup)
model_path = "unsloth.Q4_K_M.gguf"
if not os.path.exists(model_path):
    hf_hub_download(
        repo_id="yashmahe2018/fire-detection-data",
        filename="unsloth.Q4_K_M.gguf",
        local_dir="."
    )

# Load the model
llm = Llama(model_path=model_path, n_ctx=2048)

@app.post("/fire-score")
async def get_fire_score(data: dict):
    try:
        location = data["location"]
        temperature = data["temperature"]
        humidity = data["humidity"]
        rain = data["rain"]
        wind = data["wind"]

        # Create a prompt that explicitly asks for a single number
        prompt = f"""You are an AI model designed to assess fire probability based on environmental factors. Given inputs such as location, temperature, humidity, wind speed, and precipitation levels, analyze the risk and provide a single number between 0-90, emphasizing the risk of fire. Respond ONLY with a single number in the following format {{FIRE_SCORE_NUMBER}}. Do not have any other new lines or messages in the response.

Weather conditions:
Location: {location}
Temperature: {temperature}°F
Humidity: {humidity}%
Rain: {rain} inches
Wind: {wind} mph"""

        # Generate response with deterministic parameters
        response = llm(prompt, max_tokens=150, temperature=1.0, top_p=0.1)
        score = response["choices"][0]["text"].strip()
        return {"score": score}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
