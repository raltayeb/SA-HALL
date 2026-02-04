
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Hall, SAUDI_CITIES, HALL_AMENITIES } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Modal } from '../components/ui/Modal';
import { 
  Plus, MapPin, Users, ImageOff, Edit, Trash2, 
  Image as ImageIcon, X, CheckSquare, Square, 
  Calendar, Loader2, Info, Upload, Building2, Lock, ArrowUpRight, Send
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';

interface VendorHallsProps {
  user: UserProfile;
}

export const VendorHalls: React.FC<VendorHallsProps> = ({ user }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentHall, setCurrentHall] = useState<Partial<Hall>>({ images: [], amenities: [], city: SAUDI_CITIES[0] });
  
  // Upgrade Request State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedHallForAvailability, setSelectedHallForAvailability] = useState<Hall | null>(null);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);

  const { toast } = useToast();

  const fetchHalls = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('halls').select('*').eq('vendor_id', user.id);
      if (error) throw error;
      setHalls(data || []);
      
      // Check for pending requests
      const { data: requests } = await supabase.from('upgrade_requests').select('*').eq('vendor_id', user.id).eq('request_type', 'hall').eq('status', 'pending');
      if (requests && requests.length > 0) setHasPendingRequest(true);
      
    } catch (err: any) {
      toast({ title: 'خطأ', description: 'فشل في تحميل القاعات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user.id, toast]);

  useEffect(() => { fetchHalls(); }, [fetchHalls]);

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
          image_url: newImages[0] // Set first image as cover
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
      fetchHalls();
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

  const openAvailability = async (hall: Hall) => {
    setSelectedHallForAvailability(hall);
    setIsAvailabilityModalOpen(true);
    const { data } = await supabase.from('availability_blocks').select('*').eq('hall_id', hall.id);
    setBlockedDates(data || []);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center text-right flex-row-reverse">
        <div>
           <h2 className="text-2xl font-black">إدارة قاعاتي</h2>
           <p className="text-sm text-muted-foreground mt-1">
              لديك {halls.length} من أصل {user.hall_limit} قاعات مسموحة.
           </p>
        </div>
        {!isEditing && (
          <Button onClick={handleAddNew} className={`rounded-xl h-12 px-6 font-bold gap-2 ${halls.length >= user.hall_limit ? 'bg-gray-100 text-gray-400 hover:bg-gray-200 shadow-none hover:text-primary' : 'shadow-lg shadow-primary/20'}`}>
            {halls.length >= user.hall_limit ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {halls.length >= user.hall_limit ? 'طلب إضافة قاعة' : 'إضافة قاعة جديدة'}
          </Button>
        )}
      </div>

      {/* Upgrade Request Modal */}
      <Modal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} title="طلب زيادة السعة">
         <div className="space-y-6 text-center py-4">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto text-primary">
                <Building2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-black">لقد وصلت للحد الأقصى</h3>
                <p className="text-sm text-gray-500 font-bold leading-relaxed">باقة اشتراكك الحالية تسمح بـ {user.hall_limit} قاعات فقط. يمكنك إرسال طلب للإدارة لزيادة الحد المسموح وإضافة قاعة جديدة.</p>
            </div>
            
            {hasPendingRequest ? (
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-yellow-800 font-bold text-sm">
                    يوجد طلب قيد المراجعة حالياً. سيتم إشعارك عند الموافقة.
                </div>
            ) : (
                <Button onClick={handleRequestUpgrade} className="w-full h-12 rounded-xl font-bold shadow-xl shadow-primary/20 gap-2">
                    <Send className="w-4 h-4" /> إرسال طلب الترقية
                </Button>
            )}
         </div>
      </Modal>

      {isEditing && (
        <div className="bg-card p-8 rounded-[1.125rem] border shadow-xl animate-in fade-in text-right">
          <div className="flex justify-between items-center mb-8 pb-4 border-b flex-row-reverse">
            <h3 className="font-black text-xl">{currentHall.id ? 'تعديل القاعة' : 'قاعة جديدة'}</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}><X /></Button>
          </div>
          
          <div className="grid gap-8 lg:grid-cols-2">
             <div className="space-y-6">
                <div className="space-y-4">
                  <Input label="اسم القاعة" value={currentHall.name || ''} onChange={e => setCurrentHall({...currentHall, name: e.target.value})} className="h-12 rounded-xl text-right" />
                  <div className="grid grid-cols-2 gap-4">
                     <Input label="السعر لليلة (ر.س)" type="number" value={currentHall.price_per_night || ''} onChange={e => setCurrentHall({...currentHall, price_per_night: Number(e.target.value)})} className="h-12 rounded-xl text-right" />
                     <Input label="السعة (شخص)" type="number" value={currentHall.capacity || ''} onChange={e => setCurrentHall({...currentHall, capacity: Number(e.target.value)})} className="h-12 rounded-xl text-right" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-500">المدينة</label>
                     <select className="w-full h-12 border rounded-xl px-4 bg-transparent outline-none text-right" value={currentHall.city} onChange={e => setCurrentHall({...currentHall, city: e.target.value})}>
                        {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-500">وصف القاعة</label>
                     <textarea className="w-full h-32 border rounded-xl p-4 bg-transparent outline-none text-right resize-none" value={currentHall.description || ''} onChange={e => setCurrentHall({...currentHall, description: e.target.value})} placeholder="اكتب وصفاً جذاباً للقاعة..." />
                  </div>
                </div>
             </div>

             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500">صور القاعة</label>
                   <div className="grid grid-cols-3 gap-2">
                      {currentHall.images?.map((img, i) => (
                         <div key={i} className="aspect-square rounded-xl overflow-hidden relative group">
                            <img src={img} className="w-full h-full object-cover" />
                            <button onClick={() => setCurrentHall({...currentHall, images: currentHall.images?.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                         </div>
                      ))}
                      <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                         {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Plus className="w-6 h-6 text-gray-400" />}
                         <span className="text-[10px] text-gray-400 mt-2">إضافة صورة</span>
                      </div>
                      <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-bold text-gray-500">المرافق والخدمات</label>
                   <div className="grid grid-cols-2 gap-2">
                      {HALL_AMENITIES.map(amenity => (
                         <button 
                           key={amenity}
                           onClick={() => toggleAmenity(amenity)}
                           className={`flex items-center gap-2 p-3 rounded-xl border text-[11px] font-bold transition-all ${currentHall.amenities?.includes(amenity) ? 'bg-primary/5 border-primary text-primary' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
                         >
                            {currentHall.amenities?.includes(amenity) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            {amenity}
                         </button>
                      ))}
                   </div>
                </div>
             </div>
          </div>

          <div className="flex gap-3 mt-8 justify-end border-t pt-6">
            <Button variant="outline" onClick={() => setIsEditing(false)} className="h-12 px-8 rounded-xl font-bold">إلغاء</Button>
            <Button onClick={handleSave} disabled={saving} className="h-12 px-12 rounded-xl font-bold">{saving ? 'جاري الحفظ...' : 'حفظ البيانات'}</Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-[1.125rem]"></div>)
        ) : (
          halls.map(hall => (
            <div key={hall.id} className="bg-card border rounded-[1.125rem] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col text-right group">
              <div className="aspect-video bg-muted relative overflow-hidden">
                {hall.image_url && <img src={hall.image_url} className="h-full w-full object-cover transition-transform group-hover:scale-105" />}
                <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-lg text-[10px] font-black">{hall.city}</div>
              </div>
              <div className="p-6 flex-1 flex flex-col space-y-3">
                <h3 className="font-black text-lg truncate">{hall.name}</h3>
                <PriceTag amount={hall.price_per_night} />
                <div className="flex flex-wrap gap-2 mt-2">
                   {hall.amenities?.slice(0, 3).map((a, i) => <span key={i} className="text-[9px] bg-gray-100 px-2 py-1 rounded text-gray-500">{a}</span>)}
                   {(hall.amenities?.length || 0) > 3 && <span className="text-[9px] bg-gray-100 px-2 py-1 rounded text-gray-500">+{hall.amenities!.length - 3}</span>}
                </div>
                <div className="mt-auto flex gap-2 pt-4 border-t">
                  <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-bold" onClick={() => { setCurrentHall(hall); setIsEditing(true); }}>تعديل</Button>
                  <Button variant="outline" className="rounded-xl h-10 text-xs font-bold" onClick={() => openAvailability(hall)}>التوفر</Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isAvailabilityModalOpen} onClose={() => setIsAvailabilityModalOpen(false)} title="إدارة توفر القاعة">
        <div className="space-y-4 text-right">
           <p className="text-sm font-bold opacity-60">يمكنك حظر تواريخ محددة لتظهر كغير متوفرة للعملاء.</p>
           <div className="space-y-2 max-h-60 overflow-y-auto">
             {blockedDates.length === 0 ? <p className="text-xs text-gray-400">لا توجد تواريخ محظورة</p> : blockedDates.map(b => (
                <div key={b.id} className="flex justify-between items-center p-3 bg-muted/20 rounded-xl border border-dashed flex-row-reverse">
                  <span className="font-bold text-sm">{b.block_date}</span>
                </div>
             ))}
           </div>
           <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800 font-bold">
              يتم إدارة الحظر تلقائياً عند قبول الحجوزات، يمكنك إضافة حظر يدوي من التقويم.
           </div>
        </div>
      </Modal>
    </div>
  );
};
