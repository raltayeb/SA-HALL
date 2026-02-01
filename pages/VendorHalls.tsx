
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
      const { data, error } = await supabase.from('halls').select('*').eq('vendor_id', user.id);
      if (error) throw error;
      setHalls(data || []);
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
      setCurrentHall(prev => ({ ...prev, images: [...(prev.images || []), publicUrl] }));
      toast({ title: 'تم الرفع', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentHall.name || !currentHall.price_per_night) {
      toast({ title: 'تنبيه', description: 'يرجى إكمال البيانات.', variant: 'destructive' });
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

  const openAvailability = async (hall: Hall) => {
    setSelectedHallForAvailability(hall);
    setIsAvailabilityModalOpen(true);
    const { data } = await supabase.from('availability_blocks').select('*').eq('hall_id', hall.id);
    setBlockedDates(data || []);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center text-right flex-row-reverse">
        <h2 className="text-2xl font-black">إدارة قاعاتي</h2>
        {!isEditing && (
          <Button onClick={() => { setCurrentHall({ images: [], amenities: [], is_active: true }); setIsEditing(true); }} className="rounded-xl h-11 px-6 font-bold">
            إضافة قاعة جديدة
          </Button>
        )}
      </div>

      {isEditing && (
        <div className="bg-card p-8 rounded-[1.125rem] border shadow-xl animate-in fade-in text-right">
          <div className="flex justify-between items-center mb-8 pb-4 border-b flex-row-reverse">
            <h3 className="font-black text-xl">{currentHall.id ? 'تعديل القاعة' : 'قاعة جديدة'}</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}><X /></Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Input label="اسم القاعة" value={currentHall.name || ''} onChange={e => setCurrentHall({...currentHall, name: e.target.value})} className="h-11 rounded-xl text-right" />
            <Input label="السعر لليلة" type="number" value={currentHall.price_per_night || ''} onChange={e => setCurrentHall({...currentHall, price_per_night: Number(e.target.value)})} className="h-11 rounded-xl text-right" />
          </div>
          <div className="flex gap-3 mt-8 justify-end">
            <Button variant="outline" onClick={() => setIsEditing(false)} className="h-11 px-6 rounded-xl font-bold">إلغاء</Button>
            <Button onClick={handleSave} disabled={saving} className="h-11 px-10 rounded-xl font-bold">{saving ? 'جاري الحفظ...' : 'حفظ البيانات'}</Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-[1.125rem]"></div>)
        ) : (
          halls.map(hall => (
            <div key={hall.id} className="bg-card border rounded-[1.125rem] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col text-right">
              <div className="aspect-video bg-muted relative">
                {hall.image_url && <img src={hall.image_url} className="h-full w-full object-cover" />}
                <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-lg text-[10px] font-black">{hall.city}</div>
              </div>
              <div className="p-6 flex-1 flex flex-col space-y-3">
                <h3 className="font-black text-lg">{hall.name}</h3>
                <PriceTag amount={hall.price_per_night} />
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
           <div className="space-y-2">
             {blockedDates.map(b => (
                <div key={b.id} className="flex justify-between items-center p-3 bg-muted/20 rounded-xl border border-dashed flex-row-reverse">
                  <span className="font-bold text-sm">{b.block_date}</span>
                </div>
             ))}
           </div>
        </div>
      </Modal>
    </div>
  );
};
