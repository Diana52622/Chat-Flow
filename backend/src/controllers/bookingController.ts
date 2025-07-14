import { Request, Response } from 'express';
import { createBooking, getBookingById, listBookings } from '../services/bookingService';

export const createBookingHandler = async (req: Request, res: Response) => {
  try {
    const booking = await createBooking(req.body);
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ error: 'Ошибка при создании бронирования', details: err });
  }
};

export const getBookingHandler = async (req: Request, res: Response) => {
  try {
    const booking = await getBookingById(Number(req.params.id));
    if (!booking) return res.status(404).json({ error: 'Бронирование не найдено' });
    res.json(booking);
  } catch (err) {
    res.status(400).json({ error: 'Ошибка при получении бронирования', details: err });
  }
};

export const listBookingsHandler = async (_req: Request, res: Response) => {
  try {
    const bookings = await listBookings();
    res.json(bookings);
  } catch (err) {
    res.status(400).json({ error: 'Ошибка при получении списка бронирований', details: err });
  }
};
