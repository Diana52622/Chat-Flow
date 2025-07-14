import { Response } from 'express';
import { updateSession } from '../services/sessionService';

import { parseSlotsFromMessage } from '../parsers/slotParser';
import { confirmationHandler } from './confirmationHandler';
import { DialogSlotState } from '../models/dialogSession';

export async function correctionHandler(session: any, slot_state: Partial<DialogSlotState>, message: string, res: Response) {
  const parsed = parseSlotsFromMessage(message, undefined, slot_state) as Partial<DialogSlotState>;
  let changed = false;
  const slotKeys: (keyof DialogSlotState)[] = ['from_city', 'to_city', 'date', 'passengers', 'transport_type'];
  for (const key of slotKeys) {
    const value = parsed[key];
    if (typeof value !== 'undefined' && value !== slot_state[key]) {
      if (key === 'passengers') {
        if (typeof value === 'number') {
          slot_state[key] = value;
          changed = true;
        } else if (typeof value === 'string') {
          const num = Number(value);
          if (!isNaN(num)) {
            slot_state[key] = num as any;
            changed = true;
          }
        }
      } else if (
        (key === 'from_city' || key === 'to_city' || key === 'date' || key === 'transport_type') &&
        typeof value === 'string'
      ) {
        slot_state[key] = value;
        changed = true;
      }
    }
  }
  if (changed) {
    slot_state.correction_mode = false;
    await updateSession(session.id, slot_state);
    return confirmationHandler(session, slot_state, '', res);
  }
  const slotToCorrect = message.toLowerCase();
  let slotDeleted = false;
  if (slotToCorrect === 'город отправления') {
    delete slot_state.from_city; slotDeleted = true;
  } else if (slotToCorrect === 'город прибытия') {
    delete slot_state.to_city; slotDeleted = true;
  } else if (slotToCorrect === 'дата') {
    delete slot_state.date; slotDeleted = true;
  } else if (slotToCorrect === 'количество пассажиров') {
    delete slot_state.passengers; slotDeleted = true;
  } else if (slotToCorrect === 'тип транспорта') {
    delete slot_state.transport_type; slotDeleted = true;
  }
  if (slotDeleted) {
    slot_state.correction_mode = false;
    await updateSession(session.id, slot_state);
    return res.json({
      session_id: session.id,
      response: 'Пожалуйста, уточните детали поездки.',
      all_filled: false,
    });
  }
  return res.json({
    session_id: session.id,
    response: 'Пожалуйста, укажите, что нужно исправить и новое значение (например: "город отправления Минск" или "дата 15-07-2025")',
    all_filled: false,
  });
}
