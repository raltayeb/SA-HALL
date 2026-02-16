
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
  Globe, Sparkles, Building2, Palmtree, Lock, CreditCard, User, Check, Eye, EyeOff, LogOut, Plus, ArrowRight, XCircle, FileText
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
  const [assetData, setAssetData] = useState({ name: '', city: 'الرياض', price: '', capacity: '', category: 'عام', description: '' });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  // Navigation State
  const [browseFilters, setBrowseFilters] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<'hall' | 'chalet' | 'service'>('hall');

  const { toast } = useToast();
  const platformFees = { hall: 500, service: 200 };

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

  const applyTheme = (config: ThemeConfig) => {
      const root = document.documentElement;
      if(config.primaryColor) root.style.setProperty('--primary', config.primaryColor);
      if(config.secondaryColor) root.style.setProperty('--secondary', config.secondaryColor);
      if(config.backgroundColor) root.style.setProperty('--background', config.backgroundColor);
      if(config.borderRadius) root.style.setProperty('--radius', config.borderRadius);
  };

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

  const handleRegistrationPayClick = async (method: string) => {
      setAuthLoading(true);
      try {
          // 1. Create Auth User
          const { data: authData, error: authError } = await supabase.auth.signUp({
              email: regData.email,
              password: regData.password,
              options: {
                  data: {
                      full_name: regData.fullName,
                      role: 'vendor',
                      phone_number: regData.phone,
                      business_name: assetData.name,
                      payment_status: 'paid' // Will be handled by handle_new_user trigger
                  }
              }
          });

          if (authError) throw authError;
          if (!authData.user) throw new Error('User creation failed');

          // 2. Create the Asset (Hall/Service)
          // Profile is created automatically by DB trigger on signUp. We wait a moment or just insert asset using authData.user.id
          
          // Small delay to ensure profile trigger finished (optional, but safer)
          await new Promise(resolve => setTimeout(resolve, 1000));

          const assetPayload = selectedType === 'hall' ? {
              vendor_id: authData.user.id,
              name: assetData.name,
              city: assetData.city,
              capacity: Number(assetData.capacity) || 0,
              price_per_night: Number(assetData.price) || 0,
              description: assetData.description,
              type: 'hall',
              is_active: true
          } : {
              vendor_id: authData.user.id,
              name: assetData.name,
              category: assetData.category,
              price: Number(assetData.price) || 0,
              description: assetData.description,
              is_active: true
          };

          const table = selectedType === 'hall' ? 'halls' : 'services';
          const { error: assetError } = await supabase.from(table).insert([assetPayload]);
          
          if (assetError) {
              console.error('Asset creation error:', assetError);
              // Not throwing here to allow login to proceed, but alerting user
              toast({ title: 'تنبيه', description: 'تم إنشاء الحساب ولكن حدث خطأ في إضافة النشاط. يرجى إضافته من لوحة التحكم.', variant: 'warning' });
          } else {
              toast({ title: 'تم الاشتراك بنجاح', variant: 'success' });
          }

          setIsPaymentModalOpen(false);
          // Fetch profile to login immediately
          await fetchProfile(authData.user.id);
          setActiveTab('dashboard');

      } catch (err: any) {
          console.error(err);
          toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
      } finally {
          setAuthLoading(false);
      }
  };

  // Define Authentication Pages (Hidden Navbar/Footer)
  const isAuthPage = ['vendor_login', 'vendor_register', 'guest_login'].includes(activeTab);
  
  // Define Public Pages (Show Navbar/Footer UNLESS it's an Auth page)
  const isPublicPage = ['home', 'browse_halls', 'browse_services', 'hall_details', 'store_page'].includes(activeTab);

  const renderContent = () => {
    if (activeTab === 'vendor_register') {
        if (regStep === 3) {
            return (
                <div className="w-full flex flex-col items-center justify-center p-8 min-h-screen bg-gray-50/50">
                    <div className="text-center mb-12 space-y-3">
                        <h1 className="text-4xl font-black text-primary">مرحباً، {regData.fullName}</h1>
                        <p className="text-xl text-gray-500 font-bold">ما هو نوع النشاط الذي تريد إضافته؟</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
                        <button onClick={() => { setSelectedType('hall'); setRegStep(4); }} className="group p-10 bg-white border-2 border-gray-100 rounded-[3rem] hover:border-primary/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center gap-6">
                            <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 group-hover:bg-primary group-hover:text-white transition-colors"><Building2 className="w-10 h-10" /></div>
                            <div className="text-center"><h3 className="text-2xl font-black text-gray-900 mb-2">قاعة أفراح</h3><p className="text-sm font-bold text-gray-400">للمناسبات الكبيرة والزواجات</p></div>
                        </button>
                        
                        <button onClick={() => { setSelectedType('service'); setRegStep(4); }} className="group p-10 bg-white border-2 border-gray-100 rounded-[3rem] hover:border-orange-500/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center gap-6">
                            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Sparkles className="w-10 h-10" /></div>
                            <div className="text-center"><h3 className="text-2xl font-black text-gray-900 mb-2">مزود خدمة</h3><p className="text-sm font-bold text-gray-400">ضيافة، تصوير، كوش، وغيرها</p></div>
                        </button>
                    </div>
                </div>
            );
        } else if (regStep === 4) {
            return (
                <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-tajawal" dir="rtl">
                    <div className="text-center mb-10 space-y-4">
                        <img src="https://dash.hall.sa/logo.svg" alt="Logo" className="h-16 w-auto mx-auto" />
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black text-primary">مرحباً ألف، {regData.fullName}</h1>
                            <p className="text-gray-500 font-bold">يرجى إكمال بيانات {selectedType === 'hall' ? 'القاعة' : 'الخدمة'} لإتمام التسجيل</p>
                        </div>
                    </div>

                    <div className="bg-white w-full max-w-4xl p-8 md:p-12 rounded-[3rem] shadow-xl border border-gray-100 text-right animate-in zoom-in-95 duration-300">
                        {/* Registration Step 4 Form content */}
                        <div className="space-y-8">
                            <div className="space-y-5">
                                <h3 className="text-xl font-black text-gray-900 border-b border-gray-100 pb-4">بيانات النشاط</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input label="الاسم التجاري" value={assetData.name} onChange={e => setAssetData({...assetData, name: e.target.value})} className="h-14 rounded-2xl" />
                                        {selectedType === 'service' ? (
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500">التصنيف</label>
                                                <select className="w-full h-14 bg-gray-50 border rounded-2xl px-4 text-sm font-bold outline-none" value={assetData.category} onChange={e => setAssetData({...assetData, category: e.target.value})}>
                                                    {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500">المدينة</label>
                                                <select className="w-full h-14 bg-gray-50 border rounded-2xl px-4 text-sm font-bold outline-none" value={assetData.city} onChange={e => setAssetData({...assetData, city: e.target.value})}>
                                                    {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input 
                                            label={selectedType === 'service' ? 'سعر الخدمة (يبدأ من)' : 'سعر الليلة (يبدأ من)'} 
                                            type="number" 
                                            value={assetData.price} 
                                            onChange={e => setAssetData({...assetData, price: e.target.value})} 
                                            className="h-14 rounded-2xl"
                                        />
                                        {selectedType !== 'service' && (
                                            <Input label="السعة (أشخاص)" type="number" value={assetData.capacity} onChange={e => setAssetData({...assetData, capacity: e.target.value})} className="h-14 rounded-2xl" />
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500">وصف مختصر</label>
                                        <textarea 
                                            className="w-full h-24 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold resize-none outline-none focus:bg-white focus:border-primary"
                                            placeholder="اكتب وصفاً جذاباً لنشاطك..."
                                            value={assetData.description}
                                            onChange={e => setAssetData({...assetData, description: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> ملخص الاشتراك</h3>
                                    <div className="text-left">
                                        <p className="text-[10px] text-gray-400 font-bold mb-1">الإجمالي شامل الضريبة</p>
                                        <PriceTag amount={(selectedType === 'service' ? platformFees.service : platformFees.hall) * 1.15} className="text-xl font-black text-primary" />
                                    </div>
                                </div>
                                
                                {isPaymentModalOpen ? (
                                    <div className="text-center p-4 bg-white rounded-xl border border-dashed border-gray-300">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                                        <p className="text-xs font-bold text-gray-500">بانتظار إتمام الدفع...</p>
                                    </div>
                                ) : authLoading ? (
                                    <div className="w-full h-14 bg-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-500 font-bold">
                                        <Loader2 className="animate-spin" /> جاري إنشاء الحساب...
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-center">اختر وسيلة الدفع للتفعيل الفوري</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            <button onClick={() => handleRegistrationPayClick('apple')} className="h-14 rounded-2xl bg-black flex items-center justify-center hover:opacity-80 transition-opacity border border-black overflow-hidden relative shadow-lg">
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" className="h-6 w-auto invert" />
                                            </button>
                                            <button onClick={() => handleRegistrationPayClick('stc')} className="h-14 rounded-2xl bg-[#4F008C] flex items-center justify-center hover:opacity-80 transition-opacity border border-[#4F008C] overflow-hidden relative shadow-lg">
                                                <span className="text-white font-black text-sm">stc pay</span>
                                            </button>
                                            <button onClick={() => handleRegistrationPayClick('card')} className="h-14 rounded-2xl bg-white flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200 overflow-hidden relative gap-2 px-1 shadow-sm">
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4 w-auto" />
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 w-auto" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <button onClick={() => setRegStep(3)} className="w-full text-center text-xs font-bold text-gray-400 hover:text-gray-600 mt-6 transition-colors">
                            العودة وتغيير النشاط
                        </button>
                    </div>
                </div>
            );
        } else {
            return <VendorAuth onRegister={() => setRegStep(3)} onLogin={() => {}} onDataChange={setRegData} onBack={() => setActiveTab('home')} />;
        }
    }

    if (activeTab === 'vendor_login') {
        return <VendorAuth isLogin onRegister={() => setActiveTab('vendor_register')} onLogin={() => { setActiveTab('dashboard'); fetchProfile(supabase.auth.getUser().then(u => u.data.user!.id) as any); }} onBack={() => setActiveTab('home')} />;
    }

    // Other pages
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
      case 'hall_details': return detailItem ? (
          detailType === 'service' 
          ? <ServiceDetails item={detailItem} user={userProfile} onBack={() => setActiveTab('home')} />
          : detailType === 'chalet' 
            ? <ChaletDetails item={detailItem} user={userProfile} onBack={() => setActiveTab('home')} />
            : <HallDetails item={detailItem} user={userProfile} onBack={() => setActiveTab('home')} />
      ) : null;
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

  // Main Return
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <NotificationProvider userId={userProfile?.id}>
        <div className={`min-h-screen ${userProfile?.role !== 'user' && !isPublicPage && !isAuthPage ? 'bg-gray-50' : 'bg-white'}`}>
        
        {/* Render Navbar only if it's a public page AND NOT an auth page */}
        {isPublicPage && !isAuthPage && (
            <PublicNavbar user={userProfile} onLoginClick={() => setActiveTab('vendor_login')} onRegisterClick={() => setActiveTab('vendor_register')} onNavigate={handleNavigate} onLogout={handleLogout} activeTab={activeTab} />
        )}

        {isPublicPage || isAuthPage ? (
            <main className={`pt-0 ${isAuthPage ? 'h-full' : ''}`}>
                {renderContent()}
            </main>
        ) : (
            <div className="flex">
            <Sidebar user={userProfile} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} isOpen={false} setIsOpen={() => {}} platformLogo={userProfile?.role === 'vendor' ? userProfile?.custom_logo_url : themeConfig?.logoUrl || "https://dash.hall.sa/logo.svg"} />
            <main className={`flex-1 p-4 lg:p-8 transition-all duration-300 ${userProfile ? 'lg:mr-72' : ''}`}>
                {renderContent()}
            </main>
            </div>
        )}

        {/* Render Footer only if it's a public page AND NOT an auth page */}
        {isPublicPage && !isAuthPage && <Footer />}
        
        </div>
    </NotificationProvider>
  );
};

export default App;
