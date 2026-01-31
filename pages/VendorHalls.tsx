
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Hall, SAUDI_CITIES, HALL_AMENITIES } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Plus, MapPin, Users, ImageOff, Edit, Trash2, Image, X, CheckSquare, Square } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface VendorHallsProps {
  user: UserProfile;
}

export const VendorHalls: React.FC<VendorHallsProps> = ({ user }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentHall, setCurrentHall] = useState<Partial<Hall>>({ images: [], amenities: [] });
  const [newImageUrl, setNewImageUrl] = useState('');
  
  const { toast } = useToast();

  const fetchHalls = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('halls')
      .select('*')
      .eq('vendor_id', user.id);
    
    if (!error && data) {
      setHalls(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHalls();
  }, [user]);

  const handleSave = async () => {
    if (!currentHall.name || !currentHall.price_per_night || !currentHall.city) {
      toast({ title: 'خطأ', description: 'يرجى تعبئة الحقول الإجبارية', variant: 'destructive' });
      return;
    }

    const payload = {
      ...currentHall,
      vendor_id: user.id,
      capacity: Number(currentHall.capacity),
      price_per_night: Number(currentHall.price_per_night),
      images: currentHall.images || [],
      amenities: currentHall.amenities || []
    };

    let error;
    if (currentHall.id) {
       const { error: updateError } = await supabase.from('halls').update(payload).eq('id', currentHall.id);
       error = updateError;
    } else {
       const { error: insertError } = await supabase.from('halls').insert([payload]);
       error = insertError;
    }

    if (!error) {
      setIsEditing(false);
      setCurrentHall({ images: [], amenities: [] });
      fetchHalls();
      toast({ title: 'نجاح', description: 'تم حفظ بيانات القاعة بنجاح', variant: 'success' });
    } else {
      console.error(error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الحفظ', variant: 'destructive' });
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

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه القاعة؟')) {
      const { error } = await supabase.from('halls').delete().eq('id', id);
      if (!error) {
        fetchHalls();
        toast({ title: 'تم الحذف', description: 'تم حذف القاعة بنجاح', variant: 'success' });
      } else {
        toast({ title: 'خطأ', description: 'فشل حذف القاعة', variant: 'destructive' });
      }
    }
  };

  if (loading && !isEditing && halls.length === 0) return <div className="p-8 text-center animate-pulse">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">إدارة قاعاتي</h2>
        <Button onClick={() => { setCurrentHall({ images: [], amenities: [] }); setIsEditing(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> إضافة قاعة جديدة
        </Button>
      </div>

      {isEditing && (
        <div className="bg-card p-6 rounded-xl border animate-in fade-in slide-in-from-top-4 shadow-xl">
          <h3 className="font-bold text-xl mb-6">{currentHall.id ? 'تعديل بيانات القاعة' : 'إضافة قاعة جديدة'}</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <Input 
              label="اسم القاعة" 
              placeholder="مثال: قاعة السلطانة"
              value={currentHall.name || ''} 
              onChange={e => setCurrentHall({...currentHall, name: e.target.value})}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">المدينة</label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary outline-none"
                value={currentHall.city || ''}
                onChange={e => setCurrentHall({...currentHall, city: e.target.value})}
              >
                <option value="">اختر المدينة</option>
                {SAUDI_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
            <Input 
              label="السعة (عدد الأشخاص)" 
              type="number"
              value={currentHall.capacity || ''} 
              onChange={e => setCurrentHall({...currentHall, capacity: Number(e.target.value)})}
            />
            <Input 
              label="السعر لليلة (ر.س)" 
              type="number"
              value={currentHall.price_per_night || ''} 
              onChange={e => setCurrentHall({...currentHall, price_per_night: Number(e.target.value)})}
            />
            
            <div className="md:col-span-2 space-y-4">
               <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Image className="w-4 h-4" /> معرض الصور
                  </label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="أدخل رابط الصورة (URL)..." 
                      value={newImageUrl} 
                      onChange={e => setNewImageUrl(e.target.value)}
                    />
                    <Button type="button" variant="secondary" onClick={addImageToGallery}>إضافة</Button>
                  </div>
               </div>
               
               <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {(currentHall.images || []).map((img, idx) => (
                    <div key={idx} className="aspect-square relative group border rounded-lg overflow-hidden bg-muted">
                      <img src={img} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeImageFromGallery(idx)}
                        className="absolute top-1 left-1 bg-destructive text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(!currentHall.images || currentHall.images.length === 0) && (
                    <div className="col-span-full text-center py-4 text-xs text-muted-foreground border border-dashed rounded-lg">
                      لم يتم إضافة صور للمعرض بعد
                    </div>
                  )}
               </div>
            </div>

            <div className="md:col-span-2 space-y-2">
               <label className="text-sm font-medium">المرافق والخدمات</label>
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-4 border rounded-xl bg-muted/10">
                  {HALL_AMENITIES.map(amenity => (
                    <button
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${currentHall.amenities?.includes(amenity) ? 'bg-primary/10 text-primary border-primary' : 'bg-background hover:bg-muted border-transparent'} border`}
                    >
                      {currentHall.amenities?.includes(amenity) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      {amenity}
                    </button>
                  ))}
               </div>
            </div>

             <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">الوصف التفصيلي</label>
              <textarea 
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                placeholder="تحدث عن مميزات القاعة وتفاصيل الضيافة..."
                value={currentHall.description || ''} 
                onChange={e => setCurrentHall({...currentHall, description: e.target.value})}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-8 justify-end border-t pt-4">
            <Button variant="outline" onClick={() => setIsEditing(false)}>إلغاء</Button>
            <Button onClick={handleSave} className="px-8 shadow-lg shadow-primary/20">حفظ القاعة</Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {halls.map(hall => (
          <div key={hall.id} className="group relative rounded-2xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="aspect-[16/10] w-full overflow-hidden rounded-t-2xl bg-muted relative">
              {hall.image_url || (hall.images && hall.images[0]) ? (
                <img src={hall.image_url || hall.images[0]} alt={hall.name} className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-500" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                  <ImageOff className="h-8 w-8 mb-2 opacity-50" />
                  <span className="text-xs">لا توجد صورة</span>
                </div>
              )}
              <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm">
                <MapPin className="w-3 h-3 text-primary" />
                {hall.city}
              </div>
              <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                 <Image className="w-3 h-3" />
                 {hall.images?.length || 0} صور
              </div>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg leading-tight">{hall.name}</h3>
                <PriceTag amount={hall.price_per_night} className="text-primary" />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> 
                  {hall.capacity} شخص
                </span>
              </div>
              <p className="text-xs line-clamp-2 text-muted-foreground mb-4 h-8 italic">
                {hall.description || "لا يوجد وصف لهذه القاعة."}
              </p>
              
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-1.5 rounded-xl"
                  onClick={() => { setCurrentHall(hall); setIsEditing(true); }}
                >
                  <Edit className="w-3 h-3" /> تعديل
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="rounded-xl"
                  onClick={() => handleDelete(hall.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {halls.length === 0 && !isEditing && (
          <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed rounded-3xl bg-muted/5">
            <div className="flex flex-col items-center gap-3">
              <Plus className="w-10 h-10 opacity-20" />
              <p className="text-lg font-medium">لا توجد قاعات مضافة حالياً.</p>
              <Button variant="outline" size="sm" onClick={() => { setCurrentHall({ images: [], amenities: [] }); setIsEditing(true); }}>ابدأ بإضافة قاعتك الأولى!</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
