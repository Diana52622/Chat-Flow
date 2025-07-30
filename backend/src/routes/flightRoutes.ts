import { Router } from 'express';
import {
  createFlightHandler,
  getFlightHandler,
  listFlightsHandler,
  updateFlightHandler,
  deleteFlightHandler
} from '../controllers/flightController';

const router = Router();

router.post('/', createFlightHandler);

router.get('/', listFlightsHandler);

router.get('/:id', getFlightHandler);

router.put('/:id', updateFlightHandler);

router.delete('/:id', deleteFlightHandler);

export default router;
