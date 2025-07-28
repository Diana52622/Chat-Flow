export type TransportType = 'airplane' | 'train' | 'bus';

export interface Flight {
  id: number;
  flight_number: string;
  departure_city: string;
  arrival_city: string;
  departure_time: Date | string;
  arrival_time: Date | string;
  available_seats: number;
  price: number;
  status: 'scheduled' | 'on_time' | 'delayed' | 'cancelled' | string;
  transport_type?: TransportType;
  created_at: string;
  updated_at: string;
}
