import pool from '../db';

export async function saveBooking(slot_state: any) {
  const date = (typeof slot_state.date === 'string' && slot_state.date.match(/^\d{2}-\d{2}-\d{4}$/))
    ? slot_state.date.split('-').reverse().join('-')
    : slot_state.date;

  await pool.query(
    'INSERT INTO bookings (from_city, to_city, date, passengers, transport_type) VALUES ($1, $2, $3, $4, $5)',
    [
      slot_state.from_city,
      slot_state.to_city,
      date,
      slot_state.passengers,
      slot_state.transport_type
    ]
  );
}