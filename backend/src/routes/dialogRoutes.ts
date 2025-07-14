import { Router } from 'express';
import { dialogHandler } from '../controllers/dialogController';

const router = Router();

router.post('/message', dialogHandler);

export default router;
