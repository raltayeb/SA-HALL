
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Hall, SAUDI_CITIES, HALL_AMENITIES } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Modal } from '../components/ui/Modal';
import { Plus, MapPin, Users, ImageOff, Edit, Trash2, Image, X, CheckSquare, Square, Calendar, Loader2, Info } from 'lucide-react';
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
  const [currentHall, setCurrentHall] = useState<Partial<Hall>>({ images: [], amenities: [] });
  const [newImageUrl, setNewImageUrl] = useState('');

  // Availability Management State
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedHallForAvailability, setSelectedHallForAvailability] = useState<Hall | null>(null);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [newBlockDate, setNewBlockDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { toast } = useToast();

  const fetchHalls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('halls')
        .select('*')
        .eq('vendor_id', user.id);
      
      if (!error && data) {
        setHalls(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHalls();
  }, [user]);

  const handleSave = async () => {
    if (!currentHall.name || !currentHall.price_per_night || !currentHall.city) {
      toast({ title: 'تنبيه', description: 'يرجى تعبئة الحقول الأساسية: الاسم، المدينة، والسعر.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Clean payload: explicitly define what we send to avoid Supabase errors with unknown keys
      const hallData = {
        vendor_id: user.id,
        name: currentHall.name,
        city: currentHall.city,
        capacity: Number(currentHall.capacity || 0),
        price_per_night: Number(currentHall.price_per_night),
        description: currentHall.description || '',
        images: currentHall.images || [],
        amenities: currentHall.amenities || [],
        image_url: currentHall.image_url || (currentHall.images && currentHall.images.length > 0 ? currentHall.images[0] : ''),
        is_active: currentHall.is_active ?? true
      };

      let error;
      if (currentHall.id) {
        const { error: updateError } = await supabase
          .from('halls')
          .update(hallData)
          .eq('id', currentHall.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('halls')
          .insert([hallData]);
        error = insertError;
      }

      if (error) throw error;

      toast({ title: 'تم بنجاح', description: 'تم حفظ بيانات القاعة بنجاح.', variant: 'success' });
      setIsEditing(false);
      setCurrentHall({ images: [], amenities: [] });
      fetchHalls();
    } catch (err: any) {
      console.error('Save error:', err);
      toast({ title: 'خطأ في الحفظ', description: err.message || 'فشل الاتصال بالخادم.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Availability Logic
  const openAvailability = async (hall: Hall) => {
    setSelectedHallForAvailability(hall);
    setIsAvailabilityModalOpen(true);
    fetchBlockedDates(hall.id);
  };

  const fetchBlockedDates = async (hallId: string) => {
    const { data } = await supabase.from('availability_blocks').select('*').eq('hall_id', hallId).order('block_date', { ascending: true });
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
      toast({ title: 'تم الحفظ', description: 'تم تعطيل التاريخ المحدد.', variant: 'success' });
      fetchBlockedDates(selectedHallForAvailability.id);
    } else {
      toast({ title: 'خطأ', description: 'هذا التاريخ معطل بالفعل أو حدث خطأ.', variant: 'destructive' });
    }
  };

  const handleDeleteBlock = async (id: string) => {
    const { error } = await supabase.from('availability_blocks').delete().eq('id', id);
    if (!error && selectedHallForAvailability) {
      fetchBlockedDates(selectedHallForAvailability.id);
    }
  };

  const toggleAmenity = (amenity: string) => {
    const currentAmenities = currentHall.amenities || [];
    if (currentAmenities.includes(amenity)) {
      setCurrentHall({ ...currentHall, amenities: currentAmenities.filter(a => a !== amenity) });
    } else {
      setCurrentHall({ ...currentHall, amenities: [...currentAmenities, amenity] });
    }
  };

  const addImageToGallery = () => {
    if (!newImageUrl) return;
    const currentImages = currentHall.images || [];
    setCurrentHall({ ...currentHall, images: [...currentImages, newImageUrl] });
    setNewImageUrl('');
  };

  const removeImageFromGallery = (index: number) => {
    const currentImages = currentHall.images || [];
    setCurrentHall({ ...currentHall, images: currentImages.filter((_, i) => i !== index) });
  };

  const handleDeleteHall = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه القاعة؟ سيتم حذف كافة البيانات المرتبطة بها.')) {
      const { error } = await supabase.from('halls').delete().eq('id', id);
      if (!error) {
        fetchHalls();
        toast({ title: 'تم الحذف', variant: 'success' });
      } else {
        toast({ title: 'خطأ', description: 'لا يمكن حذف القاعة لوجود حجوزات مرتبطة بها.', variant: 'destructive' });
      }
    }
  };

  if (loading && !isEditing && halls.length === 0) return <div className="p-12 text-center animate-pulse flex flex-col items-center gap-4"><Loader2 className="w-8 h-8 animate-spin text-primary" /> جاري تحميل القاعات...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            إدارة قاعاتي
          </h2>
          <p className="text-sm text-muted-foreground">أضف القاعات، حدد الأسعار، وقم بتعطيل التواريخ غير المتاحة.</p>
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
            <h3 className="font-black text-2xl">{currentHall.id ? 'تعديل بيانات القاعة' : 'إضافة قاعة جديدة'}</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}><X /></Button>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-6">
              <Input 
                label="اسم القاعة" 
                placeholder="مثال: قاعة الفخامة الكبرى"
                value={currentHall.name || ''} 
                onChange={e => setCurrentHall({...currentHall, name: e.target.value})}
              />
              <div className="space-y-2">
                <label className="text-sm font-bold">المدينة</label>
                <select 
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-1 text-sm focus:ring-1 focus:ring-primary outline-none appearance-none"
                  value={currentHall.city || ''}
                  onChange={e => setCurrentHall({...currentHall, city: e.target.value})}
                >
                  <option value="">اختر المدينة</option>
                  {SAUDI_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="السعة (شخص)" 
                  type="number"
                  value={currentHall.capacity || ''} 
                  onChange={e => setCurrentHall({...currentHall, capacity: Number(e.target.value)})}
                />
                <Input 
                  label="السعر (ر.س)" 
                  type="number"
                  value={currentHall.price_per_night || ''} 
                  onChange={e => setCurrentHall({...currentHall, price_per_night: Number(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">المرافق والخدمات</label>
                <div className="grid grid-cols-2 gap-2 p-4 border rounded-2xl bg-muted/20">
                  {HALL_AMENITIES.map(amenity => (
                    <button
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-[11px] font-bold transition-all border ${currentHall.amenities?.includes(amenity) ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background hover:bg-muted border-transparent'}`}
                    >
                      {currentHall.amenities?.includes(amenity) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      {amenity}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-sm font-bold flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" /> معرض الصور (روابط URL)
                  </label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="https://example.com/image.jpg" 
                      value={newImageUrl} 
                      onChange={e => setNewImageUrl(e.target.value)}
                    />
                    <Button type="button" variant="secondary" onClick={addImageToGallery} className="rounded-xl px-4">إضافة</Button>
                  </div>
               </div>
               
               <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {(currentHall.images || []).map((img, idx) => (
                    <div key={idx} className="aspect-square relative group border-2 rounded-2xl overflow-hidden bg-muted">
                      <img src={img} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeImageFromGallery(idx)}
                        className="absolute top-1 left-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(!currentHall.images || currentHall.images.length === 0) && (
                    <div className="col-span-full text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-2xl flex flex-col items-center gap-2">
                      <ImageOff className="w-8 h-8 opacity-20" />
                      أضف صور القاعة لرفع جاذبية العرض
                    </div>
                  )}
               </div>

               <div className="space-y-2 pt-2">
                <label className="text-sm font-bold">الوصف التفصيلي</label>
                <textarea 
                  className="flex min-h-[120px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                  placeholder="صِف قاعتك وما يميزها عن الآخرين..."
                  value={currentHall.description || ''} 
                  onChange={e => setCurrentHall({...currentHall, description: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-10 justify-end border-t pt-6">
            <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl px-8 h-12" disabled={saving}>إلغاء</Button>
            <Button onClick={handleSave} className="px-12 rounded-xl h-12 shadow-xl shadow-primary/20 font-black" disabled={saving}>
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ بيانات القاعة'}
            </Button>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {halls.map(hall => (
            <div key={hall.id} className="group relative rounded-[2rem] border bg-card text-card-foreground shadow-sm transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden">
              <div className="aspect-[1.5/1] w-full overflow-hidden bg-muted relative">
                {hall.image_url ? (
                  <img src={hall.image_url} alt={hall.name} className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-700" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground bg-muted/50">
                    <ImageOff className="h-10 w-10 mb-2 opacity-20" />
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                  <MapPin className="w-3 h-3 text-primary" />
                  {hall.city}
                </div>
                {!hall.is_active && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                    <span className="bg-destructive text-white px-4 py-1 rounded-full text-xs font-black shadow-lg">غير مفعلة</span>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-xl leading-tight">{hall.name}</h3>
                  <PriceTag amount={hall.price_per_night} className="text-primary text-xl" />
                </div>
                <div className="flex items-center gap-4 text-[11px] font-bold text-muted-foreground mb-6">
                  <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-lg">
                    <Users className="w-3.5 h-3.5 text-primary" /> 
                    {hall.capacity} شخص
                  </span>
                  <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-lg">
                    <Image className="w-3.5 h-3.5 text-primary" />
                    {hall.images?.length || 0} صور
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    className="gap-2 rounded-xl h-10 text-xs font-bold"
                    onClick={() => { setCurrentHall(hall); setIsEditing(true); }}
                  >
                    <Edit className="w-4 h-4" /> تعديل
                  </Button>
                  <Button 
                    variant="outline" 
                    className="gap-2 rounded-xl h-10 text-xs font-bold border-primary/20 text-primary hover:bg-primary/5"
                    onClick={() => openAvailability(hall)}
                  >
                    <Calendar className="w-4 h-4" /> التوفر
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="col-span-2 gap-2 rounded-xl h-10 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteHall(hall.id)}
                  >
                    <Trash2 className="w-4 h-4" /> حذف القاعة
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {halls.length === 0 && !isEditing && (
            <div className="col-span-full py-32 text-center border-2 border-dashed rounded-[3rem] bg-muted/5">
              <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                <div className="bg-primary/10 p-6 rounded-full">
                  <Building2 className="w-12 h-12 text-primary opacity-50" />
                </div>
                <h4 className="text-xl font-black">ابدأ الآن بإضافة قاعتك!</h4>
                <p className="text-sm text-muted-foreground mb-4">انضم إلى مجتمع بائعي SA Hall وابدأ في استقبال الحجوزات اليوم.</p>
                <Button onClick={() => { setCurrentHall({ images: [], amenities: [], is_active: true }); setIsEditing(true); }} className="rounded-2xl px-10 h-12 shadow-xl shadow-primary/20 font-black">إضافة أول قاعة</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Availability Management Modal */}
      <Modal 
        isOpen={isAvailabilityModalOpen} 
        onClose={() => setIsAvailabilityModalOpen(false)} 
        title={`إدارة توفر: ${selectedHallForAvailability?.name}`}
      >
        <div className="space-y-6">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-2xl text-xs flex gap-3 leading-relaxed">
            <Info className="w-5 h-5 shrink-0" />
            تستخدم هذه الواجهة لتعطيل أيام محددة لا يمكن الحجز فيها (أيام صيانة، مناسبات خاصة، إلخ). أيام الحجوزات المؤكدة يتم تعطيلها تلقائياً.
          </div>

          <div className="flex gap-2">
            <input 
              type="date" 
              className="flex-1 h-11 bg-background border rounded-xl px-4 outline-none focus:ring-1 focus:ring-primary"
              value={newBlockDate}
              onChange={e => setNewBlockDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
            <Button onClick={handleAddBlock} className="rounded-xl px-6 font-bold">تعطيل اليوم</Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-3">الأيام المعطلة حالياً</h4>
            {blockedDates.map(block => (
              <div key={block.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-xl border border-border/50">
                <span className="font-bold text-sm">{format(new Date(block.block_date), 'yyyy/MM/dd')}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBlock(block.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {blockedDates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs italic">لا يوجد أيام معطلة يدوياً</div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Internal icon shim for Building2 if not imported correctly
const Building2 = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
);
