
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
  Calendar, Loader2, Info, Upload, Building2 
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
  const [currentHall, setCurrentHall] = useState<Partial<Hall>>({ images: [], amenities: [] });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedHallForAvailability, setSelectedHallForAvailability] = useState<Hall | null>(null);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [newBlockDate, setNewBlockDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { toast } = useToast();

  const fetchHalls = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('halls')
        .select('*')
        .eq('vendor_id', user.id);
      
      if (error) throw error;
      setHalls(data || []);
    } catch (err: any) {
      toast({ title: 'خطأ', description: 'فشل في تحميل القاعات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user.id, toast]);

  useEffect(() => { 
    fetchHalls(); 
  }, [fetchHalls]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${file.name.split('.').pop()}`;

      const { error: uploadError } = await supabase.storage
        .from('hall-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hall-images')
        .getPublicUrl(fileName);

      setCurrentHall(prev => ({ ...prev, images: [...(prev.images || []), publicUrl] }));
      toast({ title: 'تم الرفع', description: 'تمت إضافة الصورة بنجاح.', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'خطأ في الرفع', description: error.message, variant: 'destructive' });
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
      const hallData = {
        vendor_id: user.id,
        name: currentHall.name,
        city: currentHall.city,
        capacity: Number(currentHall.capacity || 0),
        price_per_night: Number(currentHall.price_per_night),
        description: currentHall.description || '',
        images: currentHall.images || [],
        amenities: currentHall.amenities || [],
        image_url: currentHall.images?.[0] || '',
        is_active: currentHall.is_active ?? true
      };

      const { error } = currentHall.id 
        ? await supabase.from('halls').update(hallData).eq('id', currentHall.id)
        : await supabase.from('halls').insert([hallData]);

      if (error) throw error;

      toast({ title: 'تم الحفظ بنجاح', variant: 'success' });
      setIsEditing(false);
      fetchHalls();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openAvailability = async (hall: Hall) => {
    setSelectedHallForAvailability(hall);
    setIsAvailabilityModalOpen(true);
    const { data } = await supabase.from('availability_blocks').select('*').eq('hall_id', hall.id).order('block_date', { ascending: true });
    setBlockedDates(data || []);
  };

  const handleAddBlock = async () => {
    if (!selectedHallForAvailability) return;
    const { error } = await supabase.from('availability_blocks').insert([{
      hall_id: selectedHallForAvailability.id,
      block_date: newBlockDate,
      reason: 'تعطيل يدوي'
    }]);

    if (!error) {
      toast({ title: 'تم الحفظ', variant: 'success' });
      openAvailability(selectedHallForAvailability);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center text-right flex-row-reverse">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 justify-end">
             إدارة قاعاتي <Calendar className="w-6 h-6 text-primary" />
          </h2>
          <p className="text-sm text-muted-foreground">أضف القاعات الجديدة، حدث الأسعار، وتحكم في صور المعرض.</p>
        </div>
        {!isEditing && (
          <Button onClick={() => { setCurrentHall({ images: [], amenities: [], is_active: true }); setIsEditing(true); }} className="gap-2 px-6 rounded-xl font-black h-12 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> إضافة قاعة جديدة
          </Button>
        )}
      </div>

      {isEditing && (
        <div className="bg-card p-8 rounded-[2.5rem] border shadow-2xl animate-in fade-in slide-in-from-top-4 text-right">
          <div className="flex justify-between items-center mb-8 pb-4 border-b flex-row-reverse">
            <h3 className="font-black text-2xl">{currentHall.id ? 'تعديل بيانات القاعة' : 'تجهيز قاعة جديدة'}</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)} className="rounded-full"><X /></Button>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-6">
              <Input label="اسم القاعة" value={currentHall.name || ''} onChange={e => setCurrentHall({...currentHall, name: e.target.value})} className="h-12 rounded-xl text-right font-bold" />
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">المدينة</label>
                <select className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-1 text-sm outline-none font-bold" value={currentHall.city || ''} onChange={e => setCurrentHall({...currentHall, city: e.target.value})}>
                  <option value="">اختر المدينة...</option>
                  {SAUDI_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="السعة (أفراد)" type="number" value={currentHall.capacity || ''} onChange={e => setCurrentHall({...currentHall, capacity: Number(e.target.value)})} className="h-12 rounded-xl text-right font-bold" />
                <Input label="السعر لليلة (ر.س)" type="number" value={currentHall.price_per_night || ''} onChange={e => setCurrentHall({...currentHall, price_per_night: Number(e.target.value)})} className="h-12 rounded-xl text-right font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">المرافق المتوفرة</label>
                <div className="grid grid-cols-2 gap-2 p-4 border rounded-[1.5rem] bg-muted/20">
                  {HALL_AMENITIES.map(am => (
                    <button key={am} onClick={() => {
                      const cur = currentHall.amenities || [];
                      setCurrentHall({...currentHall, amenities: cur.includes(am) ? cur.filter(x => x !== am) : [...cur, am]});
                    }} className={`flex items-center justify-end gap-2 p-3 rounded-xl text-[10px] font-black border transition-all ${currentHall.amenities?.includes(am) ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-card hover:bg-muted'}`}>
                      {am} {currentHall.amenities?.includes(am) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-end gap-2">صور المعرض <ImageIcon className="w-4 h-4 text-primary" /></label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-[2rem] p-10 text-center cursor-pointer hover:bg-muted/30 transition-colors flex flex-col items-center gap-2 group relative overflow-hidden"
                  >
                    {uploading ? (
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    ) : (
                      <Upload className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <span className="text-xs font-black text-muted-foreground">اضغط لرفع صور جديدة للقاعة</span>
                    <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
                  </div>
               </div>
               
               <div className="grid grid-cols-4 gap-3">
                  {(currentHall.images || []).map((img, idx) => (
                    <div key={idx} className="aspect-square relative rounded-2xl overflow-hidden bg-muted group border shadow-sm">
                      <img src={img} className="w-full h-full object-cover" />
                      <button onClick={() => setCurrentHall({...currentHall, images: currentHall.images?.filter((_, i) => i !== idx)})} className="absolute inset-0 bg-destructive/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  ))}
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">وصف القاعة</label>
                  <textarea className="w-full h-36 rounded-2xl border p-5 text-sm outline-none resize-none font-bold bg-muted/10 text-right" placeholder="تحدث عن مميزات القاعة وتفاصيلها..." value={currentHall.description || ''} onChange={e => setCurrentHall({...currentHall, description: e.target.value})} />
               </div>
            </div>
          </div>

          <div className="flex gap-4 mt-10 justify-end border-t pt-8">
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving} className="h-12 rounded-xl px-8 font-black">إلغاء</Button>
            <Button onClick={handleSave} disabled={saving || uploading} className="px-12 h-12 font-black rounded-xl shadow-xl shadow-primary/20">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ بيانات القاعة'}
            </Button>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({length: 3}).map((_, i) => <div key={i} className="h-[400px] bg-muted animate-pulse rounded-[2.5rem]"></div>)
          ) : (
            halls.map(hall => (
              <div key={hall.id} className="group rounded-[2.5rem] border bg-card shadow-sm hover:shadow-2xl transition-all overflow-hidden flex flex-col h-full">
                <div className="aspect-[1.5/1] bg-muted relative overflow-hidden">
                  {hall.image_url ? <img src={hall.image_url} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center opacity-20"><ImageOff className="w-10 h-10" /></div>}
                  <div className="absolute top-5 right-5 bg-white/95 backdrop-blur px-4 py-1 rounded-full text-[10px] font-black shadow-sm">{hall.city}</div>
                </div>
                <div className="p-8 space-y-4 flex-1 flex flex-col text-right">
                  <div className="flex justify-between items-start flex-row-reverse">
                    <h3 className="font-black text-2xl tracking-tight leading-none">{hall.name}</h3>
                    <PriceTag amount={hall.price_per_night} className="text-primary text-xl" />
                  </div>
                  <div className="flex items-center justify-end gap-3 text-xs font-bold text-muted-foreground">
                    {hall.capacity} ضيف <Users className="w-4 h-4 text-primary" />
                    <span className="w-1 h-1 bg-muted-foreground/30 rounded-full"></span>
                    {hall.city} <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-3 pt-6 border-t">
                    <Button variant="outline" className="rounded-xl font-black h-12 shadow-sm border-2" onClick={() => { setCurrentHall(hall); setIsEditing(true); }}>تعديل البيانات</Button>
                    <Button variant="outline" className="rounded-xl font-black h-12 shadow-sm border-2" onClick={() => openAvailability(hall)}>إدارة التوفر</Button>
                  </div>
                </div>
              </div>
            ))
          )}
          {!loading && halls.length === 0 && (
            <div className="col-span-full py-32 text-center border-2 border-dashed rounded-[3rem] bg-muted/5 opacity-50 flex flex-col items-center gap-4">
               <Building2 className="w-16 h-16 text-muted-foreground" />
               <p className="font-black text-xl text-muted-foreground">لا يوجد قاعات مسجلة حالياً، ابدأ بإضافة قاعتك الأولى!</p>
               <Button onClick={() => { setCurrentHall({ images: [], amenities: [], i_active: true }); setIsEditing(true); }} className="rounded-2xl h-14 px-10 font-black">إضافة قاعة الآن</Button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isAvailabilityModalOpen} onClose={() => setIsAvailabilityModalOpen(false)} title="إدارة توفر القاعة">
        <div className="space-y-6 text-right">
           <div className="space-y-3">
             <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">تعطيل تاريخ محدد</label>
             <div className="flex gap-2">
               <input type="date" className="flex-1 h-12 bg-muted/30 border rounded-xl px-4 outline-none font-bold" value={newBlockDate} onChange={e => setNewBlockDate(e.target.value)} />
               <Button onClick={handleAddBlock} className="font-black px-6 rounded-xl">حظر الموعد</Button>
             </div>
           </div>
           <div className="space-y-3">
             <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">المواعيد المحظورة حالياً</p>
             <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
               {blockedDates.length === 0 ? (
                 <p className="p-10 text-center text-xs text-muted-foreground italic font-bold">جميع التواريخ متاحة</p>
               ) : (
                 blockedDates.map(b => (
                   <div key={b.id} className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-dashed flex-row-reverse">
                     <span className="font-black text-sm">{format(new Date(b.block_date), 'yyyy/MM/dd')}</span>
                     <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-full" onClick={async () => {
                       await supabase.from('availability_blocks').delete().eq('id', b.id);
                       openAvailability(selectedHallForAvailability!);
                     }}><Trash2 className="w-4 h-4" /></Button>
                   </div>
                 ))
               )}
             </div>
           </div>
        </div>
      </Modal>
    </div>
  );
};
