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
  const createElevenLabsLogsQuery  = `
    CREATE TABLE IF NOT EXISTS elevenlabs_logs (
      id SERIAL PRIMARY KEY,
      raw_data TEXT NOT NULL,
      el_id_conversation TEXT,
      id_keap TEXT,
      type TEXT,
      timestamp TIMESTAMP DEFAULT NOW()
    )
  `;

  // Query to create the ai_outbound_logs table
  const createAiOutboundLogsQuery = `
    CREATE TABLE IF NOT EXISTS ai_outbound_logs (
      id SERIAL PRIMARY KEY,
      stream_sid TEXT NOT NULL,
      call_sid TEXT NOT NULL,
      id_keap TEXT,
      eleven_agent TEXT,
      el_id_conversation TEXT,
      timestamp TIMESTAMP DEFAULT NOW()
    )
  `;

  try {
    await pool.query(createElevenLabsLogsQuery);
    console.log('[DB] Table elevenlabs_logs verified/created successfully.');

    await pool.query(createAiOutboundLogsQuery);
    console.log('[DB] Table ai_outbound_logs verified/created successfully.');
  } catch (error) {
    console.error('[DB] Error during table initialization:', error);
  }
}

initializeDatabase();

export async function logElevenLabsData(data, elIdConversation, idKeap, type) {
  try {
    const query = `
      INSERT INTO elevenlabs_logs (raw_data, el_id_conversation, id_keap, type, timestamp)
      VALUES ($1, $2, $3, $4, NOW())
    `;
    await pool.query(query, [JSON.stringify(data), elIdConversation, idKeap, type]);
    console.log('[DB] Data saved successfully.');
  } catch (error) {
    console.error('[DB] Error saving data:', error);
  }
}

export async function logOutboundCall(streamSid, callSid, idKeap, elevenAgent, elIdConversation) {
  try {
    const query = `
      INSERT INTO ai_outbound_logs (stream_sid, call_sid, id_keap, eleven_agent, el_id_conversation)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(query, [streamSid, callSid, idKeap, elevenAgent, elIdConversation]);

    console.log('[DB] Outbound call logged successfully.');
  } catch (error) {
    console.error('[DB] Error logging outbound call:', error);
  }
}

export { pool };
