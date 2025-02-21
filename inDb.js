import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

async function initializeDatabase() {
  const query = `
    CREATE TABLE IF NOT EXISTS elevenlabs_logs (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMP NOT NULL,
      raw_data TEXT NOT NULL
    )
  `;
  try {
    await pool.query(query);
    console.log('[DB] Tabella elevenlabs_logs verificata/creata con successo.');
  } catch (error) {
    console.error('[DB] Errore durante l\'inizializzazione della tabella:', error);
  }
}

initializeDatabase();

export async function logElevenLabsData(data) {
  try {
    const query = `
      INSERT INTO elevenlabs_logs (timestamp, raw_data)
      VALUES (NOW(), $1)
    `;
    await pool.query(query, [JSON.stringify(data)]);
    console.log('[DB] Dati salvati con successo.');
  } catch (error) {
    console.error('[DB] Errore durante il salvataggio:', error);
  }
}

export { pool };
