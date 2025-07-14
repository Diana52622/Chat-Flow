import pool from '../db';
import { Session } from '../models/session';

export async function createSession(slot_state: any = {}): Promise<Session> {
  const result = await pool.query(
    'INSERT INTO dialog_sessions (slot_state) VALUES ($1) RETURNING *',
    [JSON.stringify(slot_state)]
  );
  return result.rows[0];
}

export async function getSessionById(id: number): Promise<Session | null> {
  const result = await pool.query('SELECT * FROM dialog_sessions WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function updateSession(id: number, slot_state: any): Promise<Session | null> {
  console.log('[updateSession] id:', id, 'slot_state:', slot_state);
  const result = await pool.query(
    'UPDATE dialog_sessions SET slot_state = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [JSON.stringify(slot_state), id]
  );
  console.log('[updateSession] result:', result.rows[0]);
  return result.rows[0] || null;
}

export async function deactivateSession(id: number): Promise<void> {
  await pool.query('UPDATE dialog_sessions SET is_active = FALSE WHERE id = $1', [id]);
}
