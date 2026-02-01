

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
  // Added fields for vendor branding and contact info
  custom_logo_url?: string;
  whatsapp_number?: string;
  business_email?: string;
  theme_color?: string;
  // Social media links
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
}

export interface Subscription {
  id: string;
  vendor_id: string;
  plan_type: 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'expired' | 'trial';
  start_date: string;
  end_date: string;
  amount_paid: number;
  profiles?: UserProfile;
}

export interface SystemSettings {
  site_name: string;
  commission_rate: number;
  vat_enabled: boolean;
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

/**
 * Booking interface with support for joined profiles.
 * 'client' is an alias for the user profile associated with user_id.
 * 'vendor' is an alias for the user profile associated with vendor_id.
 */
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
  services?: Service;
  client?: UserProfile;
  vendor?: UserProfile;
}

export const SAUDI_CITIES = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 
  'الدمام', 'الخبر', 'الطائف', 'أبها', 'تبوك'
];

export const HALL_AMENITIES = [
  'مواقف سيارات', 'جناح للعروس', 'نظام صوتي', 'إضاءة ليزر', 'تكييف مركزي', 'مصعد هيدروليك', 'واي فاي مجاني', 'خدمة فندقية'
];

export const SERVICE_CATEGORIES = [
  'ضيافة وطعام', 'تصوير فوتوغرافي', 'تصوير فيديو', 'تنسيق زهور', 'كوشة وتصميم', 'توزيعات وهدايا', 'دي جي وصوت', 'زفة'
];

export const VAT_RATE = 0.15;
