import { Request, Response } from 'express';
import {
  createFlight,
  getFlightById,
  listFlights,
  updateFlight,
  deleteFlight
} from '../services/flightService';

export const createFlightHandler = async (req: Request, res: Response) => {
  try {
    const flight = await createFlight(req.body);
    res.status(201).json(flight);
  } catch (error) {
    res.status(400).json({ 
      error: 'Ошибка при создании рейса',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
};

export const getFlightHandler = async (req: Request, res: Response) => {
  try {
    const flight = await getFlightById(Number(req.params.id));
    if (!flight) {
      return res.status(404).json({ error: 'Рейс не найден' });
    }
    res.json(flight);
  } catch (error) {
    res.status(500).json({ 
      error: 'Ошибка при получении рейса',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
};

export const listFlightsHandler = async (req: Request, res: Response) => {
  try {
    const filters = {
      departure_city: req.query.departure_city as string | undefined,
      arrival_city: req.query.arrival_city as string | undefined,
      departure_date: req.query.departure_date as string | undefined,
      min_price: req.query.min_price ? Number(req.query.min_price) : undefined,
      max_price: req.query.max_price ? Number(req.query.max_price) : undefined,
    };
    
    const flights = await listFlights(filters);
    res.json(flights);
  } catch (error) {
    res.status(500).json({ 
      error: 'Ошибка при получении списка рейсов',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
};

export const updateFlightHandler = async (req: Request, res: Response) => {
  try {
    const flight = await updateFlight(Number(req.params.id), req.body);
    if (!flight) {
      return res.status(404).json({ error: 'Рейс не найден' });
    }
    res.json(flight);
  } catch (error) {
    res.status(400).json({ 
      error: 'Ошибка при обновлении рейса',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
};

export const deleteFlightHandler = async (req: Request, res: Response) => {
  try {
    const success = await deleteFlight(Number(req.params.id));
    if (!success) {
      return res.status(404).json({ error: 'Рейс не найден' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ 
      error: 'Ошибка при удалении рейса',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
};
