
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Service, SERVICE_CATEGORIES } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { formatCurrency } from '../utils/currency';
import { Plus, Sparkles, Tag, ImageOff, Edit, Trash2, Package, Upload, Loader2, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';

interface VendorServicesProps {
  user: UserProfile;
}

export const VendorServices: React.FC<VendorServicesProps> = ({ user }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<Service>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('vendor_id', user.id);
      
      if (error) throw error;
      setServices(data || []);
    } catch (err: any) {
      toast({ title: 'خطأ', description: 'فشل في تحميل الخدمات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user.id, toast]);

  useEffect(() => { 
    fetchServices(); 
  }, [fetchServices]);

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
      setCurrentService(prev => ({ ...prev, image_url: publicUrl }));
      toast({ title: 'نجاح', description: 'تم رفع صورة الخدمة بنجاح.', variant: 'success' });
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

    const payload = { 
      ...currentService, 
      vendor_id: user.id, 
      price: Number(currentService.price),
      is_active: currentService.is_active ?? true,
      category: currentService.category || SERVICE_CATEGORIES[0]
    };

    try {
      const { error } = currentService.id 
        ? await supabase.from('services').update(payload).eq('id', currentService.id)
        : await supabase.from('services').insert([payload]);

      if (error) throw error;

      setIsEditing(false);
      fetchServices();
      toast({ title: 'تم الحفظ', description: 'تم تحديث بيانات الخدمة بنجاح.', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center text-right flex-row-reverse">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2 justify-end">
             إدارة خدماتي الإضافية <Sparkles className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">قدم خدمات الطعام، التصوير، والتنسيق لعملاء القاعة.</p>
        </div>
        <Button onClick={() => { setCurrentService({ is_active: true, category: SERVICE_CATEGORIES[0] }); setIsEditing(true); }} className="gap-2 px-6 rounded-xl font-black h-12 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> إضافة خدمة جديدة
        </Button>
      </div>

      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title={currentService.id ? 'تعديل الخدمة' : 'خدمة جديدة'}>
        <div className="space-y-6 text-right">
          <Input label="اسم الخدمة" value={currentService.name || ''} onChange={e => setCurrentService({...currentService, name: e.target.value})} className="h-12 rounded-xl text-right font-bold" />
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">التصنيف</label>
            <select className="w-full h-12 border rounded-xl px-4 text-sm font-bold bg-card outline-none" value={currentService.category || ''} onChange={e => setCurrentService({...currentService, category: e.target.value})}>
              {SERVICE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <Input label="سعر الخدمة (ر.س)" type="number" value={currentService.price || ''} onChange={e => setCurrentService({...currentService, price: Number(e.target.value)})} className="h-12 rounded-xl text-right font-bold" />
          
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-end gap-2 text-right">صورة الخدمة <Tag className="w-4 h-4 text-primary" /></label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[1.5/1] border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-all overflow-hidden relative group"
            >
              {uploading ? (
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              ) : currentService.image_url ? (
                <>
                  <img src={currentService.image_url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                     <Upload className="w-8 h-8 text-white" />
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[10px] font-black text-muted-foreground mt-2">ارفع صورة تعريفية</span>
                </>
              )}
              <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-8 border-t pt-6">
            <Button variant="outline" onClick={() => setIsEditing(false)} className="h-12 rounded-xl px-6 font-black">إلغاء</Button>
            <Button onClick={handleSave} disabled={uploading} className="h-12 px-10 rounded-xl font-black shadow-xl shadow-primary/20">تأكيد وحفظ</Button>
          </div>
        </div>
      </Modal>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({length: 3}).map((_, i) => <div key={i} className="h-[250px] bg-muted animate-pulse rounded-[2.5rem]"></div>)
        ) : (
          services.map(s => (
            <div key={s.id} className="rounded-[2.5rem] border bg-card overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col h-full">
              <div className="aspect-[1.5/1] bg-muted relative overflow-hidden border-b">
                {s.image_url ? <img src={s.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center opacity-10"><Package className="w-12 h-12" /></div>}
                <div className="absolute top-4 right-4 bg-primary/95 text-white px-4 py-1 rounded-full text-[10px] font-black shadow-lg">{s.category}</div>
              </div>
              <div className="p-8 space-y-4 flex-1 flex flex-col text-right">
                <div className="flex justify-between items-center flex-row-reverse">
                  <h3 className="font-black text-xl tracking-tight leading-none">{s.name}</h3>
                  <PriceTag amount={s.price} className="text-primary text-xl" />
                </div>
                <div className="mt-auto flex gap-3 pt-6 border-t">
                  <Button variant="outline" className="flex-1 rounded-xl h-12 font-black border-2" onClick={() => { setCurrentService(s); setIsEditing(true); }}>تعديل</Button>
                  <Button variant="outline" className="rounded-xl h-12 border-2 text-destructive hover:bg-destructive/10" onClick={async () => {
                    if(confirm('هل تريد حذف هذه الخدمة نهائياً؟')) {
                      await supabase.from('services').delete().eq('id', s.id);
                      fetchServices();
                    }
                  }}><Trash2 className="w-5 h-5" /></Button>
                </div>
              </div>
            </div>
          ))
        )}
        {!loading && services.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[3rem] bg-muted/5 opacity-50 flex flex-col items-center gap-4">
             <Package className="w-12 h-12 text-muted-foreground" />
             <p className="font-black text-muted-foreground text-right">لا يوجد خدمات مضافة حالياً.</p>
             <Button onClick={() => { setCurrentService({ is_active: true, category: SERVICE_CATEGORIES[0] }); setIsEditing(true); }} variant="outline" className="font-black">أضف خدمتك الأولى</Button>
          </div>
        )}
      </div>
    </div>
  );
};
