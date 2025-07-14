import { Response } from 'express';
import { DialogSlotState } from '../models/dialogSession';
import { updateSession } from '../services/sessionService';
import { saveBooking } from '../services/saveBooking';

export async function confirmationHandler(session: any, slot_state: DialogSlotState, message: string, res: Response) {
  const answer = message.trim().toLowerCase();
  if (answer === 'да') {
    await saveBooking(slot_state);
    delete slot_state.confirmation_stage;
    await updateSession(session.id, slot_state);
    return res.json({
      session_id: session.id,
      response: 'Спасибо! Ваша заявка принята и будет обработана.',
      order: {
        from_city: slot_state.from_city,
        to_city: slot_state.to_city,
        date: slot_state.date,
        passengers: slot_state.passengers,
        transport_type: slot_state.transport_type
      },
      all_filled: true,
      finished: true
    });
  } else if (answer === 'нет') {
    slot_state.correction_mode = true;
    delete slot_state.confirmation_stage;
    await updateSession(session.id, slot_state);
    return res.json({
      session_id: session.id,
      response: 'Что вы хотите исправить? (город отправления, город прибытия, дата, количество пассажиров, тип транспорта)',
      all_filled: false
    });
  } else {
    const summary = `Проверьте, пожалуйста, все данные заказа:\n` +
      `Город отправления: ${slot_state.from_city}\n` +
      `Город прибытия: ${slot_state.to_city}\n` +
      `Дата: ${slot_state.date}\n` +
      `Пассажиров: ${slot_state.passengers}\n` +
      `Транспорт: ${slot_state.transport_type}\n` +
      `\nВсё верно? (да/нет)`;
    return res.json({
      session_id: session.id,
      response: summary,
      all_filled: true,
      confirmation: true
    });
  }
}
