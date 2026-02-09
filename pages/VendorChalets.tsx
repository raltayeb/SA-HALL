
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Hall, SAUDI_CITIES, CHALET_AMENITIES } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Plus, X, Loader2, Palmtree, Trash2, CheckSquare, FileText
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface VendorChaletsProps {
  user: UserProfile;
}

export const VendorChalets: React.FC<VendorChaletsProps> = ({ user }) => {
  const [chalets, setChalets] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentChalet, setCurrentChalet] = useState<Partial<Hall>>({ 
      images: [], amenities: [], city: SAUDI_CITIES[0], type: 'chalet', policies: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('halls').select('*').eq('vendor_id', user.id).in('type', ['chalet', 'resort']);
      setChalets(data || []);
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
      const newImages = [...(currentChalet.images || []), publicUrl];
      setCurrentChalet(prev => ({ ...prev, images: newImages, image_url: newImages[0] }));
      toast({ title: 'تم الرفع', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleAmenityToggle = (amenity: string) => {
      const current = currentChalet.amenities || [];
      if (current.includes(amenity)) {
          setCurrentChalet({ ...currentChalet, amenities: current.filter(a => a !== amenity) });
      } else {
          setCurrentChalet({ ...currentChalet, amenities: [...current, amenity] });
      }
  };

  const handleSave = async () => {
    if (!currentChalet.name || !currentChalet.city) {
      toast({ title: 'تنبيه', description: 'يرجى إكمال البيانات الأساسية.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = { 
          ...currentChalet, 
          vendor_id: user.id, 
          image_url: currentChalet.images?.[0] || '',
          capacity: Number(currentChalet.capacity) || 0,
          type: 'chalet' 
      };
      
      const { error } = currentChalet.id ? await supabase.from('halls').update(payload).eq('id', currentChalet.id) : await supabase.from('halls').insert([payload]);
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
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div>
           <h2 className="text-3xl font-black text-primary flex items-center gap-2"><Palmtree className="w-8 h-8" /> إدارة الشاليهات</h2>
           <p className="text-sm text-gray-400 mt-1 font-bold">إدارة الاستراحات والمنتجعات الخاصة بك.</p>
        </div>
        <Button onClick={() => { setCurrentChalet({ images: [], amenities: [], is_active: true, city: SAUDI_CITIES[0], capacity: 0, type: 'chalet', policies: '' }); setIsEditing(true); }} className="rounded-xl h-12 px-8 font-black gap-2 shadow-xl shadow-primary/20">
            <Plus className="w-4 h-4" /> إضافة شاليه
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? [1, 2, 3].map(i => <div key={i} className="h-80 bg-gray-100 animate-pulse rounded-[2.5rem]"></div>) : chalets.map(chalet => (
            <div key={chalet.id} className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden flex flex-col group hover:border-primary/30 transition-all">
              <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                {chalet.image_url && <img src={chalet.image_url} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black">{chalet.city}</div>
              </div>
              <div className="p-6 flex-1 flex flex-col space-y-4">
                <div>
                    <h3 className="font-black text-xl truncate text-gray-900">{chalet.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">السعة: {chalet.capacity} شخص</p>
                </div>
                <PriceTag amount={chalet.price_per_night} className="text-xl" />
                <div className="mt-auto pt-4 border-t border-gray-50">
                  <Button variant="outline" className="w-full rounded-xl h-10 text-xs font-black" onClick={() => { setCurrentChalet(chalet); setIsEditing(true); }}>تعديل</Button>
                </div>
              </div>
            </div>
        ))}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full md:max-w-4xl h-full bg-white border-l border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white z-10">
                <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"><X className="w-5 h-5" /></button>
                <div className="text-right">
                    <h3 className="font-black text-2xl text-primary">{currentChalet.id ? 'تعديل الشاليه' : 'إضافة شاليه'}</h3>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar text-right">
                 {/* Info */}
                 <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-black text-primary mb-6">المعلومات الأساسية</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="اسم الشاليه" value={currentChalet.name || ''} onChange={e => setCurrentChalet({...currentChalet, name: e.target.value})} className="h-12 rounded-xl" />
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500">المدينة</label>
                            <select className="w-full h-12 border rounded-xl px-4 bg-white outline-none font-bold" value={currentChalet.city} onChange={e => setCurrentChalet({...currentChalet, city: e.target.value})}>
                                {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="السعة (أشخاص)" type="number" value={currentChalet.capacity || ''} onChange={e => setCurrentChalet({...currentChalet, capacity: Number(e.target.value)})} className="h-12 rounded-xl" />
                        <Input label="سعر الليلة (ر.س)" type="number" value={currentChalet.price_per_night || ''} onChange={e => setCurrentChalet({...currentChalet, price_per_night: Number(e.target.value)})} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500">الوصف</label>
                        <textarea className="w-full h-32 border border-gray-200 rounded-xl p-3 bg-white outline-none resize-none font-bold text-sm" value={currentChalet.description || ''} onChange={e => setCurrentChalet({...currentChalet, description: e.target.value})} />
                    </div>
                 </div>

                 {/* Amenities */}
                 <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-black text-primary mb-4 flex items-center gap-2"><CheckSquare className="w-4 h-4" /> المرافق والخدمات</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {CHALET_AMENITIES.map(amenity => (
                            <label key={amenity} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${currentChalet.amenities?.includes(amenity) ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-gray-100 text-gray-500'}`}>
                                <input type="checkbox" checked={currentChalet.amenities?.includes(amenity)} onChange={() => handleAmenityToggle(amenity)} className="hidden" />
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${currentChalet.amenities?.includes(amenity) ? 'bg-primary text-white border-primary' : 'bg-gray-100'}`}>
                                    {currentChalet.amenities?.includes(amenity) && <CheckSquare className="w-3 h-3" />}
                                </div>
                                <span className="text-xs font-bold">{amenity}</span>
                            </label>
                        ))}
                    </div>
                 </div>

                 {/* Policies */}
                 <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-black text-primary mb-4 flex items-center gap-2"><FileText className="w-4 h-4" /> الشروط والأحكام (يظهر للعميل)</h3>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500">سياسة الدخول، التأمين، والإلغاء</label>
                        <textarea 
                            className="w-full h-32 border border-gray-200 rounded-xl p-3 bg-white outline-none resize-none font-bold text-sm" 
                            placeholder="اكتب هنا شروط الدخول، مبلغ التأمين المسترد، وسياسة الإلغاء..."
                            value={currentChalet.policies || ''} 
                            onChange={e => setCurrentChalet({...currentChalet, policies: e.target.value})} 
                        />
                    </div>
                 </div>

                 {/* Images */}
                 <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <h3 className="text-sm font-black text-primary mb-6">صور الشاليه</h3>
                    <div className="flex flex-wrap gap-4 justify-end">
                        <div onClick={() => fileInputRef.current?.click()} className="w-40 h-40 rounded-xl bg-purple-50 border-2 border-dashed border-purple-200 flex items-center justify-center cursor-pointer hover:bg-purple-100 transition-all group">
                            <div className="bg-primary text-white rounded-lg p-2 group-hover:scale-110 transition-transform">
                                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                            </div>
                        </div>
                        <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
                        {currentChalet.images?.map((img, i) => (
                            <div key={i} className="w-40 h-40 rounded-xl overflow-hidden relative group border border-gray-200">
                                <img src={img} className="w-full h-full object-cover" />
                                <button onClick={() => setCurrentChalet({...currentChalet, images: currentChalet.images?.filter((_, idx) => idx !== i)})} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                 </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-white z-10 flex gap-4">
                <Button variant="outline" onClick={() => setIsEditing(false)} className="h-12 px-8 rounded-xl font-bold flex-1 border-gray-200">إلغاء</Button>
                <Button onClick={handleSave} disabled={saving} className="h-12 px-8 rounded-xl font-black text-sm flex-[2] bg-primary text-white shadow-none">
                    {saving ? <Loader2 className="animate-spin w-5 h-5" /> : 'حفظ البيانات'}
                </Button>
              </div>
            </div>
        </div>
      )}
    </div>
  );
};
