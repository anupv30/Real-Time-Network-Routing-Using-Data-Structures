from pydantic import BaseModel
import os

class Settings(BaseModel):
    APP_NAME: str = "Real-Time Network Packet Routing Simulator"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DATABASE_PATH: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "simulator.db")
    
    # Simulation defaults
    DEFAULT_TICK_RATE_MS: int = 50  # 50ms per tick
    DEFAULT_SPEED_MULTIPLIER: float = 1.0
    DEFAULT_QUEUE_CAPACITY: int = 15
    DEFAULT_PROCESSING_DELAY_MS: float = 30.0
    DEFAULT_LINK_LATENCY_MS: float = 80.0
    DEFAULT_LINK_BANDWIDTH_MBPS: float = 100.0

settings = Settings()
