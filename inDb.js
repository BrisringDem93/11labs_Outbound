import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

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
