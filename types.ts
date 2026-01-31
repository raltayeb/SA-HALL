export type Role = 'super_admin' | 'vendor' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at?: string;
}

export interface Hall {
  id: string;
  vendor_id: string;
  name: string;
  city: string;
  capacity: number;
  price_per_night: number;
  description: string;
  image_url: string;
  is_active: boolean;
  created_at?: string;
}

export interface Booking {
  id: string;
  hall_id: string;
  user_id: string;
  vendor_id: string;
  booking_date: string;
  total_amount: number;
  vat_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at?: string;
  halls?: Hall; // Joined data
  profiles?: UserProfile; // Joined data
}

export const SAUDI_CITIES = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 
  'الدمام', 'الخبر', 'الطائف', 'أبها', 'تبوك'
];

export const VAT_RATE = 0.15;