import pool from '../db';
import { Booking } from '../models/booking';

export async function createBooking(data: Omit<Booking, 'id' | 'created_at'>): Promise<Booking> {
  const result = await pool.query(
    `INSERT INTO bookings (from_city, to_city, date, passengers, transport_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.from_city, data.to_city, data.date, data.passengers, data.transport_type]
  );
  return result.rows[0];
}

export async function getBookingById(id: number): Promise<Booking | null> {
  const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function listBookings(): Promise<Booking[]> {
  const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
  return result.rows;
}
