import pool from '../db';
import { Booking } from '../models/booking';

function parseDate(dateStr: string): string {
  const months: { [key: string]: number } = {
    'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3, 'мая': 4, 'июня': 5,
    'июля': 6, 'августа': 7, 'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11
  };

  const match = dateStr.match(/^(\d{1,2})\s+([а-яё]+)$/i);
  if (match) {
    const [, day, monthName] = match;
    const month = months[monthName.toLowerCase()];
    if (month !== undefined) {
      const date = new Date();
      date.setMonth(month);
      date.setDate(parseInt(day, 10));
      if (date < new Date()) {
        date.setFullYear(date.getFullYear() + 1);
      }
      return date.toISOString().split('T')[0];
    }
  }

  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  throw new Error('Некорректный формат даты. Используйте формат "13 августа" или ГГГГ-ММ-ДД');
}

export async function createBooking(data: Omit<Booking, 'id' | 'created_at'>): Promise<Booking> {
  try {
    const formattedDate = typeof data.date === 'string' ? parseDate(data.date) : data.date;
    
    const result = await pool.query(
      `INSERT INTO bookings (from_city, to_city, date, passengers, transport_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.from_city, data.to_city, formattedDate, data.passengers, data.transport_type]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in createBooking:', error);
    throw new Error(error instanceof Error ? error.message : 'Ошибка при создании бронирования');
  }
}

export async function getBookingById(id: number): Promise<Booking | null> {
  const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function listBookings(): Promise<Booking[]> {
  const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
  return result.rows;
}

export async function updateBooking(id: number, updates: Partial<Omit<Booking, 'id' | 'created_at'>>): Promise<Booking | null> {
  const fields = [];
  const values = [];
  let paramIndex = 1;
  if (updates.from_city !== undefined) {
    fields.push(`from_city = $${paramIndex++}`);
    values.push(updates.from_city);
  }
  if (updates.to_city !== undefined) {
    fields.push(`to_city = $${paramIndex++}`);
    values.push(updates.to_city);
  }
  if (updates.date !== undefined) {
    fields.push(`date = $${paramIndex++}`);
    values.push(updates.date);
  }
  if (updates.passengers !== undefined) {
    fields.push(`passengers = $${paramIndex++}`);
    values.push(updates.passengers);
  }
  if (updates.transport_type !== undefined) {
    fields.push(`transport_type = $${paramIndex++}`);
    values.push(updates.transport_type);
  }

  if (fields.length === 0) {
    return null;
  }
  values.push(id);
  
  const query = `
    UPDATE bookings 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

