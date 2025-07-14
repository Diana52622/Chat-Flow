import { Request, Response } from 'express';
import pool from '../db';
import { getMissingSlot, getSlotQuestion, isAllSlotsFilled } from '../services/dialogService';
import { DialogSlotState } from '../models/dialogSession';
import { updateSession } from '../services/sessionService';
import { parseSlotsFromMessage } from '../parsers/slotParser';
import { confirmationHandler } from '../handlers/confirmationHandler';
import { slotQuestionHandler } from '../handlers/slotQuestionHandler';
import { correctionHandler } from '../handlers/correctionHandler';
import { fallbackHandler } from '../handlers/fallbackHandler';
import { cityConfirmationHandler } from '../handlers/cityConfirmationHandler';

export const dialogHandler = async (req: Request, res: Response) => {
  const { session_id, message } = req.body;

  let session;
  if (session_id) {
    const result = await pool.query('SELECT * FROM dialog_sessions WHERE id = $1 AND is_active = TRUE', [session_id]);
    session = result.rows[0];
  }
  if (!session) {
    const slot_state: DialogSlotState = {};
    const insert = await pool.query('INSERT INTO dialog_sessions (slot_state) VALUES ($1) RETURNING *', [JSON.stringify(slot_state)]);
    session = insert.rows[0];
  }
  let slot_state: DialogSlotState = session.slot_state || {};

  if (["начать заново", "restart", "сброс"].includes(message.trim().toLowerCase())) {
    slot_state = {};
    await updateSession(session.id, slot_state);
    const nextSlot = getMissingSlot(slot_state);
    return res.json({
      session_id: session.id,
      response: nextSlot ? getSlotQuestion(nextSlot) : 'Пожалуйста, опишите ваш запрос для начала бронирования.',
      all_filled: false
    });
  }

  const missingSlot = getMissingSlot(slot_state);
  const parsed = parseSlotsFromMessage(message, missingSlot || undefined, slot_state);
  slot_state = { ...slot_state, ...parsed };
  await updateSession(session.id, slot_state);

  if ((slot_state as any).city_candidate) {
    return cityConfirmationHandler(session, slot_state, message, res);
  }
  if (slot_state.correction_mode) {
    return correctionHandler(session, slot_state, message, res);
  }
  if (slot_state.confirmation_stage) {
    return confirmationHandler(session, slot_state, message, res);
  }
  if (isAllSlotsFilled(slot_state)) {
    slot_state.confirmation_stage = true;
    await updateSession(session.id, slot_state);
    return confirmationHandler(session, slot_state, message, res);
  }
  const nextMissingSlot = getMissingSlot(slot_state);
  if (nextMissingSlot) {
    return slotQuestionHandler(session, slot_state, nextMissingSlot, res);
  }
  return fallbackHandler(session.id, missingSlot, res);
};
