
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Hall, SAUDI_CITIES, HALL_AMENITIES } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Modal } from '../components/ui/Modal';
import { 
  Plus, MapPin, Users, ImageOff, Edit, Trash2, 
  Image as ImageIcon, X, CheckSquare, Square, 
  Calendar, Loader2, Info, Upload 
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

  // Availability Management State
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedHallForAvailability, setSelectedHallForAvailability] = useState<Hall | null>(null);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [newBlockDate, setNewBlockDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { toast } = useToast();

  const fetchHalls = async () => {
    setLoading(true);
    const { data } = await supabase.from('halls').select('*').eq('vendor_id', user.id);
    if (data) setHalls(data);
    setLoading(false);
  };

  useEffect(() => { fetchHalls(); }, [user.id]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('hall-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hall-images')
        .getPublicUrl(filePath);

      const currentImages = currentHall.images || [];
      setCurrentHall({ ...currentHall, images: [...currentImages, publicUrl] });
      toast({ title: 'تم الرفع', description: 'تم رفع الصورة بنجاح.', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'خطأ في الرفع', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!currentHall.name || !currentHall.price_per_night || !currentHall.city) {
      toast({ title: 'تنبيه', description: 'يرجى تعبئة الحقول الأساسية.', variant: 'destructive' });
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

      toast({ title: 'تم بنجاح', variant: 'success' });
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" /> إدارة قاعاتي
          </h2>
          <p className="text-sm text-muted-foreground">أضف القاعات وارفع الصور وحدد التوفر.</p>
        </div>
        {!isEditing && (
          <Button onClick={() => { setCurrentHall({ images: [], amenities: [], is_active: true }); setIsEditing(true); }} className="gap-2 px-6 rounded-xl">
            <Plus className="w-4 h-4" /> إضافة قاعة جديدة
          </Button>
        )}
      </div>

      {isEditing && (
        <div className="bg-card p-8 rounded-3xl border shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-8 pb-4 border-b">
            <h3 className="font-black text-2xl">{currentHall.id ? 'تعديل القاعة' : 'إضافة قاعة جديدة'}</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}><X /></Button>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-6">
              <Input label="اسم القاعة" value={currentHall.name || ''} onChange={e => setCurrentHall({...currentHall, name: e.target.value})} />
              <div className="space-y-2">
                <label className="text-sm font-bold">المدينة</label>
                <select className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-1 text-sm outline-none" value={currentHall.city || ''} onChange={e => setCurrentHall({...currentHall, city: e.target.value})}>
                  <option value="">اختر المدينة</option>
                  {SAUDI_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="السعة" type="number" value={currentHall.capacity || ''} onChange={e => setCurrentHall({...currentHall, capacity: Number(e.target.value)})} />
                <Input label="السعر" type="number" value={currentHall.price_per_night || ''} onChange={e => setCurrentHall({...currentHall, price_per_night: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">المرافق</label>
                <div className="grid grid-cols-2 gap-2 p-4 border rounded-2xl bg-muted/20">
                  {HALL_AMENITIES.map(am => (
                    <button key={am} onClick={() => {
                      const cur = currentHall.amenities || [];
                      setCurrentHall({...currentHall, amenities: cur.includes(am) ? cur.filter(x => x !== am) : [...cur, am]});
                    }} className={`flex items-center gap-2 p-2 rounded-xl text-[10px] font-bold border transition-all ${currentHall.amenities?.includes(am) ? 'bg-primary text-white border-primary' : 'bg-background hover:bg-muted'}`}>
                      {currentHall.amenities?.includes(am) ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />} {am}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-sm font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /> صور القاعة</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors flex flex-col items-center gap-2 group"
                  >
                    {uploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    ) : (
                      <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <span className="text-xs font-bold text-muted-foreground">اضغط لرفع صورة جديدة</span>
                    <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
                  </div>
               </div>
               
               <div className="grid grid-cols-4 gap-3">
                  {(currentHall.images || []).map((img, idx) => (
                    <div key={idx} className="aspect-square relative rounded-xl overflow-hidden bg-muted group border">
                      <img src={img} className="w-full h-full object-cover" />
                      <button onClick={() => setCurrentHall({...currentHall, images: currentHall.images?.filter((_, i) => i !== idx)})} className="absolute top-1 left-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
               </div>
               <textarea className="w-full h-32 rounded-2xl border p-4 text-sm outline-none resize-none" placeholder="وصف القاعة..." value={currentHall.description || ''} onChange={e => setCurrentHall({...currentHall, description: e.target.value})} />
            </div>
          </div>

          <div className="flex gap-4 mt-8 justify-end">
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving || uploading} className="px-10 h-12 font-black">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ البيانات'}
            </Button>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {halls.map(hall => (
            <div key={hall.id} className="group rounded-[2rem] border bg-card shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col">
              <div className="aspect-[1.5/1] bg-muted relative">
                {hall.image_url ? <img src={hall.image_url} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center opacity-20"><ImageOff className="w-10 h-10" /></div>}
                <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-[10px] font-black">{hall.city}</div>
              </div>
              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-xl">{hall.name}</h3>
                  <PriceTag amount={hall.price_per_night} className="text-primary text-xl" />
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2 pt-4 border-t">
                   <Button variant="outline" className="rounded-xl font-bold h-10" onClick={() => { setCurrentHall(hall); setIsEditing(true); }}><Edit className="w-4 h-4 ml-2" /> تعديل</Button>
                   <Button variant="outline" className="rounded-xl font-bold h-10" onClick={() => openAvailability(hall)}><Calendar className="w-4 h-4 ml-2" /> التوفر</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isAvailabilityModalOpen} onClose={() => setIsAvailabilityModalOpen(false)} title="إدارة التوفر">
        <div className="space-y-4">
           <div className="flex gap-2">
             <input type="date" className="flex-1 h-11 bg-background border rounded-xl px-4 outline-none" value={newBlockDate} onChange={e => setNewBlockDate(e.target.value)} />
             <Button onClick={handleAddBlock} className="font-bold">تعطيل اليوم</Button>
           </div>
           <div className="space-y-2 max-h-48 overflow-y-auto">
             {blockedDates.map(b => (
               <div key={b.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-xl border">
                 <span className="font-bold text-sm">{format(new Date(b.block_date), 'yyyy/MM/dd')}</span>
                 <Button variant="ghost" size="icon" onClick={async () => {
                   await supabase.from('availability_blocks').delete().eq('id', b.id);
                   openAvailability(selectedHallForAvailability!);
                 }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
               </div>
             ))}
           </div>
        </div>
      </Modal>
    </div>
  );
};
