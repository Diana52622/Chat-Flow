import { sendToDialogflow } from '../services/dialogflowService';
import { Request, Response } from 'express';

export async function dialogHandler(req: Request, res: Response) {
  const { sessionId, message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  try {
    const dfResponse = await sendToDialogflow(message, sessionId);
    res.json(dfResponse);
  } catch (error: any) {
    console.error('Dialogflow error:', error);
    res.status(500).json({ 
      error: 'Failed to process message with Dialogflow',
      details: error.message 
    });
  }
}
