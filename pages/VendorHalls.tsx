
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Hall, SAUDI_CITIES, HallAddon, HallPackage, HALL_AMENITIES } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Plus, MapPin, X, Loader2, Building2, Trash2, Sparkles, Minus, Package, CheckSquare
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface VendorHallsProps {
  user: UserProfile;
}

export const VendorHalls: React.FC<VendorHallsProps> = ({ user }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [currentHall, setCurrentHall] = useState<Partial<Hall>>({ 
      images: [], amenities: [], city: SAUDI_CITIES[0], addons: [], packages: [] 
  });
  
  const [newAddon, setNewAddon] = useState<HallAddon>({ name: '', price: 0 });
  const [newPackage, setNewPackage] = useState<HallPackage>({ name: '', price: 0, description: '' });

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

  const handleAmenityToggle = (amenity: string) => {
      const current = currentHall.amenities || [];
      if (current.includes(amenity)) {
          setCurrentHall({ ...currentHall, amenities: current.filter(a => a !== amenity) });
      } else {
          setCurrentHall({ ...currentHall, amenities: [...current, amenity] });
      }
  };

  const addAddon = () => {
      if (!newAddon.name || newAddon.price < 0) return;
      setCurrentHall(prev => ({ ...prev, addons: [...(prev.addons || []), newAddon] }));
      setNewAddon({ name: '', price: 0 });
  };

  const addPackage = () => {
      if (!newPackage.name || newPackage.price <= 0) return;
      setCurrentHall(prev => ({ ...prev, packages: [...(prev.packages || []), newPackage] }));
      setNewPackage({ name: '', price: 0, description: '' });
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
          type: 'hall' 
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

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-200">
        <div>
           <h2 className="text-3xl font-black text-primary">إدارة القاعات</h2>
           <p className="text-sm text-gray-400 mt-1 font-bold">إضافة وتعديل القاعات والأسعار.</p>
        </div>
        <Button onClick={() => { setCurrentHall({ images: [], amenities: [], is_active: true, city: SAUDI_CITIES[0], capacity: 0, addons: [], packages: [], type: 'hall' }); setIsEditing(true); }} className="rounded-xl h-12 px-8 font-black gap-2 shadow">
            <Plus className="w-4 h-4" /> إضافة قاعة
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? [1, 2, 3].map(i => <div key={i} className="h-80 bg-gray-100 animate-pulse rounded-[2.5rem]"></div>) : halls.map(hall => (
            <div key={hall.id} className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden flex flex-col group hover:border-primary/50 transition-all">
              <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                {hall.image_url && <img src={hall.image_url} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black">{hall.city}</div>
              </div>
              <div className="p-6 flex-1 flex flex-col space-y-4">
                <div>
                    <h3 className="font-black text-xl truncate text-gray-900">{hall.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">السعة: {hall.capacity} شخص</p>
                </div>
                <PriceTag amount={hall.price_per_night} className="text-xl" />
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <Button variant="outline" className="w-full rounded-xl h-10 text-xs font-black border-gray-200" onClick={() => { setCurrentHall(hall); setIsEditing(true); }}>تعديل التفاصيل</Button>
                </div>
              </div>
            </div>
        ))}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full md:max-w-4xl h-full bg-white border-l border-gray-200 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white z-10">
                <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"><X className="w-5 h-5" /></button>
                <div className="text-right">
                    <h3 className="font-black text-2xl text-primary">{currentHall.id ? 'تعديل القاعة' : 'إضافة قاعة جديدة'}</h3>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar text-right">
                 {/* Basic Info */}
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
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="سعة الرجال" type="number" value={currentHall.capacity_men || ''} onChange={e => setCurrentHall({...currentHall, capacity_men: Number(e.target.value)})} className="h-12 rounded-xl" />
                        <Input label="سعة النساء" type="number" value={currentHall.capacity_women || ''} onChange={e => setCurrentHall({...currentHall, capacity_women: Number(e.target.value)})} className="h-12 rounded-xl" />
                        <Input label="سعر الليلة (ر.س)" type="number" value={currentHall.price_per_night || ''} onChange={e => setCurrentHall({...currentHall, price_per_night: Number(e.target.value)})} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500">الوصف</label>
                        <textarea className="w-full h-32 border border-gray-200 rounded-xl p-3 bg-white outline-none resize-none font-bold text-sm" value={currentHall.description || ''} onChange={e => setCurrentHall({...currentHall, description: e.target.value})} />
                    </div>
                 </div>

                 {/* Amenities */}
                 <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-black text-primary mb-4 flex items-center gap-2"><CheckSquare className="w-4 h-4" /> المرافق والخدمات</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {HALL_AMENITIES.map(amenity => (
                            <label key={amenity} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${currentHall.amenities?.includes(amenity) ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-gray-200 text-gray-500'}`}>
                                <input type="checkbox" checked={currentHall.amenities?.includes(amenity)} onChange={() => handleAmenityToggle(amenity)} className="hidden" />
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${currentHall.amenities?.includes(amenity) ? 'bg-primary text-white border-primary' : 'bg-gray-100'}`}>
                                    {currentHall.amenities?.includes(amenity) && <CheckSquare className="w-3 h-3" />}
                                </div>
                                <span className="text-xs font-bold">{amenity}</span>
                            </label>
                        ))}
                    </div>
                 </div>

                 {/* Packages */}
                 <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-black text-primary mb-4 flex items-center gap-2"><Package className="w-4 h-4" /> الباقات (اختياري)</h3>
                    <div className="flex gap-2 mb-4">
                        <Button onClick={addPackage} className="h-12 w-12 rounded-xl bg-primary text-white p-0 flex items-center justify-center"><Plus className="w-6 h-6" /></Button>
                        <Input placeholder="وصف الباقة" value={newPackage.description || ''} onChange={e => setNewPackage({...newPackage, description: e.target.value})} className="h-12 flex-1 rounded-xl" />
                        <Input placeholder="السعر" type="number" value={newPackage.price || ''} onChange={e => setNewPackage({...newPackage, price: Number(e.target.value)})} className="h-12 w-24 rounded-xl" />
                        <Input placeholder="اسم الباقة" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} className="h-12 w-40 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        {currentHall.packages?.map((pkg, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <button onClick={() => setCurrentHall(prev => ({...prev, packages: prev.packages?.filter((_, i) => i !== idx)}))} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Minus className="w-4 h-4" /></button>
                                <div className="flex items-center gap-4 flex-1 justify-end">
                                    <span className="text-xs text-gray-500">{pkg.description}</span>
                                    <span className="font-mono text-primary font-bold">{pkg.price} SAR</span>
                                    <span className="font-bold text-gray-900">{pkg.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Addons */}
                 <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-black text-primary mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4" /> خدمات إضافية</h3>
                    <div className="flex gap-2 mb-4">
                        <Button onClick={addAddon} className="h-12 w-12 rounded-xl bg-primary text-white p-0 flex items-center justify-center"><Plus className="w-6 h-6" /></Button>
                        <Input placeholder="السعر" type="number" value={newAddon.price || ''} onChange={e => setNewAddon({...newAddon, price: Number(e.target.value)})} className="h-12 w-32 rounded-xl" />
                        <Input placeholder="اسم الخدمة (مثال: بوفيه إضافي)" value={newAddon.name} onChange={e => setNewAddon({...newAddon, name: e.target.value})} className="h-12 flex-1 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        {currentHall.addons?.map((addon, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <button onClick={() => setCurrentHall(prev => ({...prev, addons: prev.addons?.filter((_, i) => i !== idx)}))} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Minus className="w-4 h-4" /></button>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-gray-900">{addon.name}</span>
                                    <span className="font-mono text-primary font-bold">{addon.price} SAR</span>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Images */}
                 <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <h3 className="text-sm font-black text-primary mb-6 text-right">معرض الصور</h3>
                    <div className="flex flex-wrap gap-4 justify-end">
                        <div onClick={() => fileInputRef.current?.click()} className="w-40 h-40 rounded-xl bg-purple-50 border-2 border-dashed border-purple-200 flex items-center justify-center cursor-pointer hover:bg-purple-100 transition-all group">
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
