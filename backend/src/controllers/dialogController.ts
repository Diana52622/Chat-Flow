import { sendToDialogflow } from '../services/dialogflowService';
import { Request, Response } from 'express';

export async function dialogHandler(req: Request, res: Response) {
  const { sessionId, message } = req.body;
  try {
    const dfResponse = await sendToDialogflow({ sessionId, message });
    res.json(dfResponse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
