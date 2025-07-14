import express from 'express';
import dotenv from 'dotenv';
import { json } from 'express';
import { connectDB } from './db';

import bookingRoutes from './routes/bookingRoutes';
import sessionRoutes from './routes/sessionRoutes';
import dialogRoutes from './routes/dialogRoutes';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(json());

app.use('/api/bookings', bookingRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/dialog', dialogRoutes);

app.get('/', (req, res) => {
  res.send('Trip Chat Backend API');
});


connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to DB', err);
    process.exit(1);
  });
