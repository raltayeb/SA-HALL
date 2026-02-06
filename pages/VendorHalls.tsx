
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
  CalendarCheck, Star, ArrowUpRight, DollarSign, PieChart, Filter, Upload, Trash2, ClipboardList
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: hallsData } = await supabase.from('halls').select('*').eq('vendor_id', user.id);
      setHalls(hallsData || []);

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .eq('vendor_id', user.id)
        .neq('status', 'cancelled');
      setAllBookings(bookingsData as Booking[] || []);

      const { data: reviewsData } = await supabase.from('reviews').select('hall_id, rating');
      if (reviewsData) {
         setReviewsSummary(reviewsData as any);
      }

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

  // Analytics Calculation (kept same as before, omitted for brevity if unchanged logic, but included structure)
  const analytics = useMemo(() => {
    const filteredHalls = selectedHallId === 'all' ? halls : halls.filter(h => h.id === selectedHallId);
    const filteredBookings = selectedHallId === 'all' ? allBookings : allBookings.filter(b => b.hall_id === selectedHallId);
    
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
    const totalBookingsCount = filteredBookings.length;
    const confirmedBookings = filteredBookings.filter(b => b.status === 'confirmed').length;
    
    let avgRating = 0;
    if (selectedHallId === 'all') {
        const ratings = reviewsSummary.map(r => r.rating);
        avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    } else {
        const hallRatings = reviewsSummary.filter(r => r.hallId === selectedHallId).map(r => r.rating);
        avgRating = hallRatings.length ? hallRatings.reduce((a, b) => a + b, 0) / hallRatings.length : 0;
    }

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
        avgRating: avgRating || 5.0,
        chartData,
        activeHallsCount: filteredHalls.filter(h => h.is_active).length,
        filteredHallsList: filteredHalls
    };
  }, [selectedHallId, halls, allBookings, reviewsSummary]);

  // Handlers (file upload, save, etc. - kept same, simplified style in JSX)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    /* ... same logic ... */
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
      setCurrentHall(prev => ({ ...prev, images: newImages, image_url: newImages[0] }));
      toast({ title: 'تم الرفع', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    /* ... same logic ... */
    if (!currentHall.name || !currentHall.price_per_night || !currentHall.city) {
      toast({ title: 'تنبيه', description: 'يرجى إكمال البيانات الأساسية.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...currentHall, vendor_id: user.id, image_url: currentHall.images?.[0] || '' };
      const { error } = currentHall.id ? await supabase.from('halls').update(payload).eq('id', currentHall.id) : await supabase.from('halls').insert([payload]);
      if (error) throw error;
      toast({ title: 'تم الحفظ', variant: 'success' });
      setIsEditing(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleAddNew = () => {
    if (halls.length >= user.hall_limit) { setIsUpgradeModalOpen(true); return; }
    setCurrentHall({ images: [], amenities: [], is_active: true, city: SAUDI_CITIES[0], capacity: 100 }); 
    setIsEditing(true);
  };

  const toggleAmenity = (amenity: string) => {
    const current = currentHall.amenities || [];
    const updated = current.includes(amenity) ? current.filter(a => a !== amenity) : [...current, amenity];
    setCurrentHall({ ...currentHall, amenities: updated });
  };

  // Navigate to bookings with filter
  const goToHallBookings = (hallId: string) => {
      // In a real app, you might use context or query params. 
      // Here we assume navigating to the bookings page where the user can filter manually or we pass state.
      // For now, simpler:
      window.location.hash = 'hall_bookings';
      // Ideally pass hallId to pre-filter
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header - Flat */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-gray-100">
        <div>
           <h2 className="text-3xl font-black text-primary">إدارة القاعات</h2>
           <p className="text-sm text-gray-400 mt-1 font-bold">لوحة التحكم والتحليلات الخاصة بقاعاتك.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
            <Filter className="w-5 h-5 text-gray-400 mr-2" />
            <select 
                className="bg-transparent border-none text-sm font-black focus:ring-0 outline-none min-w-[200px] text-right appearance-none cursor-pointer"
                value={selectedHallId}
                onChange={(e) => setSelectedHallId(e.target.value)}
            >
                <option value="all">كافة القاعات ({halls.length})</option>
                {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <Building2 className="w-5 h-5 text-primary ml-2" />
        </div>
      </div>

      {/* Analytics Cards - Flat */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 hover:border-primary/20 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-xl text-primary"><DollarSign className="w-6 h-6" /></div>
                <span className="text-[10px] font-black bg-green-50 text-green-600 px-2 py-1 rounded-lg flex items-center gap-1"><TrendingUp className="w-3 h-3" /> ممتاز</span>
            </div>
            <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">إجمالي الإيرادات</p>
                <PriceTag amount={analytics.totalRevenue} className="text-3xl font-black text-gray-900" />
            </div>
        </div>

        {/* Bookings */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 hover:border-blue-200 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-xl text-blue-600"><CalendarCheck className="w-6 h-6" /></div>
            </div>
            <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">الحجوزات المؤكدة</p>
                <div className="text-3xl font-black text-gray-900">{analytics.confirmedBookings} <span className="text-sm text-gray-400 font-bold">/ {analytics.totalBookingsCount}</span></div>
            </div>
        </div>

        {/* Rating */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 hover:border-yellow-200 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-xl text-yellow-500"><Star className="w-6 h-6 fill-current" /></div>
            </div>
            <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">متوسط التقييم</p>
                <div className="text-3xl font-black text-gray-900">{analytics.avgRating.toFixed(1)} <span className="text-sm text-gray-400 font-bold">/ 5.0</span></div>
            </div>
        </div>

        {/* Active Halls */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 hover:border-purple-200 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-xl text-purple-600"><Building2 className="w-6 h-6" /></div>
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

      {/* Hall Cards Grid - Flat & Integrated */}
      <div className="flex justify-between items-center text-right flex-row-reverse border-t border-gray-200 pt-8 mt-4">
        <div>
           <h2 className="text-2xl font-black">إدارة وتعديل القاعات</h2>
           <p className="text-sm text-gray-400 mt-1">لديك {halls.length} من أصل {user.hall_limit} قاعات مسموحة.</p>
        </div>
        {!isEditing && (
          <Button onClick={handleAddNew} className={`rounded-xl h-12 px-8 font-black gap-2 transition-all ${halls.length >= user.hall_limit ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white shadow-none'}`}>
            {halls.length >= user.hall_limit ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {halls.length >= user.hall_limit ? 'طلب إضافة قاعة' : 'إضافة قاعة جديدة'}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-80 bg-gray-100 animate-pulse rounded-[2.5rem]"></div>)
        ) : (
          analytics.filteredHallsList.map(hall => (
            <div key={hall.id} className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden flex flex-col text-right group hover:border-primary/30 transition-all">
              <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                {hall.image_url && <img src={hall.image_url} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black">{hall.city}</div>
                {!hall.is_active && <div className="absolute inset-0 bg-black/50 flex items-center justify-center font-black text-white backdrop-blur-sm">غير نشط</div>}
              </div>
              <div className="p-6 flex-1 flex flex-col space-y-4">
                <div>
                    <h3 className="font-black text-xl truncate text-gray-900">{hall.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">السعة: {hall.capacity} شخص</p>
                </div>
                <PriceTag amount={hall.price_per_night} className="text-xl" />
                
                <div className="mt-auto flex gap-2 pt-6 border-t border-gray-50">
                  <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-black border border-gray-200" onClick={() => { setCurrentHall(hall); setIsEditing(true); }}>تعديل</Button>
                  <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-black border border-gray-200 gap-1" onClick={() => goToHallBookings(hall.id)}><ClipboardList className="w-3.5 h-3.5" /> الحجوزات</Button>
                  <Button variant="secondary" className="rounded-xl w-10 h-10 p-0 flex items-center justify-center bg-gray-100 text-gray-500" onClick={() => window.open(`/hall/${hall.id}`, '_blank')}><ArrowUpRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Hall Modal (Kept same structure, removed shadow classes) */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full md:max-w-3xl h-full bg-white border-l border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white z-10">
                <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"><X className="w-5 h-5" /></button>
                <div className="text-right">
                    <h3 className="font-black text-2xl text-primary">{currentHall.id ? 'تعديل القاعة' : 'إضافة قاعة جديدة'}</h3>
                    <p className="text-xs text-gray-400 font-bold mt-1">أكمل البيانات لعرض قاعتك للعملاء</p>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                 {/* Basic Info */}
                 <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest border-b pb-2 text-right">البيانات الأساسية</h4>
                    <div className="space-y-4 text-right">
                      <Input label="اسم القاعة" value={currentHall.name || ''} onChange={e => setCurrentHall({...currentHall, name: e.target.value})} className="h-12 rounded-2xl font-bold border-gray-200" />
                      <div className="grid grid-cols-2 gap-4">
                         <Input label="السعر لليلة (ر.س)" type="number" value={currentHall.price_per_night || ''} onChange={e => setCurrentHall({...currentHall, price_per_night: Number(e.target.value)})} className="h-12 rounded-2xl font-bold border-gray-200" />
                         <Input label="السعة (شخص)" type="number" value={currentHall.capacity || ''} onChange={e => setCurrentHall({...currentHall, capacity: Number(e.target.value)})} className="h-12 rounded-2xl font-bold border-gray-200" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-500">المدينة</label>
                         <select className="w-full h-12 border border-gray-200 rounded-2xl px-4 bg-white outline-none text-right font-bold appearance-none" value={currentHall.city} onChange={e => setCurrentHall({...currentHall, city: e.target.value})}>
                            {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-500">وصف القاعة</label>
                         <textarea className="w-full h-32 border border-gray-200 rounded-2xl p-4 bg-white outline-none text-right resize-none font-bold text-sm leading-relaxed" value={currentHall.description || ''} onChange={e => setCurrentHall({...currentHall, description: e.target.value})} placeholder="اكتب وصفاً جذاباً للقاعة..." />
                      </div>
                    </div>
                 </div>

                 {/* Images */}
                 <div className="space-y-6 text-right">
                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest border-b pb-2">معرض الصور</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {currentHall.images?.map((img, i) => (
                            <div key={i} className="aspect-square rounded-2xl overflow-hidden relative group border border-gray-100">
                                <img src={img} className="w-full h-full object-cover" />
                                <button onClick={() => setCurrentHall({...currentHall, images: currentHall.images?.filter((_, idx) => idx !== i)})} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"><Trash2 className="w-3 h-3" /></button>
                            </div>
                        ))}
                        <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all group">
                            {uploading ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <Plus className="w-8 h-8 text-gray-300 group-hover:text-gray-500 transition-colors" />}
                            <span className="text-[10px] font-bold text-gray-400 mt-2 group-hover:text-gray-600">إضافة صورة</span>
                        </div>
                        <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
                    </div>
                 </div>

                 {/* Amenities */}
                 <div className="space-y-6 pb-10 text-right">
                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest border-b pb-2">المرافق والخدمات</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {HALL_AMENITIES.map(amenity => (
                            <button 
                            key={amenity}
                            onClick={() => toggleAmenity(amenity)}
                            className={`flex items-center gap-2 p-3 rounded-2xl border text-[11px] font-bold transition-all text-right ${currentHall.amenities?.includes(amenity) ? 'bg-primary text-white border-primary' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}
                            >
                                {currentHall.amenities?.includes(amenity) ? <CheckSquare className="w-4 h-4 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
                                {amenity}
                            </button>
                        ))}
                    </div>
                 </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-white z-10 flex gap-4">
                <Button variant="outline" onClick={() => setIsEditing(false)} className="h-12 px-8 rounded-xl font-bold flex-1 border-gray-200">إلغاء</Button>
                <Button onClick={handleSave} disabled={saving} className="h-12 px-8 rounded-xl font-black text-sm flex-[2] bg-primary text-white shadow-none">
                    {saving ? <Loader2 className="animate-spin w-5 h-5" /> : 'حفظ ونشر القاعة'}
                </Button>
              </div>
            </div>
        </div>
      )}
    </div>
  );
};
