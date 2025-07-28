import { Request, Response } from 'express';
import { createBooking } from '../services/bookingService';
import { listFlights } from '../services/flightService';

export async function handleDialogflowFulfillment(req: Request, res: Response) {
  try {
    const body = req.body;
    const params = body.queryResult?.parameters || {};
    const intent = body.queryResult?.intent?.displayName;

    if (intent === 'ConfirmBooking') {
      const searchParams = {
        departure_city: params.from_city || params.city_from || '',
        arrival_city: params.to_city || params.city_to || '',
        departure_date: params.date ? new Date(params.date).toISOString().split('T')[0] : '',
        min_seats: Number(params.passengers) || 1,
        transport_type: params.transport_type || 'train',
      };
      
      try {
        // Сначала ищем рейсы
        const flights = await listFlights({
          departure_city: searchParams.departure_city,
          arrival_city: searchParams.arrival_city,
          departure_date: searchParams.departure_date,
          min_seats: searchParams.min_seats,
          transport_type: searchParams.transport_type
        });

        if (flights.length === 0) {
          return res.json({
            fulfillmentText: 'К сожалению, по вашим параметрам рейсы не найдены. Хотите изменить параметры поиска?'
          });
        }

        // Форматируем рейсы для ответа
        const formattedFlights = flights.map(flight => ({
          id: flight.id,
          flight_number: flight.flight_number,
          departure_city: flight.departure_city,
          arrival_city: flight.arrival_city,
          departure_time: flight.departure_time,
          arrival_time: flight.arrival_time,
          price: flight.price,
          available_seats: flight.available_seats,
          status: flight.status,
          transport_type: flight.transport_type || 'train'
        }));

        return res.json({
          fulfillmentMessages: [
            {
              text: {
                text: [`Найдено ${flights.length} рейсов. Выберите подходящий вариант.`]
              }
            },
            {
              payload: {
                richContent: [
                  formattedFlights.map(flight => ({
                    type: 'info',
                    title: `Рейс ${flight.flight_number}`,
                    subtitle: `${flight.departure_city} → ${flight.arrival_city}`,
                    text: [
                      `Вылет: ${new Date(flight.departure_time).toLocaleString()}`,
                      `Прибытие: ${new Date(flight.arrival_time).toLocaleString()}`,
                      `Цена: ${flight.price} ₽`,
                      `Доступно мест: ${flight.available_seats}`
                    ],
                    actionLink: `book-flight/${flight.id}`
                  }))
                ]
              }
            }
          ]
        });
      } catch (error) {
        console.error('Ошибка при поиске рейсов:', error);
        return res.json({
          fulfillmentText: 'Произошла ошибка при поиске рейсов. Пожалуйста, попробуйте позже.'
        });
      }
    }

    res.json({ fulfillmentText: 'Не удалось обработать бронирование.' });
  } catch (err) {
    res.json({ fulfillmentText: 'Ошибка при сохранении бронирования.' });
  }
}
