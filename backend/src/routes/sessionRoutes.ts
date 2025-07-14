import { Router } from 'express';
import { createSessionHandler, getSessionHandler, updateSessionHandler, deactivateSessionHandler } from '../controllers/sessionController';

const router = Router();

router.post('/', createSessionHandler);
router.get('/:id', getSessionHandler);
router.put('/:id', updateSessionHandler);
router.post('/:id/deactivate', deactivateSessionHandler);

export default router;
