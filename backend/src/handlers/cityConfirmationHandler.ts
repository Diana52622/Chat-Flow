import { Response } from 'express';
import { DialogSlotState } from '../models/dialogSession';
import { updateSession } from '../services/sessionService';

import { getMissingSlot, isAllSlotsFilled } from '../services/dialogService';
import { slotQuestionHandler } from './slotQuestionHandler';
import { confirmationHandler } from './confirmationHandler';

export async function cityConfirmationHandler(
  session: any,
  slot_state: DialogSlotState,
  message: string,
  res: Response
) {
  const candidate = (slot_state as any).city_candidate;
  const candidateType = (slot_state as any).city_candidate_type as 'from_city' | 'to_city';
  if (!candidate || !candidateType) {
    return res.json({
      session_id: session.id,
      response: 'Пожалуйста, укажите город.',
      all_filled: false
    });
  }
  const answer = message.trim().toLowerCase();
  if (answer === 'да') {
    slot_state[candidateType] = candidate;
    delete (slot_state as any).city_candidate;
    delete (slot_state as any).city_candidate_type;
    await updateSession(session.id, slot_state);
    if (isAllSlotsFilled(slot_state)) {
      slot_state.confirmation_stage = true;
      await updateSession(session.id, slot_state);
      return confirmationHandler(session, slot_state, message, res);
    }
    const nextMissingSlot = getMissingSlot(slot_state);
    if (nextMissingSlot) {
      return slotQuestionHandler(session, slot_state, nextMissingSlot, res);
    }
    return res.json({
      session_id: session.id,
      response: 'Все данные получены. Пожалуйста, проверьте заказ.',
      all_filled: true
    });
  } else if (answer === 'нет') {
    delete (slot_state as any).city_candidate;
    delete (slot_state as any).city_candidate_type;
    await updateSession(session.id, slot_state);
    return res.json({
      session_id: session.id,
      response: 'Пожалуйста, введите город ещё раз.',
      all_filled: false
    });
  } else {
    return res.json({
      session_id: session.id,
      response: `Вы имели в виду город ${candidate}? (да/нет)`,
      all_filled: false
    });
  }
}
