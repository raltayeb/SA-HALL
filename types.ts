
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
  status?: 'pending' | 'approved' | 'rejected';
  is_enabled: boolean;
  created_at?: string;
  hall_limit: number;
  service_limit: number;
  subscription_plan?: string;
  payment_status?: 'paid' | 'unpaid';
  theme_color?: string;
  whatsapp_number?: string;
  business_email?: string;
  custom_logo_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
}

export interface SystemSettings {
  site_name: string;
  commission_rate: number;
  vat_enabled: boolean;
  platform_logo_url?: string;
  hall_listing_fee: number;
  service_listing_fee: number;
  payment_gateways: {
    visa_enabled: boolean;
    cash_enabled: boolean;
    visa_merchant_id?: string;
    visa_secret_key?: string;
  };
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface ContentPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  updated_at?: string;
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
  start_time?: string; 
  end_time?: string;   
  payment_status?: 'paid' | 'partial' | 'unpaid'; 
  package_name?: string; 
  total_amount: number;
  paid_amount?: number; // New field for Deposit/Paid part
  vat_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'; 
  notes?: string;
  created_at?: string;
  halls?: Hall;
  profiles?: UserProfile;
  services?: Service;
  client?: UserProfile;
  vendor?: UserProfile;
}

export interface POSItem {
  id: string;
  vendor_id: string;
  hall_id: string;
  name: string;
  price: number;
  stock: number;
  created_at?: string;
}

export interface Coupon {
  id: string;
  vendor_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  applicable_to: 'halls' | 'services' | 'both';
  target_ids?: string[];
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at?: string;
}

export const SAUDI_CITIES = ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'الطائف', 'أبها', 'تبوك', 'حائل', 'القصيم', 'جازان', 'نجران', 'الجوف', 'عرعر'];
export const HALL_AMENITIES = ['مواقف سيارات', 'جناح للعروس', 'نظام صوتي', 'إضاءة ليزر', 'تكييف مركزي', 'مصعد هيدروليك', 'واي فاي مجاني', 'خدمة فندقية', 'بوفيه مفتوح', 'غرفة كبار الزوار', 'مدخل مستقل'];
export const SERVICE_CATEGORIES = ['ضيافة', 'تصوير', 'كوش', 'بوفيه', 'إضاءة وصوت', 'زينة وزهور', 'تنسيق حفلات', 'أخرى'];
export const VAT_RATE = 0.15;
