import { Router } from 'express';
import {
  createFlightHandler,
  getFlightHandler,
  listFlightsHandler,
  updateFlightHandler,
  deleteFlightHandler
} from '../controllers/flightController';

const router = Router();

// Создать новый рейс
router.post('/', createFlightHandler);

// Получить список рейсов с фильтрами
router.get('/', listFlightsHandler);

// Получить детали рейса по ID
router.get('/:id', getFlightHandler);

// Обновить рейс
router.put('/:id', updateFlightHandler);

// Удалить рейс
router.delete('/:id', deleteFlightHandler);

export default router;
