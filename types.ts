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
  is_enabled: boolean; // Super admin control
  created_at?: string;
  custom_logo_url?: string;
  whatsapp_number?: string;
  business_email?: string;
  theme_color?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
}

export interface SystemSettings {
  site_name: string;
  commission_rate: number;
  vat_enabled: boolean;
  platform_logo_url?: string;
  hall_listing_fee: number; // Price per hall
  service_listing_fee: number; // Price per service
}

export interface POSItem {
  id: string;
  vendor_id: string;
  hall_id: string; // POS items can be hall-specific
  name: string;
  price: number;
  stock: number;
  image_url?: string;
}

export interface Coupon {
  id: string;
  vendor_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string;
  applicable_to: 'halls' | 'services' | 'both';
  target_ids: string[]; // Specific IDs of halls or services
  is_active: boolean;
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
  created_at?: string;
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
  created_at?: string;
  halls?: Hall;
  profiles?: UserProfile;
  services?: Service;
  client?: UserProfile;
  vendor?: UserProfile;
}

export const SAUDI_CITIES = ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'الطائف', 'أبها', 'تبوك'];
export const HALL_AMENITIES = ['مواقف سيارات', 'جناح للعروس', 'نظام صوتي', 'إضاءة ليزر', 'تكييف مركزي', 'مصعد هيدروليك', 'واي فاي مجاني', 'خدمة فندقية'];
export const SERVICE_CATEGORIES = ['ضيافة وطعام', 'تصوير فوتوغرافي', 'تصوير فيديو', 'تنسيق زهور', 'كوشة وتصميم', 'توزيعات وهدايا', 'دي جي وصوت', 'زفة'];
export const VAT_RATE = 0.15;