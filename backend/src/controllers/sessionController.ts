import { Request, Response } from 'express';
import { createSession, getSessionById, updateSession, deactivateSession } from '../services/sessionService';

export const createSessionHandler = async (req: Request, res: Response) => {
  try {
    const session = await createSession(req.body.slot_state || {});
    res.status(201).json(session);
  } catch (err) {
    res.status(400).json({ error: 'Ошибка при создании сессии', details: err });
  }
};

export const getSessionHandler = async (req: Request, res: Response) => {
  try {
    const session = await getSessionById(Number(req.params.id));
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' });
    res.json(session);
  } catch (err) {
    res.status(400).json({ error: 'Ошибка при получении сессии', details: err });
  }
};

export const updateSessionHandler = async (req: Request, res: Response) => {
  try {
    const session = await updateSession(Number(req.params.id), req.body.slot_state);
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' });
    res.json(session);
  } catch (err) {
    res.status(400).json({ error: 'Ошибка при обновлении сессии', details: err });
  }
};

export const deactivateSessionHandler = async (req: Request, res: Response) => {
  try {
    await deactivateSession(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Ошибка при деактивации сессии', details: err });
  }
};