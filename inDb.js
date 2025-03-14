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

  const createResultsCallsQuery = `
    CREATE TABLE IF NOT EXISTS results_calls (
      id SERIAL PRIMARY KEY,
      id_conversation TEXT NOT NULL,
      call_successful BOOLEAN ,
      transcript_summary TEXT,
      timestamp TIMESTAMP DEFAULT NOW(),
      secretary BOOLEAN DEFAULT FALSE
    )
  `;

  const createAiTasksQuery = `
    CREATE TABLE IF NOT EXISTS ai_tasks (
      id SERIAL PRIMARY KEY,
      id_keap TEXT UNIQUE NOT NULL,
      task_type TEXT NOT NULL,
      due_date TIMESTAMP,
      done BOOLEAN DEFAULT FALSE
)
`; 

    const createAiRequestCalls = `
    CREATE TABLE IF NOT EXISTS aiRequestCalls (
      id SERIAL PRIMARY KEY,
      id_keap TEXT NOT NULL,
      call_sid TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT NOW(),
      checked BOOLEAN DEFAULT FALSE
    )
    `; 

    const createTaskAttemps = `
    CREATE TABLE IF NOT EXISTS taskAttemps (
      id_keap TEXT NOT NULL PRIMARY KEY,
      attempts INTEGER DEFAULT 1,
      updated TIMESTAMP DEFAULT NOW()
    )
    `; 



  try {
    await pool.query(createElevenLabsLogsQuery);
    console.log('[DB] Table elevenlabs_logs verified/created successfully.');

    await pool.query(createAiOutboundLogsQuery);
    console.log('[DB] Table ai_outbound_logs verified/created successfully.');

    await pool.query(createResultsCallsQuery);
    console.log('[DB] Table results_calls verified/created successfully.');
    
    await pool.query(createAiTasksQuery);
    console.log('[DB] Table ai_tasks verified/created successfully.');

    await pool.query(createAiRequestCalls);
    console.log('[DB] Table AiRequestCalls verified/created successfully.');


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


export async function logCallResult(idConversation, callSuccessful, transcriptSummary) {
  try {
    const query = `
      INSERT INTO results_calls (id_conversation, call_successful, transcript_summary, timestamp)
      VALUES ($1, $2, $3, NOW())
    `;
    await pool.query(query, [idConversation, callSuccessful, transcriptSummary]);
    console.log('[DB] Call result logged successfully.');
  } catch (error) {
    console.error('[DB] Error logging call result:', error);
  }
}


export { pool };
