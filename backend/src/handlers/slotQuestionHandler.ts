import { Response } from 'express';
import { updateSession } from '../services/sessionService';
import { getSlotQuestion } from '../services/dialogService';

import { SlotName } from '../models/dialogSession';

export async function slotQuestionHandler(session: any, slot_state: any, nextMissingSlot: SlotName, res: Response) {
  await updateSession(session.id, slot_state);
  return res.json({
    session_id: session.id,
    response: getSlotQuestion(nextMissingSlot),
    all_filled: false,
  });
}
