import { Router } from 'express';
import { handleDialogflowFulfillment } from '../controllers/fulfillmentController';

const router = Router();

router.post('/dialogflow', handleDialogflowFulfillment);

export default router;
