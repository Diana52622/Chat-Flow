import { Response } from 'express';
import { getSlotQuestion } from '../services/dialogService';
import { SlotName } from '../models/dialogSession';

export async function fallbackHandler(session_id: any, missingSlot: SlotName | null, res: Response) {
  if (missingSlot) {
    return res.json({
      session_id,
      response: `Я не смог распознать ваш ответ. Пожалуйста, уточните: ${getSlotQuestion(missingSlot)}`,
      all_filled: false,
    });
  } else {
    return res.json({
      session_id,
      response: 'Я не смог распознать ваш ответ. Пожалуйста, попробуйте переформулировать запрос или начать заново.',
      all_filled: false,
    });
  }
}
