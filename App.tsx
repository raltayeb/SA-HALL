
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
import { VendorMarketplace } from './pages/VendorMarketplace';
import { VendorClients } from './pages/VendorClients'; 
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Modal } from './components/ui/Modal'; 
import { PriceTag } from './components/ui/PriceTag';
import { prepareCheckout, verifyPaymentStatus } from './services/paymentService';
import { HyperPayForm } from './components/Payment/HyperPayForm';
import { 
  Loader2, CheckCircle2, Mail, ArrowLeft,
  Globe, Sparkles, Building2, Palmtree, Lock, CreditCard, User, Check, Eye, EyeOff, LogOut, Plus, ArrowRight, XCircle, FileText, Upload, Clock
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
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
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
      if (item) navigateToDetails(tab, item);
      else setActiveTab(tab);
  };

  // --- SMART LOGIN REDIRECT LOGIC ---
  const handleLoginSuccess = async () => {
      setAuthLoading(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          
          if (profile) {
              setUserProfile(profile as UserProfile);

              if (profile.role === 'vendor') {
                  // Check if vendor has ANY assets (Halls or Services)
                  const [halls, services] = await Promise.all([
                      supabase.from('halls').select('id', { count: 'exact', head: true }).eq('vendor_id', user.id),
                      supabase.from('services').select('id', { count: 'exact', head: true }).eq('vendor_id', user.id)
                  ]);

                  const hasAssets = (halls.count || 0) > 0 || (services.count || 0) > 0;

                  if (hasAssets) {
                      if (profile.status === 'approved') {
                          // 1. Has assets AND Approved -> Dashboard
                          setActiveTab('dashboard');
                      } else {
                          // 2. Has assets BUT Pending -> Request Pending Screen
                          setActiveTab('request_pending');
                      }
                  } else {
                      // 3. No assets -> Selection Screen (Step 3)
                      setRegData(prev => ({ 
                          ...prev, 
                          fullName: profile.full_name || 'الشريك', 
                          email: profile.email || '',
                          phone: profile.phone_number || ''
                      }));
                      setRegStep(3); 
                      setActiveTab('vendor_register');
                  }
              } else if (profile.role === 'super_admin') {
                  setActiveTab('admin_dashboard');
              } else {
                  // Normal User
                  setActiveTab('home');
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
              
              await supabase.from('profiles').update({
                  phone_number: regData.phone
              }).eq('id', currentUser.id);

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
  const isAuthPage = ['vendor_login', 'vendor_register', 'guest_login', 'request_pending'].includes(activeTab);
  const isPublicPage = ['home', 'browse_halls', 'browse_services', 'hall_details', 'store_page'].includes(activeTab);

  // Helper for Hall Form Rendering
  const renderHallForm = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div>
            <h3 className="text-lg font-black text-primary mb-4 text-right">معلومات المالك</h3>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="رقم الجوال" value={regData.phone} readOnly className="bg-gray-50 border-transparent" />
                    <Input label="البريد الإلكتروني" value={regData.email} readOnly className="bg-gray-50 border-transparent text-left" dir="ltr" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">مدينة القاعة</label>
                    <select className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm font-bold bg-white outline-none focus:border-primary" value={hallFormData.city} onChange={e => setHallFormData({...hallFormData, city: e.target.value})}>
                        {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="رخصة العمل (اختياري)" value={hallFormData.license_number} onChange={e => setHallFormData({...hallFormData, license_number: e.target.value})} />
                    <Input label="الرقم الموحد (اختياري)" value={hallFormData.unified_number} onChange={e => setHallFormData({...hallFormData, unified_number: e.target.value})} />
                </div>
            </div>
        </div>
        <div>
            <h3 className="text-lg font-black text-primary mb-4 text-right">معلومات القاعة الأساسية</h3>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="اسم القاعة عربي" value={hallFormData.name_ar} onChange={e => setHallFormData({...hallFormData, name_ar: e.target.value})} />
                    <Input label="اسم القاعة انجليزي" value={hallFormData.name_en} onChange={e => setHallFormData({...hallFormData, name_en: e.target.value})} className="text-left" dir="ltr" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="عدد الضيوف للرجال" type="number" value={hallFormData.capacity_men} onChange={e => setHallFormData({...hallFormData, capacity_men: e.target.value})} />
                    <Input label="عدد الضيوف للنساء" type="number" value={hallFormData.capacity_women} onChange={e => setHallFormData({...hallFormData, capacity_women: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500">نبذة عن القاعة بالعربي</label>
                        <textarea className="w-full h-24 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none resize-none focus:border-primary" value={hallFormData.description_ar} onChange={e => setHallFormData({...hallFormData, description_ar: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500">نبذة عن القاعة بالانجليزي</label>
                        <textarea className="w-full h-24 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none resize-none focus:border-primary text-left" dir="ltr" value={hallFormData.description_en} onChange={e => setHallFormData({...hallFormData, description_en: e.target.value})} />
                    </div>
                </div>
            </div>
        </div>
        <div>
            <h3 className="text-lg font-black text-primary mb-4 text-right">المرفقات والوسائط</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{ label: 'صور القاعة من الامام', id: 'front' }, { label: 'صور القاعة من الخلف', id: 'back' }, { label: 'صور القاعة', id: 'gen1' }, { label: 'صور القاعة', id: 'gen2' }, { label: 'فيديو تور للقاعة', id: 'video' }, { label: 'فيديو تعريفي (اختياري)', id: 'video2' }, { label: 'كتالوج PDF للباقات', id: 'pdf' }, { label: 'اللوجو', id: 'logo' }].map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-gray-500 text-center">{item.label}</span>
                        <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all group">
                            <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Plus className="w-6 h-6" /></div>
                        </div>
                    </div>
                ))}
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
                        <h1 className="text-4xl font-black text-primary">مرحباً ألف، {regData.fullName}</h1>
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
                    <div className="text-center mb-8 space-y-4">
                        <img src={themeConfig?.logoUrl || "https://dash.hall.sa/logo.svg"} alt="Logo" className="h-20 w-auto mx-auto object-contain" />
                        <div className="space-y-1">
                            <h1 className="text-2xl font-black text-primary">إضافة {selectedType === 'hall' ? 'قاعة' : 'خدمة'} جديدة</h1>
                            <p className="text-gray-500 font-bold text-sm">أكمل البيانات أدناه لإدراج نشاطك في المنصة</p>
                        </div>
                    </div>
                    <div className="w-full max-w-5xl">
                        {selectedType === 'hall' ? renderHallForm() : (
                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                                <h3 className="text-lg font-black text-primary mb-4 border-b border-gray-100 pb-4">بيانات الخدمة</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input label="الاسم التجاري" value={assetData.name} onChange={e => setAssetData({...assetData, name: e.target.value})} className="h-12 rounded-xl" />
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500">التصنيف</label>
                                        <select className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 text-sm font-bold outline-none" value={assetData.category} onChange={e => setAssetData({...assetData, category: e.target.value})}>
                                            {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input label="السعر يبدأ من" type="number" value={assetData.price} onChange={e => setAssetData({...assetData, price: e.target.value})} className="h-12 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500">وصف الخدمة</label>
                                    <textarea className="w-full h-24 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none resize-none" value={assetData.description} onChange={e => setAssetData({...assetData, description: e.target.value})} />
                                </div>
                            </div>
                        )}
                        <div className="bg-gray-900 rounded-[2rem] p-8 mt-8 text-white shadow-2xl">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                <div>
                                    <h3 className="text-xl font-black mb-1 flex items-center gap-2"><CreditCard className="w-6 h-6 text-primary" /> الاشتراك والتفعيل</h3>
                                    <p className="text-white/60 text-sm font-bold">رسوم الاشتراك السنوي: <span className="text-white font-black text-lg">{selectedType === 'hall' ? '500' : '200'} ر.س</span></p>
                                </div>
                                {isPaymentModalOpen ? (
                                    <div className="text-center bg-white/10 p-4 rounded-xl border border-white/20">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                                        <p className="text-xs font-bold text-white/80">جاري معالجة الدفع...</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3 w-full md:w-auto">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest text-center">اختر وسيلة الدفع</p>
                                        <div className="flex gap-3">
                                            <button onClick={() => handleRegistrationPayClick('apple')} className="h-12 w-20 rounded-xl bg-black border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"><img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" className="h-5 invert" /></button>
                                            <button onClick={() => handleRegistrationPayClick('stc')} className="h-12 w-20 rounded-xl bg-[#4F008C] border border-white/20 flex items-center justify-center hover:opacity-90 transition-opacity text-xs font-bold">stc pay</button>
                                            <button onClick={() => handleRegistrationPayClick('card')} className="h-12 w-20 rounded-xl bg-white border border-white/20 flex items-center justify-center hover:bg-gray-100 transition-colors"><img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4" /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button onClick={() => setRegStep(3)} className="w-full text-center text-xs font-bold text-gray-400 hover:text-gray-600 mt-6 transition-colors mb-12">العودة وتغيير النشاط</button>
                    </div>
                </div>
            );
        } else {
            return (
                <VendorAuth 
                    onRegister={() => setRegStep(3)} 
                    onLogin={handleLoginSuccess} 
                    onDataChange={setRegData} 
                    onBack={() => setActiveTab('home')} 
                />
            );
        }
    }

    if (activeTab === 'vendor_login') {
        return <VendorAuth isLogin onRegister={() => setActiveTab('vendor_register')} onLogin={handleLoginSuccess} onBack={() => setActiveTab('home')} />;
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
            <main className={`pt-0 ${isAuthPage ? 'h-full' : ''}`}>{renderContent()}</main>
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
