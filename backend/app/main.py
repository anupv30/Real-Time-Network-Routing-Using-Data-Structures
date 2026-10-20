import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import router as api_router
from app.api.websocket import ws_manager
from app.simulation.engine import engine
from app.persistence.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing SQLite database...")
    await init_db()
    
    # Wire engine broadcast to WebSocket manager
    engine.set_broadcast_callback(ws_manager.broadcast)
    logger.info("Simulation engine broadcast callback wired to WebSocket manager.")
    
    yield
    
    # Shutdown
    logger.info("Shutting down simulation engine...")
    engine.stop()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Real-Time Network Packet Routing Simulator with Dijkstra's Algorithm, Queue Scheduling, Dynamic Congestion, and Failure Simulation.",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API
app.include_router(api_router)

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    # Immediately synchronize initial state
    try:
        initial_state = engine.get_state_snapshot()
        await websocket.send_text(json.dumps(initial_state))
    except Exception as e:
        logger.error(f"Error sending initial state to WS client: {e}")

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                action = msg.get("action")
                if action == "start":
                    engine.start()
                elif action == "pause":
                    engine.pause()
                elif action == "resume":
                    engine.resume()
                elif action == "stop":
                    engine.stop()
                elif action == "reset":
                    engine.reset()
                elif action == "step":
                    engine.step()
                elif action == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
