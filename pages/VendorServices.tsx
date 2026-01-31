
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Service, SERVICE_CATEGORIES } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatCurrency } from '../utils/currency';
import { Plus, Sparkles, Tag, ImageOff, Edit, Trash2, Package, Upload, Loader2 } from 'lucide-react';
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

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').eq('vendor_id', user.id);
    if (data) setServices(data);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, [user.id]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      const filePath = `${user.id}/service-${Date.now()}.${file.name.split('.').pop()}`;

      const { error: uploadError } = await supabase.storage.from('service-images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('service-images').getPublicUrl(filePath);
      setCurrentService({ ...currentService, image_url: publicUrl });
      toast({ title: 'نجاح', description: 'تم رفع صورة الخدمة.', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentService.name || !currentService.price) {
      toast({ title: 'خطأ', description: 'أكمل الحقول المطلوبة.', variant: 'destructive' });
      return;
    }

    const payload = { ...currentService, vendor_id: user.id, price: Number(currentService.price) };
    const { error } = currentService.id 
      ? await supabase.from('services').update(payload).eq('id', currentService.id)
      : await supabase.from('services').insert([payload]);

    if (!error) {
      setIsEditing(false);
      fetchServices();
      toast({ title: 'تم الحفظ', variant: 'success' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6 text-primary" /> إدارة خدماتي</h2>
          <p className="text-sm text-muted-foreground">أضف الخدمات وارفع صورها وحدد أسعارك.</p>
        </div>
        <Button onClick={() => { setCurrentService({ is_active: true, category: SERVICE_CATEGORIES[0] }); setIsEditing(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> إضافة خدمة جديدة
        </Button>
      </div>

      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="إدارة الخدمة">
        <div className="space-y-4">
          <Input label="اسم الخدمة" value={currentService.name || ''} onChange={e => setCurrentService({...currentService, name: e.target.value})} />
          <div className="space-y-2">
            <label className="text-sm font-medium">التصنيف</label>
            <select className="w-full h-11 border rounded-xl px-3 text-sm" value={currentService.category || ''} onChange={e => setCurrentService({...currentService, category: e.target.value})}>
              {SERVICE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <Input label="السعر" type="number" value={currentService.price || ''} onChange={e => setCurrentService({...currentService, price: Number(e.target.value)})} />
          
          <div className="space-y-2">
            <label className="text-sm font-medium">صورة الخدمة</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 overflow-hidden relative"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              ) : currentService.image_url ? (
                <img src={currentService.image_url} className="w-full h-full object-cover" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-[10px] font-bold">ارفع صورة</span>
                </>
              )}
              <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <Button variant="outline" onClick={() => setIsEditing(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={uploading}>حفظ الخدمة</Button>
          </div>
        </div>
      </Modal>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map(s => (
          <div key={s.id} className="rounded-xl border bg-card overflow-hidden shadow-sm group">
            <div className="aspect-video bg-muted relative">
              {s.image_url ? <img src={s.image_url} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center opacity-20"><ImageOff /></div>}
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">{s.name}</h3>
                <span className="text-primary font-black">{formatCurrency(s.price)}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setCurrentService(s); setIsEditing(true); }}>تعديل</Button>
                <Button size="sm" variant="destructive" onClick={async () => {
                  if(confirm('حذف؟')) {
                    await supabase.from('services').delete().eq('id', s.id);
                    fetchServices();
                  }
                }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
