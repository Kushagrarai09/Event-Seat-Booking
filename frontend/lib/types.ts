export type Seat = {
  id: number;
  row_label: string;
  seat_number: number;
  label: string;
  is_blocked: boolean;
  is_booked: boolean;
};

export type Event = {
  id: number;
  name: string;
  category: string;
  venue: string;
  event_date: string;
  description: string | null;
  total_seats: number;
  available_seats: number;
  booked_seats: number;
  blocked_seats: number;
  seats?: Seat[];
};

export type Booking = {
  id: number;
  event_id?: number;
  name: string;
  email: string;
  seat_labels: string[];
  booked_at: string;
};
