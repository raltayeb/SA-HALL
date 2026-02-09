
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Service, ServiceCategory } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Plus, Sparkles, Tag, Edit3, Trash2, Package, Upload, Loader2, X, Lock } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';

interface VendorServicesProps {
  user: UserProfile;
}

export const VendorServices: React.FC<VendorServicesProps> = ({ user }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<Service>>({});
  const [saving, setSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        supabase.from('services').select('*').eq('vendor_id', user.id).order('created_at', { ascending: false }),
        supabase.from('service_categories').select('*').order('name'),
      ]);
      setServices(servicesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (err: any) {
      toast({ title: 'خطأ', description: 'فشل في تحميل الخدمات', variant: 'destructive' });
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
      const fileName = `${user.id}/service-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('service-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('service-images').getPublicUrl(fileName);
      
      const newImages = [...(currentService.images || []), publicUrl];
      setCurrentService(prev => ({ 
          ...prev, 
          images: newImages,
          image_url: newImages[0]
      }));
      toast({ title: 'نجاح', description: 'تم رفع الصورة بنجاح.', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentService.name || !currentService.price) {
      toast({ title: 'تنبيه', description: 'يرجى إدخال اسم الخدمة وسعرها.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = { 
      ...currentService, 
      vendor_id: user.id, 
      price: Number(currentService.price),
      is_active: currentService.is_active ?? true,
      category: currentService.category || categories[0]?.name || 'عام'
    };

    try {
      const { error } = currentService.id 
        ? await supabase.from('services').update(payload).eq('id', currentService.id)
        : await supabase.from('services').insert([payload]);

      if (error) throw error;

      setIsEditing(false);
      fetchData();
      toast({ title: 'تم الحفظ', description: 'تم تحديث بيانات الخدمة بنجاح.', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
        setSaving(false);
    }
  };

  const handleAddNew = () => {
    if (services.length >= user.service_limit) {
       toast({ title: 'الحد الأقصى', description: 'وصلت للحد المسموح من الخدمات.', variant: 'warning' });
       return;
    }
    setCurrentService({ is_active: true, category: categories[0]?.name || '', images: [] }); 
    setIsEditing(true);
  };

  return (
    <div className="space-y-8 pb-10 font-sans text-right">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-200">
        <div>
          <h2 className="text-3xl font-black text-primary">إدارة الخدمات</h2>
          <p className="text-sm text-muted-foreground mt-1 font-bold">باقات إضافية، ضيافة، وتجهيزات.</p>
        </div>
        <Button onClick={handleAddNew} className="rounded-xl h-12 px-8 font-black gap-2 shadow">
            <Plus className="w-4 h-4" /> خدمة جديدة
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? [1,2,3].map(i => <div key={i} className="h-80 bg-gray-100 animate-pulse rounded-[2.5rem]"></div>) : services.map(s => (
            <div key={s.id} className="group bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden hover:border-primary/50 transition-all duration-300 flex flex-col relative">
              <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                {s.image_url ? (
                    <img src={s.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                    <div className="flex h-full items-center justify-center opacity-10"><Package className="w-16 h-16" /></div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black border border-gray-100 text-primary">{s.category}</div>
              </div>
              <div className="p-6 flex-1 flex flex-col gap-3">
                <h3 className="font-black text-lg text-gray-900 truncate">{s.name}</h3>
                <PriceTag amount={s.price} className="text-xl text-primary" />
                <Button variant="outline" className="mt-auto w-full rounded-xl text-xs font-bold border-gray-200" onClick={() => { setCurrentService(s); setIsEditing(true); }}>تعديل</Button>
              </div>
            </div>
        ))}
      </div>

      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title={currentService.id ? 'تعديل الخدمة' : 'خدمة جديدة'} className="max-w-2xl">
        <div className="space-y-6 text-right">
          <Input label="اسم الخدمة" value={currentService.name || ''} onChange={e => setCurrentService({...currentService, name: e.target.value})} className="h-12 rounded-xl text-right font-bold" />
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">التصنيف</label>
            <select className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm font-bold bg-white outline-none" value={currentService.category || ''} onChange={e => setCurrentService({...currentService, category: e.target.value})}>
              {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
          </div>
          <Input label="سعر الخدمة (ر.س) / يبدأ من" type="number" value={currentService.price || ''} onChange={e => setCurrentService({...currentService, price: Number(e.target.value)})} className="h-12 rounded-xl text-right font-bold" />
          <div className="space-y-2">
             <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">الوصف التفصيلي</label>
             <textarea className="w-full h-32 border border-gray-200 rounded-xl p-3 bg-white outline-none resize-none font-bold text-sm" value={currentService.description || ''} onChange={e => setCurrentService({...currentService, description: e.target.value})} />
          </div>
          
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-end gap-2 text-right">معرض الأعمال <Tag className="w-4 h-4 text-primary" /></label>
            <div className="flex flex-wrap gap-4 justify-end">
                <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-xl bg-purple-50 border-2 border-dashed border-purple-200 flex items-center justify-center cursor-pointer hover:bg-purple-100 transition-all">
                    {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Plus className="w-6 h-6 text-primary" />}
                </div>
                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
                {currentService.images?.map((img, i) => (
                    <div key={i} className="w-24 h-24 rounded-xl overflow-hidden relative group border border-gray-200">
                        <img src={img} className="w-full h-full object-cover" />
                        <button onClick={() => setCurrentService({...currentService, images: currentService.images?.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3 h-3" /></button>
                    </div>
                ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-8 border-t border-gray-100 pt-6">
            <Button variant="outline" onClick={() => setIsEditing(false)} className="h-12 rounded-xl px-6 font-bold flex-1 border-gray-200">إلغاء</Button>
            <Button onClick={handleSave} disabled={uploading || saving} className="h-12 px-10 rounded-xl font-black shadow flex-[2]">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد وحفظ'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
