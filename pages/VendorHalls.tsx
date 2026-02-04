
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Hall, Booking, SAUDI_CITIES, HALL_AMENITIES } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Modal } from '../components/ui/Modal';
import { 
  Plus, MapPin, Users, X, CheckSquare, Square, 
  Loader2, Building2, Lock, Send, BarChart3, TrendingUp, 
  CalendarCheck, Star, ArrowUpRight, DollarSign, PieChart, Filter
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import { format, subMonths, isSameMonth, parseISO, startOfYear, eachMonthOfInterval, endOfYear } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface VendorHallsProps {
  user: UserProfile;
}

export const VendorHalls: React.FC<VendorHallsProps> = ({ user }) => {
  // Data State
  const [halls, setHalls] = useState<Hall[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [reviewsSummary, setReviewsSummary] = useState<{hallId: string, rating: number}[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [selectedHallId, setSelectedHallId] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentHall, setCurrentHall] = useState<Partial<Hall>>({ images: [], amenities: [], city: SAUDI_CITIES[0] });
  
  // Upgrade Request State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // --- 1. Fetching Data ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Halls
      const { data: hallsData } = await supabase.from('halls').select('*').eq('vendor_id', user.id);
      setHalls(hallsData || []);

      // Fetch Bookings (for analytics)
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .eq('vendor_id', user.id)
        .neq('status', 'cancelled');
      setAllBookings(bookingsData as Booking[] || []);

      // Fetch Reviews (Mocking logic or fetching if table exists)
      const { data: reviewsData } = await supabase.from('reviews').select('hall_id, rating');
      if (reviewsData) {
         setReviewsSummary(reviewsData as any);
      }

      // Check Requests
      const { data: requests } = await supabase.from('upgrade_requests').select('*').eq('vendor_id', user.id).eq('request_type', 'hall').eq('status', 'pending');
      if (requests && requests.length > 0) setHasPendingRequest(true);
      
    } catch (err: any) {
      console.error(err);
      toast({ title: 'خطأ', description: 'فشل في تحميل البيانات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user.id, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- 2. Real-Time Analytics Calculations ---
  const analytics = useMemo(() => {
    // Filter based on selection
    const filteredHalls = selectedHallId === 'all' ? halls : halls.filter(h => h.id === selectedHallId);
    const filteredBookings = selectedHallId === 'all' ? allBookings : allBookings.filter(b => b.hall_id === selectedHallId);
    
    // 1. Total Revenue
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
    
    // 2. Occupancy / Booking Count
    const totalBookingsCount = filteredBookings.length;
    const confirmedBookings = filteredBookings.filter(b => b.status === 'confirmed').length;
    
    // 3. Average Rating
    let avgRating = 0;
    if (selectedHallId === 'all') {
        const ratings = reviewsSummary.map(r => r.rating);
        avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    } else {
        const hallRatings = reviewsSummary.filter(r => r.hallId === selectedHallId).map(r => r.rating);
        avgRating = hallRatings.length ? hallRatings.reduce((a, b) => a + b, 0) / hallRatings.length : 0;
    }

    // 4. Chart Data: Monthly Revenue (Last 6 Months or Current Year)
    const months = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date()
    });

    const chartData = months.map(month => {
        const monthBookings = filteredBookings.filter(b => isSameMonth(new Date(b.booking_date), month));
        const rev = monthBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
        return {
            name: format(month, 'MMM', { locale: arSA }),
            revenue: rev,
            bookings: monthBookings.length
        };
    });

    return {
        totalRevenue,
        totalBookingsCount,
        confirmedBookings,
        avgRating: avgRating || 5.0, // Default to 5 if no ratings
        chartData,
        activeHallsCount: filteredHalls.filter(h => h.is_active).length,
        filteredHallsList: filteredHalls
    };
  }, [selectedHallId, halls, allBookings, reviewsSummary]);


  // --- 3. Handlers ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('hall-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('hall-images').getPublicUrl(fileName);
      
      const newImages = [...(currentHall.images || []), publicUrl];
      setCurrentHall(prev => ({ 
          ...prev, 
          images: newImages,
          image_url: newImages[0]
      }));
      toast({ title: 'تم الرفع', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentHall.name || !currentHall.price_per_night || !currentHall.city) {
      toast({ title: 'تنبيه', description: 'يرجى إكمال البيانات الأساسية.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...currentHall, vendor_id: user.id, image_url: currentHall.images?.[0] || '' };
      const { error } = currentHall.id 
        ? await supabase.from('halls').update(payload).eq('id', currentHall.id)
        : await supabase.from('halls').insert([payload]);

      if (error) throw error;
      toast({ title: 'تم الحفظ', variant: 'success' });
      setIsEditing(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleAddNew = () => {
    if (halls.length >= user.hall_limit) {
       setIsUpgradeModalOpen(true);
       return;
    }
    setCurrentHall({ images: [], amenities: [], is_active: true, city: SAUDI_CITIES[0], capacity: 100 }); 
    setIsEditing(true);
  };

  const handleRequestUpgrade = async () => {
    if(hasPendingRequest) {
        toast({ title: 'طلب معلق', description: 'لديك طلب ترقية قيد المراجعة بالفعل.', variant: 'warning' });
        return;
    }
    try {
        const { error } = await supabase.from('upgrade_requests').insert([{
            vendor_id: user.id,
            request_type: 'hall',
            status: 'pending'
        }]);
        if(error) throw error;
        toast({ title: 'تم الإرسال', description: 'تم إرسال طلب إضافة قاعة للإدارة بنجاح.', variant: 'success' });
        setHasPendingRequest(true);
        setIsUpgradeModalOpen(false);
    } catch (err: any) {
        toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }
  };

  const toggleAmenity = (amenity: string) => {
    const current = currentHall.amenities || [];
    const updated = current.includes(amenity) 
      ? current.filter(a => a !== amenity)
      : [...current, amenity];
    setCurrentHall({ ...currentHall, amenities: updated });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* 1. Header & Context Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div>
           <h2 className="text-3xl font-black text-primary">إدارة القاعات</h2>
           <p className="text-sm text-muted-foreground mt-1 font-bold">
              لوحة التحكم والتحليلات الخاصة بقاعاتك.
           </p>
        </div>
        
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-200">
            <Filter className="w-5 h-5 text-gray-400 mr-2" />
            <select 
                className="bg-transparent border-none text-sm font-black focus:ring-0 outline-none min-w-[200px] text-right appearance-none cursor-pointer"
                value={selectedHallId}
                onChange={(e) => setSelectedHallId(e.target.value)}
            >
                <option value="all">كافة القاعات ({halls.length})</option>
                {halls.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                ))}
            </select>
            <Building2 className="w-5 h-5 text-primary ml-2" />
        </div>
      </div>

      {/* 2. Real Analytics Dashboard */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue Card */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm group hover:border-primary/20 transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-400"></div>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/5 rounded-2xl text-primary"><DollarSign className="w-6 h-6" /></div>
                <span className="text-[10px] font-black bg-green-50 text-green-600 px-2 py-1 rounded-lg flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> ممتاز
                </span>
            </div>
            <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">إجمالي الإيرادات</p>
                <PriceTag amount={analytics.totalRevenue} className="text-3xl font-black text-gray-900" />
            </div>
        </div>

        {/* Bookings Card */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm group hover:border-blue-500/20 transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-blue-400"></div>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><CalendarCheck className="w-6 h-6" /></div>
            </div>
            <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">الحجوزات المؤكدة</p>
                <div className="text-3xl font-black text-gray-900">{analytics.confirmedBookings} <span className="text-sm text-gray-400 font-bold">/ {analytics.totalBookingsCount}</span></div>
            </div>
        </div>

        {/* Rating Card */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm group hover:border-yellow-500/20 transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-orange-400"></div>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-yellow-50 rounded-2xl text-yellow-600"><Star className="w-6 h-6 fill-current" /></div>
            </div>
            <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">متوسط التقييم</p>
                <div className="text-3xl font-black text-gray-900">{analytics.avgRating.toFixed(1)} <span className="text-sm text-gray-400 font-bold">/ 5.0</span></div>
            </div>
        </div>

        {/* Active Halls / Capacity */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm group hover:border-purple-500/20 transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-pink-400"></div>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-50 rounded-2xl text-purple-600"><Building2 className="w-6 h-6" /></div>
            </div>
            <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedHallId === 'all' ? 'القاعات النشطة' : 'سعة القاعة'}</p>
                <div className="text-3xl font-black text-gray-900">
                    {selectedHallId === 'all' ? analytics.activeHallsCount : (analytics.filteredHallsList[0]?.capacity || 0)} 
                    <span className="text-sm text-gray-400 font-bold"> {selectedHallId === 'all' ? 'قاعة' : 'ضيف'}</span>
                </div>
            </div>
        </div>
      </div>

      {/* 3. Charts Section */}
      <div className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> الأداء المالي</h3>
               <div className="text-xs font-bold bg-gray-50 px-3 py-1 rounded-lg text-gray-500">آخر 6 أشهر</div>
            </div>
            <div className="h-[300px]" dir="ltr">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.chartData}>
                     <defs>
                        <linearGradient id="colorRevenueVendor" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#4B0082" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#4B0082" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis dataKey="name" tick={{fontSize: 12, fill: '#9CA3AF', fontWeight: 700}} axisLine={false} tickLine={false} />
                     <YAxis tick={{fontSize: 12, fill: '#9CA3AF', fontWeight: 700}} axisLine={false} tickLine={false} />
                     <RechartsTooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                        itemStyle={{color: '#4B0082'}}
                     />
                     <Area type="monotone" dataKey="revenue" stroke="#4B0082" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenueVendor)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black flex items-center gap-2"><PieChart className="w-6 h-6 text-blue-600" /> نشاط الحجوزات</h3>
            </div>
            <div className="h-[300px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#9CA3AF', fontWeight: 700}} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px'}} />
                        <Bar dataKey="bookings" radius={[6, 6, 6, 6]} barSize={20}>
                            {analytics.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4B0082' : '#9333ea'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* 4. Management Section Header */}
      <div className="flex justify-between items-center text-right flex-row-reverse border-t border-gray-200 pt-8 mt-4">
        <div>
           <h2 className="text-2xl font-black">إدارة وتعديل القاعات</h2>
           <p className="text-sm text-muted-foreground mt-1">
              لديك {halls.length} من أصل {user.hall_limit} قاعات مسموحة.
           </p>
        </div>
        {!isEditing && (
          <Button onClick={handleAddNew} className={`rounded-2xl h-12 px-8 font-black gap-2 transition-all hover:scale-105 ${halls.length >= user.hall_limit ? 'bg-gray-100 text-gray-400 hover:bg-gray-200 shadow-none hover:text-primary' : 'shadow-xl shadow-primary/20'}`}>
            {halls.length >= user.hall_limit ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {halls.length >= user.hall_limit ? 'طلب إضافة قاعة' : 'إضافة قاعة جديدة'}
          </Button>
        )}
      </div>

      {/* 5. Hall Cards Grid (Filtered) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-80 bg-gray-100 animate-pulse rounded-[2.5rem]"></div>)
        ) : (
          analytics.filteredHallsList.map(hall => (
            <div key={hall.id} className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all flex flex-col text-right group duration-500">
              <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                {hall.image_url && <img src={hall.image_url} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black shadow-sm">{hall.city}</div>
                {!hall.is_active && <div className="absolute inset-0 bg-black/50 flex items-center justify-center font-black text-white backdrop-blur-sm">غير نشط</div>}
              </div>
              <div className="p-6 flex-1 flex flex-col space-y-4">
                <div>
                    <h3 className="font-black text-xl truncate text-gray-900 group-hover:text-primary transition-colors">{hall.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">السعة: {hall.capacity} شخص</p>
                </div>
                <PriceTag amount={hall.price_per_night} className="text-xl" />
                
                <div className="mt-auto flex gap-3 pt-6 border-t border-gray-50">
                  <Button variant="outline" className="flex-1 rounded-2xl h-11 text-xs font-black border-2 hover:border-primary hover:text-primary transition-colors" onClick={() => { setCurrentHall(hall); setIsEditing(true); }}>تعديل البيانات</Button>
                  <Button variant="secondary" className="rounded-2xl w-11 h-11 p-0 flex items-center justify-center" onClick={() => window.open(`/hall/${hall.id}`, '_blank')}><ArrowUpRight className="w-5 h-5" /></Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upgrade Request Modal */}
      <Modal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} title="طلب زيادة السعة">
         <div className="space-y-6 text-center py-4">
            <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto text-primary animate-pulse">
                <Building2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-black">لقد وصلت للحد الأقصى</h3>
                <p className="text-sm text-gray-500 font-bold leading-relaxed max-w-xs mx-auto">باقة اشتراكك الحالية تسمح بـ {user.hall_limit} قاعات فقط. يمكنك إرسال طلب للإدارة لزيادة الحد المسموح.</p>
            </div>
            
            {hasPendingRequest ? (
                <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 text-yellow-800 font-bold text-sm">
                    يوجد طلب قيد المراجعة حالياً. سيتم إشعارك عند الموافقة.
                </div>
            ) : (
                <Button onClick={handleRequestUpgrade} className="w-full h-14 rounded-2xl font-black shadow-xl shadow-primary/20 gap-2 text-lg">
                    <Send className="w-5 h-5" /> إرسال طلب الترقية
                </Button>
            )}
         </div>
      </Modal>

      {/* Edit Hall Modal (Full Screen Overlay style) */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex justify-end animate-in slide-in-from-left-10">
            <div className="w-full max-w-3xl bg-white h-full shadow-2xl border-r border-gray-200 overflow-y-auto p-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                    <h3 className="font-black text-3xl text-primary">{currentHall.id ? 'تعديل القاعة' : 'إضافة قاعة جديدة'}</h3>
                    <p className="text-sm text-muted-foreground font-bold mt-1">أكمل البيانات لعرض قاعتك للعملاء.</p>
                </div>
                <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-8">
                 {/* Basic Info */}
                 <div className="space-y-6">
                    <h4 className="text-sm font-black uppercase text-gray-400 tracking-widest border-b pb-2">البيانات الأساسية</h4>
                    <div className="space-y-4">
                      <Input label="اسم القاعة" value={currentHall.name || ''} onChange={e => setCurrentHall({...currentHall, name: e.target.value})} className="h-14 rounded-2xl text-right font-bold text-lg" />
                      <div className="grid grid-cols-2 gap-6">
                         <Input label="السعر لليلة (ر.س)" type="number" value={currentHall.price_per_night || ''} onChange={e => setCurrentHall({...currentHall, price_per_night: Number(e.target.value)})} className="h-14 rounded-2xl text-right font-bold" />
                         <Input label="السعة (شخص)" type="number" value={currentHall.capacity || ''} onChange={e => setCurrentHall({...currentHall, capacity: Number(e.target.value)})} className="h-14 rounded-2xl text-right font-bold" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-500">المدينة</label>
                         <select className="w-full h-14 border rounded-2xl px-6 bg-gray-50 outline-none text-right font-bold appearance-none" value={currentHall.city} onChange={e => setCurrentHall({...currentHall, city: e.target.value})}>
                            {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-500">وصف القاعة</label>
                         <textarea className="w-full h-40 border rounded-2xl p-6 bg-gray-50 outline-none text-right resize-none font-bold text-sm leading-relaxed" value={currentHall.description || ''} onChange={e => setCurrentHall({...currentHall, description: e.target.value})} placeholder="اكتب وصفاً جذاباً للقاعة..." />
                      </div>
                    </div>
                 </div>

                 {/* Images */}
                 <div className="space-y-6">
                    <h4 className="text-sm font-black uppercase text-gray-400 tracking-widest border-b pb-2">معرض الصور</h4>
                    <div className="grid grid-cols-3 gap-4">
                        {currentHall.images?.map((img, i) => (
                            <div key={i} className="aspect-square rounded-3xl overflow-hidden relative group border border-gray-100 shadow-sm">
                                <img src={img} className="w-full h-full object-cover" />
                                <button onClick={() => setCurrentHall({...currentHall, images: currentHall.images?.filter((_, idx) => idx !== i)})} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"><X className="w-3 h-3" /></button>
                            </div>
                        ))}
                        <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all group">
                            {uploading ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <Plus className="w-8 h-8 text-gray-300 group-hover:text-primary transition-colors" />}
                            <span className="text-xs font-bold text-gray-400 mt-3 group-hover:text-primary">إضافة صورة</span>
                        </div>
                        <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
                    </div>
                 </div>

                 {/* Amenities */}
                 <div className="space-y-6 pb-20">
                    <h4 className="text-sm font-black uppercase text-gray-400 tracking-widest border-b pb-2">المرافق والخدمات</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {HALL_AMENITIES.map(amenity => (
                            <button 
                            key={amenity}
                            onClick={() => toggleAmenity(amenity)}
                            className={`flex items-center gap-3 p-4 rounded-2xl border text-xs font-bold transition-all text-right ${currentHall.amenities?.includes(amenity) ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white border-gray-100 text-gray-500 hover:border-primary/30'}`}
                            >
                                {currentHall.amenities?.includes(amenity) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                {amenity}
                            </button>
                        ))}
                    </div>
                 </div>
              </div>

              <div className="fixed bottom-0 right-0 w-full max-w-3xl bg-white border-t p-6 flex gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <Button variant="outline" onClick={() => setIsEditing(false)} className="h-14 px-10 rounded-2xl font-bold flex-1">إلغاء</Button>
                <Button onClick={handleSave} disabled={saving} className="h-14 px-10 rounded-2xl font-black text-lg flex-[2] shadow-xl shadow-primary/20">
                    {saving ? <Loader2 className="animate-spin w-5 h-5" /> : 'حفظ ونشر القاعة'}
                </Button>
              </div>
            </div>
        </div>
      )}
    </div>
  );
};
