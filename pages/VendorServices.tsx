
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Service, SERVICE_CATEGORIES } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatCurrency } from '../utils/currency';
import { Plus, Sparkles, Tag, ImageOff, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';

interface VendorServicesProps {
  user: UserProfile;
}

export const VendorServices: React.FC<VendorServicesProps> = ({ user }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<Service>>({});
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  
  const { toast } = useToast();

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('vendor_id', user.id);
    
    if (!error && data) {
      setServices(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, [user]);

  const handleSave = async () => {
    if (!currentService.name || !currentService.price || !currentService.category) {
      toast({ title: 'خطأ', description: 'يرجى تعبئة الحقول الإجبارية', variant: 'destructive' });
      return;
    }

    const payload = {
      ...currentService,
      vendor_id: user.id,
      price: Number(currentService.price)
    };

    let error;
    if (currentService.id) {
       const { error: updateError } = await supabase.from('services').update(payload).eq('id', currentService.id);
       error = updateError;
    } else {
       const { error: insertError } = await supabase.from('services').insert([payload]);
       error = insertError;
    }

    if (!error) {
      setIsEditing(false);
      setCurrentService({});
      fetchServices();
      toast({ title: 'نجاح', description: 'تم حفظ بيانات الخدمة بنجاح', variant: 'success' });
    } else {
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الحفظ', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deletingServiceId) return;
    
    const { error } = await supabase.from('services').delete().eq('id', deletingServiceId);
    if (!error) {
      fetchServices();
      toast({ title: 'تم الحذف', description: 'تم حذف الخدمة بنجاح', variant: 'success' });
      setDeletingServiceId(null);
    } else {
      toast({ title: 'خطأ', description: 'فشل حذف الخدمة', variant: 'destructive' });
    }
  };

  if (loading && services.length === 0) return <div className="p-8 text-center animate-pulse text-primary">جاري تحميل الخدمات...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            إدارة خدماتي
          </h2>
          <p className="text-sm text-muted-foreground">أضف وتحكم في الخدمات الإضافية التي تقدمها (ضيافة، تصوير، إلخ).</p>
        </div>
        <Button onClick={() => { setCurrentService({ is_active: true, category: SERVICE_CATEGORIES[0] }); setIsEditing(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> إضافة خدمة جديدة
        </Button>
      </div>

      <Modal 
        isOpen={isEditing} 
        onClose={() => setIsEditing(false)} 
        title={currentService.id ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
      >
        <div className="space-y-4">
          <Input 
            label="اسم الخدمة" 
            placeholder="مثال: بوفيه كلاسيكي"
            value={currentService.name || ''} 
            onChange={e => setCurrentService({...currentService, name: e.target.value})}
          />
          
          <div className="space-y-2">
            <label className="text-sm font-medium">التصنيف</label>
            <select 
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary outline-none"
              value={currentService.category || ''}
              onChange={e => setCurrentService({...currentService, category: e.target.value})}
            >
              {SERVICE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <Input 
            label="السعر (ر.س)" 
            type="number"
            placeholder="0.00"
            value={currentService.price || ''} 
            onChange={e => setCurrentService({...currentService, price: Number(e.target.value)})}
          />

          <Input 
            label="رابط الصورة" 
            placeholder="https://..."
            value={currentService.image_url || ''} 
            onChange={e => setCurrentService({...currentService, image_url: e.target.value})}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">الوصف</label>
            <textarea 
              placeholder="اكتب تفاصيل الخدمة..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              value={currentService.description || ''} 
              onChange={e => setCurrentService({...currentService, description: e.target.value})}
            />
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <Button variant="outline" onClick={() => setIsEditing(false)}>إلغاء</Button>
            <Button onClick={handleSave}>حفظ الخدمة</Button>
          </div>
        </div>
      </Modal>

      {/* Deletion Confirmation Modal */}
      <Modal 
        isOpen={!!deletingServiceId} 
        onClose={() => setDeletingServiceId(null)}
        title="تأكيد حذف الخدمة"
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <div className="bg-destructive/10 p-4 rounded-full">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <h4 className="text-lg font-bold">هل أنت متأكد من حذف هذه الخدمة؟</h4>
              <p className="text-sm text-muted-foreground">سيتم حذف الخدمة نهائياً ولن تكون متاحة للحجوزات الجديدة.</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeletingServiceId(null)}>تراجع</Button>
            <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleDelete}>
              تأكيد الحذف
            </Button>
          </div>
        </div>
      </Modal>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map(service => (
          <div key={service.id} className="group overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-md transition-all">
            <div className="aspect-[16/9] w-full bg-muted relative overflow-hidden">
              {service.image_url ? (
                <img src={service.image_url} alt={service.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                  <ImageOff className="h-8 w-8 mb-1 opacity-20" />
                  <span className="text-[10px]">لا توجد صورة</span>
                </div>
              )}
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                <Tag className="w-3 h-3 text-primary" />
                {service.category}
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-base leading-tight">{service.name}</h3>
                <span className="font-black text-primary text-sm">{formatCurrency(service.price)}</span>
              </div>
              
              <p className="text-xs text-muted-foreground line-clamp-2 italic mb-4 min-h-[32px]">
                {service.description || "لا يوجد وصف لهذه الخدمة."}
              </p>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => { setCurrentService(service); setIsEditing(true); }}>
                  <Edit className="w-3 h-3" /> تعديل
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeletingServiceId(service.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {services.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed rounded-xl bg-muted/5">
            <div className="flex flex-col items-center gap-3">
              <Package className="w-10 h-10 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">لم تقم بإضافة أي خدمات بعد.</p>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>ابدأ بإضافة خدمتك الأولى</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
