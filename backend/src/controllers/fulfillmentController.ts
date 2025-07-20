import { Request, Response } from 'express';
import { createBooking } from '../services/bookingService';

export async function handleDialogflowFulfillment(req: Request, res: Response) {
  try {
    const body = req.body;
    const params = body.queryResult?.parameters || {};
    const intent = body.queryResult?.intent?.displayName;

    // Проверяем, что это нужный intent (например, ConfirmBooking)
    if (intent === 'ConfirmBooking') {
      // Приводим параметры к нужному виду для createBooking
      const bookingData = {
        from_city: params.from_city || params.city_from || '',
        to_city: params.to_city || params.city_to || '',
        date: params.date || '',
        passengers: Number(params.passengers) || 1,
        transport_type: params.transport_type || 'train',
      };
      await createBooking(bookingData);
      return res.json({ fulfillmentText: 'Бронирование подтверждено' });
    }

    // Если intent не совпадает
    res.json({ fulfillmentText: 'Не удалось обработать бронирование.' });
  } catch (err) {
    res.json({ fulfillmentText: 'Ошибка при сохранении бронирования.' });
  }
}
