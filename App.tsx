
// ... existing imports ...
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { UserProfile, VAT_RATE, SAUDI_CITIES, HALL_AMENITIES, SERVICE_CATEGORIES, Hall, ThemeConfig } from './types';
import { Sidebar } from './components/Layout/Sidebar';
import { PublicNavbar } from './components/Layout/PublicNavbar';
import { Footer } from './components/Layout/Footer';
import { Dashboard } from './pages/Dashboard';
import { VendorHalls } from './pages/VendorHalls';
import { VendorChalets } from './pages/VendorChalets';
import { Bookings } from './pages/Bookings';
import { Home } from './pages/Home';
import { VendorSubscriptions } from './pages/VendorSubscriptions';
import { SystemSettings } from './pages/SystemSettings';
import { UsersManagement } from './pages/UsersManagement';
import { AdminDashboard } from './pages/AdminDashboard';
import { ContentCMS } from './pages/ContentCMS';
import { ServiceCategories } from './pages/ServiceCategories'; 
import { AdminStore } from './pages/AdminStore'; 
import { VendorCoupons } from './pages/VendorCoupons';
import { CalendarBoard } from './pages/CalendarBoard';
import { VendorServices } from './pages/VendorServices';
import { VendorBrandSettings } from './pages/VendorBrandSettings';
import { BrowseHalls } from './pages/BrowseHalls';
import { PublicListing } from './pages/PublicListing';
import { PublicStore } from './pages/PublicStore';
import { Favorites } from './pages/Favorites';
import { AdminRequests } from './pages/AdminRequests';
import { VendorAccounting } from './pages/VendorAccounting';
import { HallDetails } from './pages/HallDetails';
import { ChaletDetails } from './pages/ChaletDetails';
import { ServiceDetails } from './pages/ServiceDetails';
import { GuestLogin } from './pages/GuestLogin';
import { GuestPortal } from './pages/GuestPortal';
import { ForgotPassword } from './pages/ForgotPassword';
import { VendorMarketplace } from './pages/VendorMarketplace';
import { VendorClients } from './pages/VendorClients'; 
import { VendorSubscription } from './pages/VendorSubscription';
import { FeaturedHallsManagement } from './pages/FeaturedHallsManagement';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Modal } from './components/ui/Modal'; 
import { PriceTag } from './components/ui/PriceTag';
import { prepareCheckout, verifyPaymentStatus } from './services/paymentService';
import { HyperPayForm } from './components/Payment/HyperPayForm';
import {
  Loader2, CheckCircle2, Mail, ArrowLeft,
  Globe, Sparkles, Building2, Palmtree, Lock, CreditCard, User, Check, Eye, EyeOff, LogOut, Plus, ArrowRight, XCircle, FileText, Upload, Clock, Image as ImageIcon, Ticket, ShieldCheck, Home as HomeIcon
} from 'lucide-react';
import { useToast } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import { checkPasswordStrength, isValidSaudiPhone, normalizeNumbers } from './utils/helpers';
import { VendorAuth } from './pages/VendorAuth';

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [loading, setLoading] = useState(true);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(null);
  
  // Registration State
  const [regStep, setRegStep] = useState(1);
  const [regData, setRegData] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [selectedType, setSelectedType] = useState<'hall' | 'service'>('hall');
  
  // Registration Payment State
  const [couponCode, setCouponCode] = useState('');
  
  // Detailed Asset Data for Registration Step 4
  const [hallFormData, setHallFormData] = useState({
      city: 'الرياض',
      license_number: '',
      unified_number: '',
      name_ar: '',
      name_en: '',
      capacity_men: '',
      capacity_women: '',
      description_ar: '',
      description_en: '',
      price: '',
      images: [] as string[], // Placeholder for URLs
      video_url: '',
      pdf_url: '',
      logo_url: ''
  });

  const [assetData, setAssetData] = useState({ name: '', city: 'الرياض', price: '', capacity: '', category: 'عام', description: '' }); // Fallback for service
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  // Navigation State
  const [browseFilters, setBrowseFilters] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<'hall' | 'chalet' | 'service'>('hall');

  const { toast } = useToast();
  const platformFees = { hall: 500, service: 200 };

  const applyTheme = (config: ThemeConfig) => {
      const root = document.documentElement;
      if(config.primaryColor) root.style.setProperty('--primary', config.primaryColor);
      if(config.secondaryColor) root.style.setProperty('--secondary', config.secondaryColor);
      if(config.backgroundColor) root.style.setProperty('--background', config.backgroundColor);
      if(config.borderRadius) root.style.setProperty('--radius', config.borderRadius);
  };

  // 1. Fetch Session & Theme
  useEffect(() => {
    // Theme Fetch
    const fetchTheme = async () => {
        const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
        if (data?.value?.theme_config) {
            setThemeConfig(data.value.theme_config);
            applyTheme(data.value.theme_config);
        }
    };
    fetchTheme();

    // Auth Fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchProfile(session.user.id);
      else {
          setUserProfile(null);
          setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchProfile(session.user.id);
      else {
          setUserProfile(null);
          setLoading(false);
          setActiveTab('home');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) setUserProfile(data as UserProfile);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    setActiveTab('home');
  };

  const navigateToDetails = (tab: string, item: any) => {
      if (tab === 'hall_details') {
          setDetailItem(item.item);
          setDetailType(item.type);
          setActiveTab('hall_details');
      } else {
          setActiveTab(tab);
      }
  };

  const handleNavigate = (tab: string, item?: any) => {
      if (item) {
          navigateToDetails(tab, item);
      } else if (tab === 'browse_halls') {
          setBrowseFilters({ entityType: 'hall' });
          setActiveTab('browse_halls');
      } else if (tab === 'browse_services') {
          setBrowseFilters({ entityType: 'service' });
          setActiveTab('browse_services');
      } else {
          setActiveTab(tab);
      }
  };

  const routeUser = async (profile: UserProfile, userId: string) => {
      if (profile.role === 'vendor') {
          // Check subscription status first
          const hasSubscription = profile.has_active_subscription || 
                                 profile.subscription_status === 'hall' || 
                                 profile.subscription_status === 'service' ||
                                 profile.subscription_status === 'both';

          // Check if vendor has ANY assets (Halls or Services)
          const [halls, services] = await Promise.all([
              supabase.from('halls').select('id', { count: 'exact', head: true }).eq('vendor_id', userId),
              supabase.from('services').select('id', { count: 'exact', head: true }).eq('vendor_id', userId)
          ]);

          const hasAssets = (halls.count || 0) > 0 || (services.count || 0) > 0;

          // If no subscription, redirect to subscription page
          if (!hasSubscription) {
              setActiveTab('vendor_subscription');
              return;
          }

          if (hasAssets) {
              if (profile.status === 'approved') {
                  setActiveTab('dashboard');
              } else {
                  setActiveTab('request_pending');
              }
          } else {
              setRegData(prev => ({
                  ...prev,
                  fullName: profile.full_name || 'الشريك',
                  email: profile.email || '',
                  phone: profile.phone_number || ''
              }));
              setRegStep(4); // Go to asset selection
              setActiveTab('vendor_register');
          }
      } else if (profile.role === 'super_admin') {
          setActiveTab('admin_dashboard');
      } else {
          setActiveTab('home');
      }
  };

  // --- SMART LOGIN REDIRECT LOGIC ---
  const handleLoginSuccess = async () => {
      setAuthLoading(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Retry logic to fetch profile in case trigger is slow
          let profileData = null;
          for (let i = 0; i < 3; i++) {
              const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
              if (data) {
                  profileData = data;
                  break;
              }
              await new Promise(r => setTimeout(r, 1000)); // Wait 1s
          }
          
          if (profileData) {
              setUserProfile(profileData as UserProfile);
              await routeUser(profileData as UserProfile, user.id);
          } else {
              // Self-healing: Profile Missing (Trigger Failed) - Force manual creation
              console.warn('Profile not found after retries, attempting manual creation...');
              const { error: insertError } = await supabase.from('profiles').insert([{
                  id: user.id,
                  email: user.email,
                  full_name: user.user_metadata.full_name || '',
                  role: user.user_metadata.role || 'user',
                  status: user.user_metadata.role === 'vendor' ? 'pending' : 'approved',
                  is_enabled: true,
                  phone_number: user.user_metadata.phone_number || ''
              }]);

              if (!insertError) {
                  // Fetch again
                  const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                  if (newProfile) {
                      setUserProfile(newProfile as UserProfile);
                      await routeUser(newProfile as UserProfile, user.id);
                  }
              } else {
                  console.error('Manual creation failed', insertError);
                  toast({ title: 'خطأ', description: 'تعذر الوصول لملف المستخدم.', variant: 'destructive' });
              }
          }
      } catch (err) {
          console.error(err);
          toast({ title: 'خطأ', description: 'حدث خطأ أثناء التوجيه', variant: 'destructive' });
      } finally {
          setAuthLoading(false);
      }
  };

  const handleRegistrationPayClick = async (method: string) => {
      setAuthLoading(true);
      try {
          const currentUser = (await supabase.auth.getUser()).data.user;
          if (!currentUser) throw new Error('User not found');

          // --- FAILSAFE: Create Profile if missing (Critical Fix) ---
          const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', currentUser.id).maybeSingle();
          
          if (!existingProfile) {
              const { error: profileError } = await supabase.from('profiles').insert([{
                  id: currentUser.id,
                  email: currentUser.email,
                  full_name: regData.fullName || currentUser.user_metadata.full_name || '',
                  phone_number: regData.phone || currentUser.user_metadata.phone_number || '',
                  role: 'vendor',
                  status: 'pending',
                  is_enabled: true,
                  business_name: regData.fullName, // Default business name
                  hall_limit: 1,
                  service_limit: 3
              }]);
              
              if (profileError) {
                  console.error('Manual profile creation failed:', profileError);
                  throw new Error('فشل إنشاء ملف المستخدم. يرجى المحاولة مرة أخرى.');
              }
          } else {
              // Ensure phone number is updated
              await supabase.from('profiles').update({
                  phone_number: regData.phone
              }).eq('id', currentUser.id);
          }
          // ---------------------------------------------------------

          // Construct Payload based on type
          let assetPayload;
          let table;

          if (selectedType === 'hall') {
              table = 'halls';
              assetPayload = {
                  vendor_id: currentUser.id,
                  name: hallFormData.name_ar,
                  name_en: hallFormData.name_en,
                  city: hallFormData.city,
                  capacity: (Number(hallFormData.capacity_men) || 0) + (Number(hallFormData.capacity_women) || 0),
                  capacity_men: Number(hallFormData.capacity_men) || 0,
                  capacity_women: Number(hallFormData.capacity_women) || 0,
                  price_per_night: 5000, 
                  description: hallFormData.description_ar,
                  description_en: hallFormData.description_en,
                  type: 'hall',
                  is_active: true
              };
          } else {
              table = 'services';
              assetPayload = {
                  vendor_id: currentUser.id,
                  name: assetData.name,
                  category: assetData.category,
                  price: Number(assetData.price) || 0,
                  description: assetData.description,
                  is_active: true
              };
          }

          const { error: assetError } = await supabase.from(table).insert([assetPayload]);
          
          if (assetError) {
              console.error('Asset creation error:', assetError);
              toast({ title: 'تنبيه', description: 'تم إنشاء الحساب ولكن حدث خطأ في إضافة النشاط.', variant: 'warning' });
          } else {
              toast({ title: 'تم تقديم الطلب', description: 'تمت إضافة النشاط بنجاح وبانتظار الموافقة.', variant: 'success' });
          }

          setIsPaymentModalOpen(false);
          await fetchProfile(currentUser.id);
          
          // Redirect to "Request Pending" page instead of Dashboard immediately
          setActiveTab('request_pending');

      } catch (err: any) {
          console.error(err);
          toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
      } finally {
          setAuthLoading(false);
      }
  };

  // Define Authentication Pages
  const isAuthPage = ['vendor_login', 'vendor_register', 'guest_login', 'forgot_password', 'request_pending'].includes(activeTab);
  const isPublicPage = ['home', 'browse_halls', 'browse_services', 'hall_details', 'store_page', 'legal_terms', 'legal_privacy', 'legal_sla', 'legal_help', 'legal_about'].includes(activeTab);

  // Helper for Hall Form Rendering
  const renderHallForm = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div>
            <h3 className="text-base font-black text-primary mb-3 text-right">معلومات مالك القاعة</h3>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="رقم الجوال" value={regData.phone} readOnly className="bg-gray-50 border-transparent h-11 text-sm font-bold" />
                    <Input label="البريد الإلكتروني" value={regData.email} readOnly className="bg-gray-50 border-transparent text-left h-11 text-sm font-bold" dir="ltr" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">مدينة القاعة</label>
                    <select className="w-full h-11 border border-gray-200 rounded-xl px-4 text-sm font-bold bg-white outline-none focus:border-primary transition-all" value={hallFormData.city} onChange={e => setHallFormData({...hallFormData, city: e.target.value})}>
                        {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="رخصة العمل (اختياري)" value={hallFormData.license_number} onChange={e => setHallFormData({...hallFormData, license_number: e.target.value})} className="h-11 text-sm font-bold" />
                    <Input label="الرقم الموحد (اختياري)" value={hallFormData.unified_number} onChange={e => setHallFormData({...hallFormData, unified_number: e.target.value})} className="h-11 text-sm font-bold" />
                </div>
            </div>
        </div>

        <div>
            <h3 className="text-base font-black text-primary mb-3 text-right">معلومات القاعة الأساسية</h3>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="اسم القاعة عربي" value={hallFormData.name_ar} onChange={e => setHallFormData({...hallFormData, name_ar: e.target.value})} className="h-11 text-sm font-bold" />
                    <Input label="اسم القاعة انجليزي" value={hallFormData.name_en} onChange={e => setHallFormData({...hallFormData, name_en: e.target.value})} className="text-left h-11 text-sm font-bold" dir="ltr" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="عدد الضيوف للرجال" type="number" value={hallFormData.capacity_men} onChange={e => setHallFormData({...hallFormData, capacity_men: e.target.value})} className="h-11 text-sm font-bold" />
                    <Input label="عدد الضيوف للنساء" type="number" value={hallFormData.capacity_women} onChange={e => setHallFormData({...hallFormData, capacity_women: e.target.value})} className="h-11 text-sm font-bold" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">نبذة عن القاعة بالعربي</label>
                        <textarea className="w-full h-20 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none resize-none focus:border-primary transition-all" value={hallFormData.description_ar} onChange={e => setHallFormData({...hallFormData, description_ar: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">نبذة عن القاعة بالانجليزي</label>
                        <textarea className="w-full h-20 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none resize-none focus:border-primary transition-all text-left" dir="ltr" value={hallFormData.description_en} onChange={e => setHallFormData({...hallFormData, description_en: e.target.value})} />
                    </div>
                </div>
            </div>
        </div>

        <div>
            <h3 className="text-base font-black text-primary mb-3 text-right">المرفقات والوسائط</h3>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Logo Section */}
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-gray-700">شعار القاعة (Logo)</p>
                        <p className="text-[10px] text-gray-400 mt-1">PNG, JPG حتى 2MB</p>
                    </div>

                    {/* Gallery Section */}
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                            <ImageIcon className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-gray-700">صور القاعة (المعرض)</p>
                        <p className="text-[10px] text-gray-400 mt-1">رفع صور متعددة دفعة واحدة</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'request_pending') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-6 font-tajawal">
                <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mb-6 animate-pulse border-4 border-yellow-100">
                    <Clock className="w-10 h-10 text-yellow-600" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-2">طلبك قيد المراجعة</h2>
                <p className="text-gray-500 max-w-md font-bold leading-relaxed mb-8">
                    شكراً لانضمامك! يقوم فريق الإدارة حالياً بمراجعة بياناتك والنشاط الذي قمت بإضافته. سيتم تفعيل حسابك وإشعارك قريباً عبر البريد الإلكتروني.
                </p>
                <Button variant="outline" onClick={handleLogout} className="h-12 px-8 rounded-xl font-bold border-gray-300">
                    عودة للرئيسية
                </Button>
            </div>
        );
    }

    if (activeTab === 'vendor_register') {
        if (regStep === 3) {
            return (
                <div className="w-full flex flex-col items-center justify-center p-8 min-h-screen bg-gray-50/50">
                    <img 
                        src={themeConfig?.logoUrl || "https://dash.hall.sa/logo.svg"} 
                        alt="Logo" 
                        className="h-64 w-auto mb-8 object-contain" 
                    />
                    <div className="text-center mb-12 space-y-3">
                        <h1 className="text-4xl font-black text-primary">مرحبا ألف {regData.fullName}</h1>
                        <p className="text-xl text-gray-500 font-bold">ما هو نوع النشاط الذي تريد إضافته؟</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
                        <button onClick={() => { setSelectedType('hall'); setRegStep(4); }} className="group p-10 bg-white border-2 border-gray-100 rounded-[3rem] hover:border-primary/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center gap-6">
                            <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 group-hover:bg-primary group-hover:text-white transition-colors"><Building2 className="w-10 h-10" /></div>
                            <div className="text-center"><h3 className="text-2xl font-black text-gray-900 mb-2">القاعات</h3><p className="text-sm font-bold text-gray-400">للمناسبات الكبيرة والزواجات</p></div>
                        </button>
                        <button onClick={() => { setSelectedType('service'); setRegStep(4); }} className="group p-10 bg-white border-2 border-gray-100 rounded-[3rem] hover:border-orange-500/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center gap-6">
                            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Sparkles className="w-10 h-10" /></div>
                            <div className="text-center"><h3 className="text-2xl font-black text-gray-900 mb-2">الخدمات الإضافية</h3><p className="text-sm font-bold text-gray-400">ضيافة، تصوير، كوش، وغيرها</p></div>
                        </button>
                    </div>
                </div>
            );
        } else if (regStep === 4) {
            return (
                <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-tajawal" dir="rtl">
                    <div className="text-center mb-10 space-y-4">
                        <img src={themeConfig?.logoUrl || "https://dash.hall.sa/logo.svg"} alt="Logo" className="h-32 w-auto mx-auto object-contain mb-4" />
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black text-primary">إضافة {selectedType === 'hall' ? 'قاعة' : 'خدمة'} جديدة</h1>
                            <p className="text-gray-500 font-bold text-sm">أكمل البيانات أدناه لإدراج نشاطك في المنصة</p>
                        </div>
                    </div>
                    
                    <div className="w-full max-w-4xl space-y-8">
                        {/* Form Section */}
                        {selectedType === 'hall' ? renderHallForm() : (
                            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6 max-w-2xl mx-auto">
                                <h3 className="text-lg font-black text-primary mb-4 border-b border-gray-100 pb-4">بيانات الخدمة</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="الاسم التجاري" value={assetData.name} onChange={e => setAssetData({...assetData, name: e.target.value})} className="h-11 rounded-xl font-bold" />
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">التصنيف</label>
                                        <select className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-primary" value={assetData.category} onChange={e => setAssetData({...assetData, category: e.target.value})}>
                                            {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="السعر يبدأ من" type="number" value={assetData.price} onChange={e => setAssetData({...assetData, price: e.target.value})} className="h-11 rounded-xl font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">وصف الخدمة</label>
                                    <textarea className="w-full h-24 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none resize-none focus:border-primary" value={assetData.description} onChange={e => setAssetData({...assetData, description: e.target.value})} />
                                </div>
                            </div>
                        )}

                        {/* Payment & Action Section - Light Mode Redesign */}
                        <div className="bg-white rounded-[2rem] p-8 border border-gray-200 shadow-xl space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-primary/5 rounded-xl text-primary"><CreditCard className="w-6 h-6" /></div>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900">ملخص الاشتراك</h3>
                                            <p className="text-gray-400 text-xs font-bold mt-0.5">تفعيل فوري للباقة السنوية</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                                        <div className="flex justify-between text-sm font-bold text-gray-600">
                                            <span>رسوم الاشتراك</span>
                                            <span>{selectedType === 'hall' ? '500' : '200'} ر.س</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-bold text-gray-600">
                                            <span>الضريبة (15%)</span>
                                            <span>{(selectedType === 'hall' ? 500 : 200) * 0.15} ر.س</span>
                                        </div>
                                        <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-black text-primary">
                                            <span>الإجمالي</span>
                                            <span>{(selectedType === 'hall' ? 500 : 200) * 1.15} ر.س</span>
                                        </div>
                                    </div>

                                    {/* Coupon Input */}
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input 
                                                className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 pl-10 text-sm font-bold outline-none focus:border-primary focus:bg-white transition-all uppercase"
                                                placeholder="كود الخصم"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value)}
                                            />
                                            <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        </div>
                                        <Button variant="outline" className="h-11 px-6 rounded-xl font-bold border-gray-200 hover:border-primary hover:text-primary">تطبيق</Button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 w-full md:w-auto min-w-[280px]">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">إتمام العملية</p>
                                    
                                    <button onClick={() => handleRegistrationPayClick('card')} className="h-14 w-full rounded-xl bg-gray-900 text-white flex items-center justify-center hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 gap-3 font-bold group">
                                        <CreditCard className="w-5 h-5 group-hover:text-primary transition-colors" />
                                        الدفع وتفعيل الاشتراك
                                    </button>

                                    <p className="text-[10px] text-gray-400 text-center font-bold mt-2">
                                        بالضغط على الدفع، أنت توافق على <a href="#" className="text-primary underline hover:text-primary/80 transition-colors">شروط وأحكام المنصة</a>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setRegStep(3)} className="w-full text-center text-xs font-bold text-gray-400 hover:text-gray-600 mt-6 transition-colors mb-4 flex items-center justify-center gap-1">
                            <ArrowRight className="w-3 h-3" /> العودة وتغيير النشاط
                        </button>

                        {/* Return to Home Button */}
                        <div className="pt-4 border-t border-gray-200">
                            <button
                                onClick={() => { setActiveTab('home'); setRegStep(1); }}
                                className="w-full h-12 rounded-2xl font-bold text-sm text-gray-500 hover:text-primary hover:bg-gray-50 border border-gray-200 transition-all flex items-center justify-center gap-2"
                            >
                                <HomeIcon className="w-4 h-4" />
                                العودة إلى الصفحة الرئيسية
                            </button>
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <VendorAuth
                    onRegister={() => { setRegStep(3); setActiveTab('vendor_register'); }}
                    onLogin={handleLoginSuccess}
                    onDataChange={setRegData}
                    onBack={() => setActiveTab('home')}
                />
            );
        }
    }

    if (activeTab === 'vendor_login') {
        return <VendorAuth isLogin onRegister={() => setActiveTab('vendor_register')} onLogin={handleLoginSuccess} onBack={() => setActiveTab('home')} onForgotPassword={() => setActiveTab('forgot_password')} />;
    }

    switch (activeTab) {
      case 'dashboard': return userProfile ? <Dashboard user={userProfile} /> : null;
      case 'admin_dashboard': return <AdminDashboard />;
      case 'my_halls': return userProfile ? <VendorHalls user={userProfile} /> : null;
      case 'admin_users': return <UsersManagement />;
      case 'subscriptions': return <VendorSubscriptions />;
      case 'hall_bookings': return userProfile ? <Bookings user={userProfile} /> : null;
      case 'browse_halls': return <BrowseHalls user={userProfile} entityType="hall" onBack={() => setActiveTab('home')} onNavigate={handleNavigate} initialFilters={browseFilters} />;
      case 'browse_services': return <BrowseHalls user={userProfile} entityType="service" onBack={() => setActiveTab('home')} onNavigate={handleNavigate} initialFilters={browseFilters} />;
      case 'halls_page': return <PublicListing type="hall" title="قاعات الأفراح" subtitle="اختر من بين أفخم القاعات لليلة العمر" onNavigate={handleNavigate} />;
      case 'services_page': return <PublicListing type="service" title="خدمات المناسبات" subtitle="كل ما تحتاجه لإكمال فرحتك" onNavigate={handleNavigate} />;
      case 'hall_details': return detailItem ? (detailType === 'service' ? <ServiceDetails item={detailItem} user={userProfile} onBack={() => setActiveTab('home')} /> : detailType === 'chalet' ? <ChaletDetails item={detailItem} user={userProfile} onBack={() => setActiveTab('home')} /> : <HallDetails item={detailItem} user={userProfile} onBack={() => setActiveTab('home')} />) : null;
      case 'store_page': return <PublicStore />;
      case 'guest_login': return <GuestLogin onBack={() => setActiveTab('home')} />;
      case 'forgot_password': return <ForgotPassword onBack={() => setActiveTab('vendor_login')} onSuccess={() => setActiveTab('vendor_login')} />;
      case 'guest_bookings': return userProfile ? <GuestPortal user={userProfile} onLogout={handleLogout} /> : <GuestLogin onBack={() => setActiveTab('home')} />;
      case 'guest_dashboard': return userProfile ? <GuestPortal user={userProfile} onLogout={handleLogout} /> : null;
      case 'settings': return <SystemSettings />;
      case 'admin_cms': return <ContentCMS />;
      case 'admin_categories': return <ServiceCategories />;
      case 'admin_store': return userProfile ? <AdminStore user={userProfile} /> : null;
      case 'coupons': return userProfile ? <VendorCoupons user={userProfile} /> : null;
      case 'calendar': return userProfile ? <CalendarBoard user={userProfile} /> : null;
      case 'vendor_services': return userProfile ? <VendorServices user={userProfile} /> : null;
      case 'brand_settings': return userProfile ? <VendorBrandSettings user={userProfile} onUpdate={() => userProfile && fetchProfile(userProfile.id)} /> : null;
      case 'accounting': return userProfile ? <VendorAccounting user={userProfile} /> : null;
      case 'vendor_marketplace': return userProfile ? <VendorMarketplace user={userProfile} /> : null;
      case 'vendor_clients': return userProfile ? <VendorClients user={userProfile} /> : null;
      case 'vendor_subscription': return userProfile ? <VendorSubscription user={userProfile} onComplete={() => setActiveTab('dashboard')} /> : null;
      case 'featured_halls': return userProfile?.role === 'super_admin' ? <FeaturedHallsManagement user={userProfile} /> : null;
      case 'admin_requests': return <AdminRequests />;
      default: return <Home user={userProfile} onLoginClick={() => setActiveTab('vendor_login')} onRegisterClick={() => setActiveTab('vendor_register')} onBrowseHalls={(f) => { setBrowseFilters(f); setActiveTab('browse_halls'); }} onNavigate={handleNavigate} onLogout={handleLogout} />;
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <NotificationProvider userId={userProfile?.id}>
        <div className={`min-h-screen ${userProfile?.role !== 'user' && !isPublicPage && !isAuthPage ? 'bg-gray-50' : 'bg-white'}`}>
        {isPublicPage && !isAuthPage && (
            <PublicNavbar user={userProfile} onLoginClick={() => setActiveTab('vendor_login')} onRegisterClick={() => setActiveTab('vendor_register')} onNavigate={handleNavigate} onLogout={handleLogout} activeTab={activeTab} />
        )}
        {isPublicPage || isAuthPage ? (
            <main className={`pt-32 ${isAuthPage ? 'h-full pt-0' : ''}`}>{renderContent()}</main>
        ) : (
            <div className="flex">
            <Sidebar user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} isOpen={false} setIsOpen={() => {}} platformLogo={userProfile?.role === 'vendor' ? userProfile?.custom_logo_url : themeConfig?.logoUrl || "https://dash.hall.sa/logo.svg"} />
            <main className={`flex-1 p-4 lg:p-8 transition-all duration-300 ${userProfile ? 'lg:mr-72' : ''}`}>{renderContent()}</main>
            </div>
        )}
        {isPublicPage && !isAuthPage && <Footer />}
        </div>
    </NotificationProvider>
  );
};

export default App;
