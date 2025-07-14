import { Router } from 'express';
import { createBookingHandler, getBookingHandler, listBookingsHandler } from '../controllers/bookingController';

const router = Router();

router.post('/', createBookingHandler);
router.get('/:id', getBookingHandler);
router.get('/', listBookingsHandler);

export default router;
