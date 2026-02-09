
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Hall, Booking, SAUDI_CITIES, HallAddon, HallPackage } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Modal } from '../components/ui/Modal';
import { 
  Plus, MapPin, Users, X, Loader2, Building2, Lock, Star, ArrowUpRight, DollarSign, Filter, Upload, Trash2, ClipboardList, Sparkles, Minus, Package
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { format, subMonths, isSameMonth, eachMonthOfInterval } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface VendorHallsProps {
  user: UserProfile;
}

export const VendorHalls: React.FC<VendorHallsProps> = ({ user }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [reviewsSummary, setReviewsSummary] = useState<{hallId: string, rating: number}[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedHallId, setSelectedHallId] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentHall, setCurrentHall] = useState<Partial<Hall>>({ 
      images: [], amenities: [], city: SAUDI_CITIES[0], addons: [], packages: [] 
  });
  
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  
  // Addon & Package state for the form
  const [newAddon, setNewAddon] = useState<HallAddon>({ name: '', price: 0 });
  const [newPackage, setNewPackage] = useState<HallPackage>({ name: '', price: 0, description: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: hallsData } = await supabase.from('halls').select('*').eq('vendor_id', user.id).eq('type', 'hall');
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
      setCurrentHall(prev => ({ ...prev, images: newImages, image_url: newImages[0] }));
      toast({ title: 'تم الرفع', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const addAddon = () => {
      if (!newAddon.name || newAddon.price < 0) return;
      setCurrentHall(prev => ({
          ...prev,
          addons: [...(prev.addons || []), newAddon]
      }));
      setNewAddon({ name: '', price: 0 });
  };

  const removeAddon = (index: number) => {
      setCurrentHall(prev => ({
          ...prev,
          addons: (prev.addons || []).filter((_, i) => i !== index)
      }));
  };

  const addPackage = () => {
      if (!newPackage.name || newPackage.price <= 0) return;
      setCurrentHall(prev => ({
          ...prev,
          packages: [...(prev.packages || []), newPackage]
      }));
      setNewPackage({ name: '', price: 0, description: '' });
  };

  const removePackage = (index: number) => {
      setCurrentHall(prev => ({
          ...prev,
          packages: (prev.packages || []).filter((_, i) => i !== index)
      }));
  };

  const handleSave = async () => {
    if (!currentHall.name || !currentHall.city) {
      toast({ title: 'تنبيه', description: 'يرجى إكمال البيانات الأساسية.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const totalCapacity = (Number(currentHall.capacity_men) || 0) + (Number(currentHall.capacity_women) || 0);
      
      const payload = { 
          ...currentHall, 
          vendor_id: user.id, 
          image_url: currentHall.images?.[0] || '',
          capacity: totalCapacity > 0 ? totalCapacity : Number(currentHall.capacity) || 0,
          type: 'hall' // Force type
      };
      
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
    setCurrentHall({ images: [], amenities: [], is_active: true, city: SAUDI_CITIES[0], capacity: 0, addons: [], packages: [] }); 
    setIsEditing(true);
  };

  const goToHallBookings = (hallId: string) => {
      window.location.hash = 'hall_bookings';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header and Analytics sections remain same... */}
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

      {/* Hall Cards Grid */}
      <div className="flex justify-between items-center text-right flex-row-reverse border-t border-gray-200 pt-8 mt-4">
        <div>
           <h2 className="text-2xl font-black">قائمة القاعات</h2>
           <p className="text-sm text-gray-400 mt-1">لديك {halls.length} من أصل {user.hall_limit} قاعات مسموحة.</p>
        </div>
        {!isEditing && (
          <Button onClick={handleAddNew} className={`rounded-xl h-12 px-8 font-black gap-2 transition-all ${halls.length >= user.hall_limit ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white shadow-none'}`}>
            {halls.length >= user.hall_limit ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {halls.length >= user.hall_limit ? 'طلب زيادة' : 'إضافة قاعة'}
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

      {/* Edit Hall Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full md:max-w-4xl h-full bg-white border-l border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white z-10">
                <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"><X className="w-5 h-5" /></button>
                <div className="text-right">
                    <h3 className="font-black text-2xl text-primary">{currentHall.id ? 'تعديل القاعة' : 'إضافة'}</h3>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                 <div className="bg-white border border-purple-100 rounded-2xl p-6">
                    <h3 className="text-sm font-black text-primary mb-6 text-right">معلومات القاعة الأساسية</h3>
                    <div className="space-y-4 text-right">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="اسم القاعة | بالعربي" value={currentHall.name || ''} onChange={e => setCurrentHall({...currentHall, name: e.target.value})} className="h-12 rounded-xl border-gray-200 bg-white font-bold" />
                            <Input label="اسم القاعة | بالانجليزي" value={currentHall.name_en || ''} onChange={e => setCurrentHall({...currentHall, name_en: e.target.value})} className="h-12 rounded-xl border-gray-200 bg-white font-bold text-left" dir="ltr" />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500">المدينة</label>
                            <select className="w-full h-12 border border-gray-200 rounded-xl px-4 bg-white outline-none text-right font-bold appearance-none" value={currentHall.city} onChange={e => setCurrentHall({...currentHall, city: e.target.value})}>
                                {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input label="عدد النساء" type="number" value={currentHall.capacity_women || ''} onChange={e => setCurrentHall({...currentHall, capacity_women: Number(e.target.value)})} className="h-12 rounded-xl border-gray-200 bg-white font-bold" />
                            <Input label="عدد الرجال" type="number" value={currentHall.capacity_men || ''} onChange={e => setCurrentHall({...currentHall, capacity_men: Number(e.target.value)})} className="h-12 rounded-xl border-gray-200 bg-white font-bold" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500">الوصف</label>
                            <textarea className="w-full h-32 border border-gray-200 rounded-xl p-3 bg-white outline-none text-right resize-none font-bold text-sm" value={currentHall.description || ''} onChange={e => setCurrentHall({...currentHall, description: e.target.value})} />
                        </div>
                        
                        <Input label="سعر الليلة (ر.س)" type="number" value={currentHall.price_per_night || ''} onChange={e => setCurrentHall({...currentHall, price_per_night: Number(e.target.value)})} className="h-12 rounded-xl border-gray-200 bg-white font-bold" />
                    </div>
                 </div>

                 {/* Packages Management */}
                 <div className="bg-white border border-purple-100 rounded-2xl p-6">
                    <h3 className="text-sm font-black text-primary mb-6 text-right flex items-center gap-2"><Package className="w-4 h-4" /> باقات الحجز (اختياري)</h3>
                    <p className="text-xs text-gray-400 font-bold mb-4 text-right">أضف باقات خاصة (مثل: عشاء، بوفيه، VIP) ليختار منها العميل بدلاً من السعر الأساسي.</p>
                    
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Button onClick={addPackage} className="h-12 w-12 rounded-xl bg-primary text-white p-0 flex items-center justify-center"><Plus className="w-6 h-6" /></Button>
                            <Input placeholder="وصف الباقة" value={newPackage.description || ''} onChange={e => setNewPackage({...newPackage, description: e.target.value})} className="h-12 flex-1 rounded-xl" />
                            <Input placeholder="السعر" type="number" value={newPackage.price || ''} onChange={e => setNewPackage({...newPackage, price: Number(e.target.value)})} className="h-12 w-24 rounded-xl" />
                            <Input placeholder="اسم الباقة" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} className="h-12 w-40 rounded-xl" />
                        </div>

                        <div className="space-y-2">
                            {currentHall.packages?.map((pkg, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <button onClick={() => removePackage(idx)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Minus className="w-4 h-4" /></button>
                                    <div className="flex items-center gap-4 flex-1 justify-end">
                                        <span className="text-xs text-gray-500">{pkg.description}</span>
                                        <span className="font-mono text-primary font-bold">{pkg.price} SAR</span>
                                        <span className="font-bold text-gray-900">{pkg.name}</span>
                                    </div>
                                </div>
                            ))}
                            {(!currentHall.packages || currentHall.packages.length === 0) && (
                                <p className="text-center text-gray-400 text-xs py-4 font-bold">لا توجد باقات مضافة.</p>
                            )}
                        </div>
                    </div>
                 </div>

                 {/* Hall Services / Addons */}
                 <div className="bg-white border border-purple-100 rounded-2xl p-6">
                    <h3 className="text-sm font-black text-primary mb-6 text-right flex items-center gap-2"><Sparkles className="w-4 h-4" /> خدمات إضافية للقاعة</h3>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Button onClick={addAddon} className="h-12 w-12 rounded-xl bg-primary text-white p-0 flex items-center justify-center"><Plus className="w-6 h-6" /></Button>
                            <Input placeholder="السعر" type="number" value={newAddon.price || ''} onChange={e => setNewAddon({...newAddon, price: Number(e.target.value)})} className="h-12 w-32 rounded-xl" />
                            <Input placeholder="اسم الخدمة (مثال: بوفيه إضافي)" value={newAddon.name} onChange={e => setNewAddon({...newAddon, name: e.target.value})} className="h-12 flex-1 rounded-xl" />
                        </div>

                        <div className="space-y-2">
                            {currentHall.addons?.map((addon, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <button onClick={() => removeAddon(idx)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Minus className="w-4 h-4" /></button>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-gray-900">{addon.name}</span>
                                        <span className="font-mono text-primary font-bold">{addon.price} SAR</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>

                 {/* Images */}
                 <div className="bg-white border border-purple-100 rounded-2xl p-6">
                    <h3 className="text-sm font-black text-primary mb-6 text-right">المرفقات</h3>
                    <div className="flex flex-wrap gap-4 justify-end">
                        <div onClick={() => fileInputRef.current?.click()} className="w-40 h-40 rounded-xl bg-purple-100 border-2 border-dashed border-purple-300 flex items-center justify-center cursor-pointer hover:bg-purple-200 transition-all group">
                            <div className="bg-primary text-white rounded-lg p-2 group-hover:scale-110 transition-transform">
                                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                            </div>
                        </div>
                        <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
                        {currentHall.images?.map((img, i) => (
                            <div key={i} className="w-40 h-40 rounded-xl overflow-hidden relative group border border-gray-200">
                                <img src={img} className="w-full h-full object-cover" />
                                <button onClick={() => setCurrentHall({...currentHall, images: currentHall.images?.filter((_, idx) => idx !== i)})} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                            </div>
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
