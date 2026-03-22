import sqlite3
import os
import json
from datetime import datetime

# Setup DB Directory
DB_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "hydromind_telemetry.db")

def init_db():
    """Initializes the Time-Series SQLite Schema for telemetry persistence."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create the telemetry ticks table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS telemetry_ticks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            tick_step INTEGER,
            phase TEXT,
            pressure_m REAL,
            valve_pct REAL,
            leak_rate_lps REAL,
            economic_bleed REAL,
            ai_saved REAL,
            status TEXT,
            anomaly_node TEXT,
            ai_alert TEXT
        )
    ''')

    # Create table for AI decision logs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ai_decision_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            tick_step INTEGER,
            log_message TEXT
        )
    ''')
    
    conn.commit()
    conn.close()
    print(f">>> Local TSDB Initialized at {DB_PATH}")

def insert_telemetry_tick(payload):
    """Inserts a single simulated tick into the TSDB."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO telemetry_ticks (
                tick_step, phase, pressure_m, valve_pct, leak_rate_lps, 
                economic_bleed, ai_saved, status, anomaly_node, ai_alert
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            payload.get("step"),
            payload.get("phase"),
            payload.get("pressure_m"),
            payload.get("valve_pct"),
            payload.get("leak_rate_lps"),
            payload.get("economic_bleed"),
            payload.get("ai_saved"),
            payload.get("status"),
            payload.get("anomaly_node"),
            payload.get("ai_alert")
        ))
        
        # We only want to insert *new* AI logs, not the whole tail array every tick.
        # But for simplicity, we can let the caller handle individual AI logs, 
        # or we just store the array as a JSON dump if we need to.
        # Here we just dump the array into the row if needed, but the schema uses ai_decision_logs.
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Db Error: {e}")

def insert_ai_log(tick_step, log_message):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('INSERT INTO ai_decision_logs (tick_step, log_message) VALUES (?, ?)', (tick_step, log_message))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Db Error: {e}")

# Initialize upon import
init_db()
