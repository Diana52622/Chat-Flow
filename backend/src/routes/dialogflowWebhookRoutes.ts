import { Router } from 'express';
import { handleDialogflowWebhook } from '../controllers/dialogflowWebhookController';

const router = Router();

// Dialogflow webhook endpoint
router.post('/', handleDialogflowWebhook);

export default router;
