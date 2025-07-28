import pool from '../db';

async function checkFlights() {
  try {
    // Query all flights
    const result = await pool.query('SELECT * FROM flights');
    
    console.log(`Found ${result.rows.length} flights in the database`);
    
    if (result.rows.length > 0) {
      console.log('First 5 flights:');
      result.rows.slice(0, 5).forEach((flight, index) => {
        console.log(`\nFlight #${index + 1}:`);
        console.log(`ID: ${flight.id}`);
        console.log(`Number: ${flight.flight_number || flight.number}`);
        console.log(`From: ${flight.departure_city} to ${flight.arrival_city}`);
        console.log(`Departure: ${flight.departure_time}`);
        console.log(`Type: ${flight.transport_type || 'unknown'}`);
        console.log(`Available seats: ${flight.available_seats}`);
      });
    }
    
    // Check for flights from Moscow to Minsk tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`\nChecking for flights from Moscow to Minsk on ${tomorrowStr}:`);
    
    const moscowMinskFlights = await pool.query(
      `SELECT * FROM flights 
       WHERE LOWER(departure_city) LIKE '%moscow%' 
       AND LOWER(arrival_city) LIKE '%minsk%' 
       AND DATE(departure_time) = $1::date`,
      [tomorrowStr]
    );
    
    console.log(`\nFound ${moscowMinskFlights.rows.length} flights from Moscow to Minsk for tomorrow`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking flights:', error);
    process.exit(1);
  }
}

checkFlights();
