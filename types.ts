
export type Role = 'super_admin' | 'vendor' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  business_name?: string;
  phone_number?: string;
  bio?: string;
  avatar_url?: string;
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
  images: string[];
  amenities: string[];
  is_active: boolean;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  average_rating?: number;
}

// Fix: Add missing Service interface for vendor services management
export interface Service {
  id: string;
  vendor_id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image_url: string;
  is_active: boolean;
  created_at?: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  hall_id: string;
}

export interface Booking {
  id: string;
  hall_id?: string;
  service_id?: string;
  user_id: string;
  vendor_id: string;
  booking_date: string;
  total_amount: number;
  vat_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  completed_at?: string;
  created_at?: string;
  halls?: Hall;
  profiles?: UserProfile;
}

export const SAUDI_CITIES = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 
  'الدمام', 'الخبر', 'الطائف', 'أبها', 'تبوك'
];

export const HALL_AMENITIES = [
  'مواقف سيارات', 'جناح للعروس', 'نظام صوتي', 'إضاءة ليزر', 'تكييف مركزي', 'مصعد هيدروليك', 'واي فاي مجاني', 'خدمة فندقية'
];

// Fix: Add missing SERVICE_CATEGORIES constant for vendor services
export const SERVICE_CATEGORIES = [
  'ضيافة وطعام', 'تصوير فوتوغرافي', 'تصوير فيديو', 'تنسيق زهور', 'كوشة وتصميم', 'توزيعات وهدايا', 'دي جي وصوت', 'زفة'
];

export const VAT_RATE = 0.15;
