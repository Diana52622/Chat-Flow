import pool from '../db';
import { Flight } from '../models/flight';

export async function createFlight(flightData: Omit<Flight, 'id' | 'created_at' | 'updated_at'>): Promise<Flight> {
  const query = `
    INSERT INTO flights (
      flight_number, 
      departure_city, 
      arrival_city, 
      departure_time, 
      arrival_time, 
      available_seats, 
      price, 
      status
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  
  const values = [
    flightData.flight_number,
    flightData.departure_city,
    flightData.arrival_city,
    flightData.departure_time,
    flightData.arrival_time,
    flightData.available_seats,
    flightData.price,
    flightData.status
  ];

  try {
    const result = await pool.query(query, values);
    if (!result.rows[0]) {
      throw new Error('No rows returned from INSERT query');
    }
    return result.rows[0];
  } catch (error) {
    throw error;
  }
}

export async function getFlightById(id: number): Promise<Flight | null> {
  const result = await pool.query('SELECT * FROM flights WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export interface FlightFilters {
  departure_city?: string;
  arrival_city?: string;
  departure_date?: string;
  min_seats?: number;
  transport_type?: string;
}

export async function listFlights(
  filters: FlightFilters = {}
): Promise<Flight[]> {
  console.log('=== START listFlights ===');
  console.log('Filters received:', JSON.stringify(filters, null, 2));
  
  let query = 'SELECT * FROM flights WHERE 1=1';
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (filters.departure_city) {
    query += ` AND departure_city ILIKE $${paramIndex}`;
    queryParams.push(`%${filters.departure_city}%`);
    console.log(`Added departure city filter: %${filters.departure_city}%`);
    paramIndex++;
  }

  if (filters.arrival_city) {
    query += ` AND arrival_city ILIKE $${paramIndex}`;
    queryParams.push(`%${filters.arrival_city}%`);
    console.log(`Added arrival city filter: %${filters.arrival_city}%`);
    paramIndex++;
  }

  if (filters.departure_date) {
    try {
      const inputDate = new Date(filters.departure_date);
      if (isNaN(inputDate.getTime())) {
        throw new Error('Invalid date format');
      }
      
      const year = inputDate.getFullYear();
      const month = String(inputDate.getMonth() + 1).padStart(2, '0');
      const day = String(inputDate.getDate()).padStart(2, '0');
      
      const localDateString = `${year}-${month}-${day}`;
      
      const nextDay = new Date(inputDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayString = nextDay.toISOString().split('T')[0];
      
      console.log(`Filtering flights between ${localDateString} and ${nextDayString}`);
      
      query += ` AND departure_time >= $${paramIndex}::timestamp`;
      query += ` AND departure_time < $${paramIndex + 1}::timestamp`;
      queryParams.push(localDateString, nextDayString);
      paramIndex += 2;
      
    } catch (error) {
      console.error('Error processing date filter:', error);
      throw new Error('Неверный формат даты. Используйте ГГГГ-ММ-ДД');
    }
  }

  if (filters.min_seats) {
    query += ` AND available_seats >= $${paramIndex}`;
    queryParams.push(filters.min_seats);
    paramIndex++;
  }

  if (filters.transport_type) {
    const transportTypeMap: {[key: string]: string} = {
      'автобус': 'bus',
      'поезд': 'train',
      'самолет': 'airplane',
      'самолёт': 'airplane'
    };
    
    const dbTransportType = transportTypeMap[filters.transport_type.toLowerCase()] || 
                           filters.transport_type.toLowerCase();
    
    query += ` AND LOWER(transport_type) = $${paramIndex}`;
    queryParams.push(dbTransportType);
    paramIndex++;
  }

  query += ' ORDER BY departure_time ASC';
  
  try {
    console.log('Executing query:', query);
    console.log('With parameters:', queryParams);
    
    const debugQuery = queryParams.reduce((q, param, index) => 
      q.replace(`$${index + 1}`, typeof param === 'string' ? `'${param}'` : param), 
      query
    );
    console.log('Full SQL query:', debugQuery);
    
    const result = await pool.query(query, queryParams);
    console.log(`=== FOUND ${result.rows.length} FLIGHTS ===`);
    
    if (result.rows.length > 0) {
      console.log('First flight sample:', JSON.stringify(result.rows[0], null, 2));
      console.log('Departure time type:', typeof result.rows[0].departure_time);
      console.log('Departure time value:', result.rows[0].departure_time);
    } else {
      console.log('No flights found for the given criteria');
    }
    
    console.log('=== END listFlights ===\n');
    return result.rows;
  } catch (error) {
    console.error('Error listing flights:', error);
    throw new Error('Failed to retrieve flights');
  }
}

export async function updateFlight(
  id: number, 
  updates: Partial<Omit<Flight, 'id' | 'created_at' | 'updated_at'>>
): Promise<Flight | null> {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (updates.flight_number !== undefined) {
    fields.push(`flight_number = $${paramIndex++}`);
    values.push(updates.flight_number);
  }
  if (updates.departure_city !== undefined) {
    fields.push(`departure_city = $${paramIndex++}`);
    values.push(updates.departure_city);
  }
  if (updates.arrival_city !== undefined) {
    fields.push(`arrival_city = $${paramIndex++}`);
    values.push(updates.arrival_city);
  }
  if (updates.departure_time !== undefined) {
    fields.push(`departure_time = $${paramIndex++}`);
    values.push(updates.departure_time);
  }
  if (updates.arrival_time !== undefined) {
    fields.push(`arrival_time = $${paramIndex++}`);
    values.push(updates.arrival_time);
  }
  if (updates.available_seats !== undefined) {
    fields.push(`available_seats = $${paramIndex++}`);
    values.push(updates.available_seats);
  }
  if (updates.price !== undefined) {
    fields.push(`price = $${paramIndex++}`);
    values.push(updates.price);
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }

  if (fields.length === 0) {
    return null;
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const query = `
    UPDATE flights 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export async function deleteFlight(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM flights WHERE id = $1', [id]);
  return result.rowCount ? result.rowCount > 0 : false;
}
