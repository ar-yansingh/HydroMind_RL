from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from backend.api.websocket import router as websocket_router

from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="HydroMind Telemetry Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(websocket_router)

# Mount the React frontend 'dist' folder to the root
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {"status": "ok", "message": "HydroMind Digital Twin is Online (No Frontend dist found)"}

if __name__ == "__main__":
    print(">>> Launching Modular HydroMind Telemetry Server on http://localhost:8000")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
