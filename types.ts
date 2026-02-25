
export type Role = 'super_admin' | 'vendor' | 'user';

export interface POSConfig {
  tax_rate: number;
  tax_id: string;
  receipt_header: string;
  receipt_footer: string;
  printer_width: '80mm' | '58mm';
  auto_print: boolean;
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  sidebarColor: string;
  borderRadius: string;
  headingFont: string;
  bodyFont: string;
  logoUrl?: string;
}

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
  subscription_status?: 'none' | 'hall' | 'service' | 'both';
  subscription_paid_at?: string;
  subscription_amount?: number;
  has_active_subscription?: boolean;
  theme_color?: string;
  whatsapp_number?: string;
  business_email?: string;
  custom_logo_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  pos_config?: POSConfig;
  vendor_amenities?: string[];
}

export interface VendorClient {
  id: string;
  vendor_id: string;
  full_name: string;
  phone_number?: string;
  email?: string;
  address?: string;
  notes?: string;
  is_vip?: boolean;
  profile_id?: string;
  created_at?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface BookingConfig {
  deposit_fixed: number;
  deposit_percent: number;
  hold_price: number;
  consultation_price: number;
}

export interface FooterConfig {
  app_section: {
    show: boolean;
    image_url: string;
    title: string;
    description: string;
    apple_store_link: string;
    google_play_link: string;
  };
  faq_section: {
    show: boolean;
    title: string;
    items: FAQItem[];
  };
  contact_info: {
    phone: string;
    email: string;
    address: string;
    copyright_text: string;
  };
  social_links: {
    twitter: string;
    instagram: string;
    facebook: string;
    linkedin?: string;
  };
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface StoreCategory {
  id: string;
  name: string;
}

export interface ContentPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  updated_at: string;
  is_published?: boolean;
}

export interface SystemSettings {
  site_name: string;
  commission_rate: number;
  vat_enabled: boolean;
  platform_logo_url: string;
  hall_listing_fee: number;
  service_listing_fee: number;
  footer_config: FooterConfig;
  booking_config: BookingConfig; 
  theme_config?: ThemeConfig; // New Theme Config
  payment_gateways: {
    visa_enabled: boolean;
    cash_enabled: boolean;
    hyperpay_enabled: boolean;
    hyperpay_entity_id: string;
    hyperpay_access_token: string;
    hyperpay_base_url: string; 
    hyperpay_mode: 'test' | 'live';
  };
}

export interface HallAddon {
  name: string;
  price: number;
  description?: string;
}

export interface HallPackage {
  name: string;
  price: number;
  min_men: number;
  max_men: number;
  min_women: number;
  max_women: number;
  is_default: boolean;
  description?: string;
  items?: string[]; 
}

export interface SeasonalPrice {
  name: string;
  start_date: string;
  end_date: string;
  increase_percentage: number;
}

export interface Hall {
  id: string;
  vendor_id: string;
  name: string;
  name_en?: string;
  city: string;
  type?: 'hall' | 'lounge' | 'chalet' | 'resort'; 
  address?: string; 
  latitude?: number;
  longitude?: number;
  capacity: number;
  capacity_men?: number;
  capacity_women?: number;
  price_per_night: number; 
  price_per_adult?: number;
  price_per_child?: number;
  description: string;
  description_en?: string;
  policies?: string; 
  image_url: string;
  images: string[];
  amenities: string[];
  addons?: HallAddon[];
  packages?: HallPackage[];
  seasonal_prices?: SeasonalPrice[];
  is_active: boolean;
  is_featured?: boolean;
  featured_until?: string;
  created_at?: string;
}

export interface Chalet {
  id: string;
  vendor_id: string;
  name: string;
  city: string;
  address?: string;
  capacity: number;
  price_per_night: number;
  price_per_adult?: number;
  price_per_child?: number;
  description: string;
  policies?: string;
  image_url: string;
  images: string[];
  amenities: string[];
  addons?: HallAddon[];
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
  images?: string[]; 
  service_areas?: string[]; 
  is_active: boolean;
  created_at?: string;
}

export interface BookingItem {
  id?: string;
  name: string;
  price: number;
  qty: number;
  type: 'product' | 'service' | 'addon' | 'package';
}

export interface Booking {
  id: string;
  hall_id?: string;
  chalet_id?: string;
  service_id?: string;
  user_id: string | null; 
  vendor_id: string;
  booking_date: string;
  check_out_date?: string; 
  start_time?: string;
  end_time?: string;
  payment_status?: 'paid' | 'partial' | 'unpaid'; 
  booking_type?: 'booking' | 'consultation'; 
  booking_method?: 'full' | 'deposit' | 'hold'; 
  booking_option?: 'deposit' | 'hold_48h' | 'consultation' | 'full_payment'; 
  package_name?: string; 
  package_details?: HallPackage; 
  items?: BookingItem[]; 
  total_amount: number;
  paid_amount?: number; 
  vat_amount: number;
  discount_amount?: number;
  applied_coupon?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'on_hold' | 'blocked'; 
  guest_name?: string;
  guest_phone?: string;
  guest_email?: string; 
  guests_adults?: number; 
  guests_children?: number; 
  notes?: string;
  created_at?: string;
  halls?: Hall;
  chalets?: Chalet; 
  profiles?: UserProfile;
  services?: Service;
  client?: UserProfile;
  vendor?: UserProfile;
  is_read?: boolean;
}

export interface PaymentLog {
  id: string;
  booking_id: string;
  vendor_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer';
  payment_date: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface ExternalInvoice {
  id: string;
  vendor_id: string;
  customer_name: string;
  client_id?: string; 
  hall_id?: string; 
  invoice_date: string;
  items: { description: string; quantity: number; unit_price: number; total: number }[];
  total_amount: number;
  vat_amount: number;
  status: 'paid' | 'unpaid';
  created_at?: string;
  clients?: VendorClient; 
  halls?: Hall; 
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'booking_new' | 'booking_update' | 'system' | 'payment';
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface POSItem {
  id: string;
  vendor_id: string;
  hall_id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  barcode?: string;
  image_url?: string;
  is_featured?: boolean;
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
  target_ids_json?: any; 
}

export interface StoreOrder {
  id: string;
  vendor_id?: string;
  user_id?: string;
  guest_info?: {
    name: string;
    phone: string;
    address: string;
  };
  items: { product_id: string; name: string; price: number; qty: number }[];
  total_amount: number;
  payment_method?: 'cod' | 'transfer' | 'card';
  delivery_status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Subscription {
  id: string;
  vendor_id: string;
  subscription_type: 'hall' | 'service' | 'both';
  amount: number;
  payment_method?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  is_lifetime: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  name: string;
  qty: number;
  unit_price: number;
  total: number;
  type?: 'product' | 'service' | 'addon' | 'package';
}

export interface Invoice {
  id: string;
  invoice_number: string;
  vendor_id: string;
  booking_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_vat_number?: string;
  issue_date: string;
  due_date?: string;
  items: InvoiceItem[];
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  discount_amount?: number;
  total_amount: number;
  payment_status: 'paid' | 'unpaid' | 'partial' | 'cancelled';
  payment_method?: string;
  payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  vendor_id: string;
  invoice_number?: string;
  expense_date: string;
  category: 'rent' | 'salaries' | 'utilities' | 'maintenance' | 'marketing' | 'supplies' | 'zakat' | 'tax' | 'insurance' | 'other';
  supplier_name: string;
  supplier_vat_number?: string;
  description?: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
  payment_method?: string;
  receipt_image?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ZakatCalculation {
  id: string;
  vendor_id: string;
  calculation_period_start: string;
  calculation_period_end: string;
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  zakat_base: number;
  zakat_rate: number;
  zakat_amount: number;
  vat_collected: number;
  vat_paid: number;
  vat_payable: number;
  status: 'pending' | 'filed' | 'paid';
  filed_date?: string;
  created_at: string;
}

export interface FeaturedHall {
  id: string;
  hall_id: string;
  vendor_id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  halls?: Hall;
}

export const SAUDI_CITIES = ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'الطائف', 'أبها', 'تبوك', 'حائل', 'القصيم', 'جازان', 'نجران', 'الجوف', 'عرعر'];
export const HALL_AMENITIES = ['مواقف سيارات', 'جناح للعروس', 'نظام صوتي', 'إضاءة ليزر', 'تكييف مركزي', 'مصعد هيدروليك', 'واي فاي مجاني', 'خدمة فندقية', 'بوفيه مفتوح', 'غرفة كبار الزوار', 'مدخل مستقل'];
export const CHALET_AMENITIES = ['مسبح خارجي', 'مسبح داخلي', 'ألعاب مائية', 'منطقة شواء', 'مجلس خارجي', 'مطبخ متكامل', 'غرفة نوم ماستر', 'ألعاب أطفال', 'ملعب كرة قدم', 'واي فاي', 'نطيطة'];
export const SERVICE_CATEGORIES = ['ضيافة', 'تصوير', 'كوش', 'بوفيه', 'إضاءة وصوت', 'زينة وزهور', 'تنسيق حفلات', 'أخرى'];
export const POS_CATEGORIES = ['مشروبات', 'مأكولات', 'خدمات إضافية', 'تأجير', 'عام', 'تجهيزات', 'هدايا'];
export const EXPENSE_CATEGORIES = ['رواتب', 'إيجار', 'صيانة', 'فواتير', 'تسويق', 'أخرى'];
export const VAT_RATE = 0.15;
