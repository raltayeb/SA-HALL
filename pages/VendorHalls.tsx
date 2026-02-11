
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Hall, SAUDI_CITIES, HallAddon, HallPackage, HALL_AMENITIES, SeasonalPrice } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Plus, X, Loader2, Trash2, Sparkles, Minus, Package, CheckSquare, ListPlus, Lock, CreditCard, CalendarDays, FileText, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { Calendar } from '../components/ui/Calendar';
import { format, isSameDay, parseISO } from 'date-fns';

interface VendorHallsProps {
  user: UserProfile;
}

export const VendorHalls: React.FC<VendorHallsProps> = ({ user }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'packages' | 'calendar' | 'policies'>('info');
  const [uploading, setUploading] = useState(false);
  
  const [currentHall, setCurrentHall] = useState<Partial<Hall>>({ 
      images: [], amenities: [], city: SAUDI_CITIES[0], addons: [], packages: [], seasonal_prices: []
  });
  
  // Package State
  const [newPackage, setNewPackage] = useState<HallPackage>({ 
      name: '', price: 0, min_men: 0, max_men: 100, min_women: 0, max_women: 100, is_default: false, items: [] 
  });

  // Addon State
  const [newAddon, setNewAddon] = useState<HallAddon>({ name: '', price: 0, description: '' });

  // Seasonal State
  const [newSeason, setNewSeason] = useState<SeasonalPrice>({ name: '', start_date: '', end_date: '', increase_percentage: 0 });

  // Calendar State
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: hallsData } = await supabase.from('halls').select('*').eq('vendor_id', user.id).eq('type', 'hall');
      setHalls(hallsData || []);
    } catch (err: any) {
      toast({ title: 'خطأ', description: 'فشل في تحميل البيانات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user.id, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddNew = () => {
      setCurrentHall({ images: [], amenities: [], is_active: true, city: SAUDI_CITIES[0], capacity: 0, addons: [], packages: [], seasonal_prices: [], type: 'hall' });
      setIsEditing(true);
      setActiveTab('info');
  };

  const handleEdit = async (hall: Hall) => {
      setCurrentHall(hall);
      setIsEditing(true);
      setActiveTab('info');
      const { data } = await supabase.from('bookings').select('booking_date').eq('hall_id', hall.id).eq('status', 'blocked');
      setBlockedDates(data?.map(b => b.booking_date) || []);
  };

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

  const addPackage = () => {
      if (!newPackage.name || newPackage.price <= 0) {
          toast({ title: 'تنبيه', description: 'يرجى إدخال اسم الباقة وسعر الفرد.', variant: 'destructive' });
          return;
      }
      
      const updatedPackages = currentHall.packages ? [...currentHall.packages] : [];
      if (newPackage.is_default) {
          updatedPackages.forEach(p => p.is_default = false);
      }
      updatedPackages.push(newPackage);
      
      setCurrentHall(prev => ({ ...prev, packages: updatedPackages }));
      setNewPackage({ name: '', price: 0, min_men: 0, max_men: 100, min_women: 0, max_women: 100, is_default: false, items: [] });
  };

  const addAddon = () => {
      if (!newAddon.name || newAddon.price < 0) return;
      setCurrentHall(prev => ({ ...prev, addons: [...(prev.addons || []), newAddon] }));
      setNewAddon({ name: '', price: 0, description: '' });
  };

  const addSeason = () => {
      if (!newSeason.name || !newSeason.start_date || !newSeason.end_date || newSeason.increase_percentage <= 0) return;
      setCurrentHall(prev => ({ ...prev, seasonal_prices: [...(prev.seasonal_prices || []), newSeason] }));
      setNewSeason({ name: '', start_date: '', end_date: '', increase_percentage: 0 });
  };

  const toggleBlockDate = async (date: Date) => {
      if (!currentHall.id) return;
      const dateStr = format(date, 'yyyy-MM-dd');
      
      if (blockedDates.includes(dateStr)) {
          await supabase.from('bookings').delete().eq('hall_id', currentHall.id).eq('booking_date', dateStr).eq('status', 'blocked');
          setBlockedDates(prev => prev.filter(d => d !== dateStr));
      } else {
          await supabase.from('bookings').insert([{
              hall_id: currentHall.id,
              vendor_id: user.id,
              booking_date: dateStr,
              status: 'blocked',
              total_amount: 0,
              vat_amount: 0,
              notes: 'Blocked by Vendor'
          }]);
          setBlockedDates(prev => [...prev, dateStr]);
      }
  };

  const handleSave = async () => {
    if (!currentHall.name || !currentHall.city) {
      toast({ title: 'تنبيه', description: 'يرجى إكمال البيانات الأساسية.', variant: 'destructive' });
      return;
    }
    try {
      const payload = { 
          ...currentHall, 
          vendor_id: user.id, 
          image_url: currentHall.images?.[0] || '',
          capacity: Math.max(...(currentHall.packages?.map(p => (p.max_men || 0) + (p.max_women || 0)) || [0])),
          type: 'hall' 
      };
      
      const { error } = currentHall.id ? await supabase.from('halls').update(payload).eq('id', currentHall.id) : await supabase.from('halls').insert([payload]);
      if (error) throw error;
      toast({ title: 'تم الحفظ', variant: 'success' });
      setIsEditing(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-200">
        <div><h2 className="text-3xl font-black text-primary">إدارة القاعات</h2></div>
        <Button onClick={handleAddNew} className="rounded-xl h-12 px-8 font-black gap-2 shadow"><Plus className="w-4 h-4" /> إضافة قاعة</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? [1, 2, 3].map(i => <div key={i} className="h-80 bg-gray-100 animate-pulse rounded-[2.5rem]"></div>) : halls.map(hall => (
            <div key={hall.id} className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden flex flex-col group hover:border-primary/50 transition-all">
              <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                {hall.image_url && <img src={hall.image_url} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
              </div>
              <div className="p-6 flex-1 flex flex-col space-y-4">
                <h3 className="font-black text-xl truncate text-gray-900">{hall.name}</h3>
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <Button variant="outline" className="w-full rounded-xl h-10 text-xs font-black border-gray-200" onClick={() => handleEdit(hall)}>تعديل التفاصيل</Button>
                </div>
              </div>
            </div>
        ))}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full md:max-w-5xl h-full bg-white border-l border-gray-200 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white z-10">
                <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center"><X className="w-5 h-5" /></button>
                <div className="text-right"><h3 className="font-black text-2xl text-primary">{currentHall.id ? 'تعديل القاعة' : 'إضافة قاعة جديدة'}</h3></div>
              </div>
              
              <div className="flex bg-gray-50 p-2 gap-2 overflow-x-auto no-scrollbar border-b border-gray-200">
                  <button onClick={() => setActiveTab('info')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${activeTab === 'info' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>البيانات الأساسية</button>
                  <button onClick={() => setActiveTab('packages')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${activeTab === 'packages' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>الباقات والخدمات</button>
                  <button onClick={() => setActiveTab('policies')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${activeTab === 'policies' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>الشروط والأحكام</button>
                  {currentHall.id && <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${activeTab === 'calendar' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>التقويم والحجب</button>}
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar text-right">
                 {activeTab === 'info' && (
                     <div className="space-y-6">
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                            <h3 className="text-sm font-black text-primary mb-4">البيانات الأساسية</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="اسم القاعة" value={currentHall.name || ''} onChange={e => setCurrentHall({...currentHall, name: e.target.value})} className="h-12 rounded-xl" />
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500">المدينة</label>
                                    <select className="w-full h-12 border border-gray-200 rounded-xl px-4 bg-white outline-none font-bold text-sm" value={currentHall.city} onChange={e => setCurrentHall({...currentHall, city: e.target.value})}>
                                        {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500">الوصف</label>
                                <textarea className="w-full h-32 border border-gray-200 rounded-xl p-3 bg-white outline-none resize-none font-bold text-sm" value={currentHall.description || ''} onChange={e => setCurrentHall({...currentHall, description: e.target.value})} />
                            </div>
                            
                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-black text-primary mb-4 flex items-center justify-between">
                                    <span>صور القاعة</span>
                                    <span className="text-[10px] text-gray-400 font-normal">ينصح باستخدام صور عالية الجودة</span>
                                </h3>
                                <div className="flex flex-wrap gap-4">
                                    <div onClick={() => fileInputRef.current?.click()} className="w-32 h-32 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all text-gray-400 hover:text-primary">
                                        {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-8 h-8 mb-2" />}
                                        <span className="text-[10px] font-bold">رفع صورة</span>
                                    </div>
                                    <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
                                    {currentHall.images?.map((img, i) => (
                                        <div key={i} className="w-32 h-32 rounded-2xl overflow-hidden relative group border border-gray-200">
                                            <img src={img} className="w-full h-full object-cover" />
                                            <button onClick={() => setCurrentHall({...currentHall, images: currentHall.images?.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-md">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-black text-primary mb-4">المرافق والمميزات</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {HALL_AMENITIES.map(amenity => (
                                        <label key={amenity} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${currentHall.amenities?.includes(amenity) ? 'bg-primary/5 border-primary text-primary' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={currentHall.amenities?.includes(amenity)} 
                                                onChange={() => {
                                                    const newAmenities = currentHall.amenities?.includes(amenity) 
                                                        ? currentHall.amenities.filter(a => a !== amenity) 
                                                        : [...(currentHall.amenities || []), amenity];
                                                    setCurrentHall({...currentHall, amenities: newAmenities});
                                                }} 
                                                className="hidden" 
                                            />
                                            <CheckSquare className="w-4 h-4" />
                                            <span className="text-xs font-bold">{amenity}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                     </div>
                 )}

                 {activeTab === 'packages' && (
                     <div className="space-y-6">
                        {/* Packages */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                            <h3 className="text-sm font-black text-primary mb-4">باقات الحجز (التسعير بالفرد)</h3>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input placeholder="اسم الباقة (مثال: الباقة الملكية)" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} className="h-11 bg-white" />
                                    <Input placeholder="سعر الفرد (ر.س)" type="number" value={newPackage.price || ''} onChange={e => setNewPackage({...newPackage, price: Number(e.target.value)})} className="h-11 bg-white" />
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    <Input label="أقل رجال" type="number" value={newPackage.min_men} onChange={e => setNewPackage({...newPackage, min_men: Number(e.target.value)})} className="h-10 bg-white" />
                                    <Input label="أكثر رجال" type="number" value={newPackage.max_men} onChange={e => setNewPackage({...newPackage, max_men: Number(e.target.value)})} className="h-10 bg-white" />
                                    <Input label="أقل نساء" type="number" value={newPackage.min_women} onChange={e => setNewPackage({...newPackage, min_women: Number(e.target.value)})} className="h-10 bg-white" />
                                    <Input label="أكثر نساء" type="number" value={newPackage.max_women} onChange={e => setNewPackage({...newPackage, max_women: Number(e.target.value)})} className="h-10 bg-white" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={newPackage.is_default} onChange={e => setNewPackage({...newPackage, is_default: e.target.checked})} className="w-4 h-4 accent-primary" />
                                    <span className="text-xs font-bold">تعيين كباقة أساسية (افتراضية)</span>
                                </div>
                                <Button onClick={addPackage} className="w-full h-11 rounded-xl font-bold bg-gray-900 text-white gap-2">
                                    <Plus className="w-4 h-4" /> إضافة الباقة
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {currentHall.packages?.map((pkg, idx) => (
                                    <div key={idx} className={`p-4 border rounded-2xl relative ${pkg.is_default ? 'bg-primary/5 border-primary' : 'bg-white border-gray-200'}`}>
                                        <button onClick={() => setCurrentHall(prev => ({...prev, packages: prev.packages?.filter((_, i) => i !== idx)}))} className="absolute top-4 left-4 text-red-500"><Trash2 className="w-4 h-4" /></button>
                                        <div className="flex justify-between items-center mb-1">
                                            <h4 className="font-bold text-gray-900">{pkg.name} {pkg.is_default && <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full">أساسية</span>}</h4>
                                            <PriceTag amount={pkg.price} className="text-primary" />
                                        </div>
                                        <p className="text-xs text-gray-500 font-bold">رجال: {pkg.min_men}-{pkg.max_men} | نساء: {pkg.min_women}-{pkg.max_women}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Addons */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                            <h3 className="text-sm font-black text-primary mb-4">الخدمات الإضافية (Addons)</h3>
                            <div className="flex gap-2 mb-4">
                                <Button onClick={addAddon} className="h-11 w-11 rounded-xl bg-primary text-white p-0 flex items-center justify-center"><Plus className="w-5 h-5" /></Button>
                                <Input placeholder="السعر" type="number" value={newAddon.price || ''} onChange={e => setNewAddon({...newAddon, price: Number(e.target.value)})} className="h-11 w-32 bg-gray-50" />
                                <Input placeholder="اسم الخدمة (مثال: صبابات)" value={newAddon.name} onChange={e => setNewAddon({...newAddon, name: e.target.value})} className="h-11 flex-1 bg-gray-50" />
                            </div>
                            <div className="space-y-2">
                                {currentHall.addons?.map((addon, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <button onClick={() => setCurrentHall(prev => ({...prev, addons: prev.addons?.filter((_, i) => i !== idx)}))} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Minus className="w-4 h-4" /></button>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-gray-900">{addon.name}</span>
                                            <span className="font-mono text-primary font-bold">{addon.price} SAR</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Seasonality */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                            <h3 className="text-sm font-black text-primary mb-4">التسعير الموسمي</h3>
                            <div className="flex gap-2">
                                <Input placeholder="الموسم" value={newSeason.name} onChange={e => setNewSeason({...newSeason, name: e.target.value})} className="h-11 flex-1" />
                                <Input type="date" value={newSeason.start_date} onChange={e => setNewSeason({...newSeason, start_date: e.target.value})} className="h-11 w-32" />
                                <Input type="date" value={newSeason.end_date} onChange={e => setNewSeason({...newSeason, end_date: e.target.value})} className="h-11 w-32" />
                                <Input placeholder="+%" type="number" value={newSeason.increase_percentage || ''} onChange={e => setNewSeason({...newSeason, increase_percentage: Number(e.target.value)})} className="h-11 w-20" />
                                <Button onClick={addSeason} className="h-11 w-11 p-0 rounded-xl"><Plus className="w-5 h-5" /></Button>
                            </div>
                            <div className="space-y-2">
                                {currentHall.seasonal_prices?.map((s, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl text-xs font-bold text-gray-600">
                                        <span>{s.name} ({s.start_date} إلى {s.end_date})</span>
                                        <span className="text-green-600">+{s.increase_percentage}% زيادة</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                     </div>
                 )}

                 {activeTab === 'policies' && (
                     <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                        <h3 className="text-sm font-black text-primary mb-4">الشروط والأحكام</h3>
                        <textarea 
                            className="w-full h-64 border border-gray-200 rounded-xl p-4 bg-white outline-none resize-none font-bold text-sm leading-relaxed" 
                            placeholder="اكتب هنا شروط الإلغاء، الممنوعات، وسياسة التأمين..."
                            value={currentHall.policies || ''} 
                            onChange={e => setCurrentHall({...currentHall, policies: e.target.value})} 
                        />
                     </div>
                 )}

                 {activeTab === 'calendar' && (
                     <div className="space-y-6">
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
                            <h3 className="text-sm font-black text-gray-900 mb-6">إدارة التقويم والحجب</h3>
                            <div className="max-w-md mx-auto">
                                <Calendar 
                                    mode="single"
                                    selected={calendarDate}
                                    onSelect={(d) => { setCalendarDate(d); if(d) toggleBlockDate(d); }}
                                    className="w-full"
                                />
                            </div>
                        </div>
                     </div>
                 )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-white z-10 flex gap-4">
                <Button variant="outline" onClick={() => setIsEditing(false)} className="h-12 px-8 rounded-xl font-bold flex-1 border-gray-200">إلغاء</Button>
                <Button onClick={handleSave} className="h-12 px-8 rounded-xl font-black text-sm flex-[2] bg-primary text-white shadow-none">حفظ التغييرات</Button>
              </div>
            </div>
        </div>
      )}
    </div>
  );
};
