import json
import os
import aiosqlite
from typing import List, Optional, Dict, Any
from app.config import settings
from app.models.graph import NetworkTopology

async def init_db():
    """Initializes the SQLite database tables."""
    os.makedirs(os.path.dirname(settings.DATABASE_PATH), exist_ok=True)
    async with aiosqlite.connect(settings.DATABASE_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS topologies (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                data_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS simulation_history (
                id TEXT PRIMARY KEY,
                topology_name TEXT NOT NULL,
                packets_generated INTEGER,
                packets_delivered INTEGER,
                packets_dropped INTEGER,
                avg_latency_ms REAL,
                throughput_pps REAL,
                duration_sec REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()

async def save_topology_to_db(topology: NetworkTopology) -> bool:
    try:
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            await db.execute(
                """
                INSERT OR REPLACE INTO topologies (id, name, description, data_json)
                VALUES (?, ?, ?, ?)
                """,
                (topology.id, topology.name, topology.description, topology.model_dump_json())
            )
            await db.commit()
            return True
    except Exception as e:
        print(f"Error saving topology to DB: {e}")
        return False

async def get_topology_from_db(topology_id: str) -> Optional[NetworkTopology]:
    try:
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            async with db.execute("SELECT data_json FROM topologies WHERE id = ?", (topology_id,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    data = json.loads(row[0])
                    return NetworkTopology.model_validate(data)
    except Exception as e:
        print(f"Error fetching topology from DB: {e}")
    return None

async def list_topologies_from_db() -> List[Dict[str, Any]]:
    try:
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            async with db.execute("SELECT id, name, description, created_at FROM topologies ORDER BY created_at DESC") as cursor:
                rows = await cursor.fetchall()
                return [{"id": r[0], "name": r[1], "description": r[2], "created_at": r[3]} for r in rows]
    except Exception as e:
        print(f"Error listing topologies from DB: {e}")
        return []

async def delete_topology_from_db(topology_id: str) -> bool:
    try:
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            await db.execute("DELETE FROM topologies WHERE id = ?", (topology_id,))
            await db.commit()
            return True
    except Exception as e:
        print(f"Error deleting topology from DB: {e}")
        return False

async def save_simulation_history(record: Dict[str, Any]) -> bool:
    try:
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            await db.execute(
                """
                INSERT INTO simulation_history 
                (id, topology_name, packets_generated, packets_delivered, packets_dropped, avg_latency_ms, throughput_pps, duration_sec)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.get("id"),
                    record.get("topology_name", "Unknown"),
                    record.get("packets_generated", 0),
                    record.get("packets_delivered", 0),
                    record.get("packets_dropped", 0),
                    record.get("avg_latency_ms", 0.0),
                    record.get("throughput_pps", 0.0),
                    record.get("duration_sec", 0.0)
                )
            )
            await db.commit()
            return True
    except Exception as e:
        print(f"Error saving history to DB: {e}")
        return False

async def list_simulation_history() -> List[Dict[str, Any]]:
    try:
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            async with db.execute(
                """
                SELECT id, topology_name, packets_generated, packets_delivered, packets_dropped, 
                       avg_latency_ms, throughput_pps, duration_sec, created_at 
                FROM simulation_history ORDER BY created_at DESC LIMIT 50
                """
            ) as cursor:
                rows = await cursor.fetchall()
                return [
                    {
                        "id": r[0],
                        "topology_name": r[1],
                        "packets_generated": r[2],
                        "packets_delivered": r[3],
                        "packets_dropped": r[4],
                        "avg_latency_ms": r[5],
                        "throughput_pps": r[6],
                        "duration_sec": r[7],
                        "created_at": r[8]
                    }
                    for r in rows
                ]
    except Exception as e:
        print(f"Error listing history from DB: {e}")
        return []
