export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  is_public: boolean;
  created_at: string;
}

export interface DreamEvent {
  id: string;
  user_id: string;
  event_slug: string;
  event_title: string;
  event_image: string | null;
  is_public: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  event_slug: string;
  event_title: string;
  event_date: string;
  event_venue: string;
  ticket_tier: string;
  quantity: number;
  total_paid: number;
  qr_code: string | null;
  gifted_by: string | null;
  gifted_to: string | null;
  status: string;
  created_at: string;
}

export interface EventAttendance {
  id: string;
  user_id: string;
  event_slug: string;
  status: string;
  is_public: boolean;
  created_at: string;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}
