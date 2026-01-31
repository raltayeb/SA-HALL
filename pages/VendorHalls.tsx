import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Hall, SAUDI_CITIES } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatCurrency } from '../utils/currency';

interface VendorHallsProps {
  user: UserProfile;
}

export const VendorHalls: React.FC<VendorHallsProps> = ({ user }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentHall, setCurrentHall] = useState<Partial<Hall>>({});

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
      alert('يرجى تعبئة الحقول الإجبارية');
      return;
    }

    const payload = {
      ...currentHall,
      vendor_id: user.id,
      capacity: Number(currentHall.capacity),
      price_per_night: Number(currentHall.price_per_night)
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
      setCurrentHall({});
      fetchHalls();
    } else {
      alert('حدث خطأ أثناء الحفظ');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه القاعة؟')) {
      const { error } = await supabase.from('halls').delete().eq('id', id);
      if (!error) fetchHalls();
    }
  };

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">إدارة قاعاتي</h2>
        <Button onClick={() => { setCurrentHall({}); setIsEditing(true); }}>
          + إضافة قاعة جديدة
        </Button>
      </div>

      {isEditing && (
        <div className="bg-card p-6 rounded-xl border animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold mb-4">{currentHall.id ? 'تعديل قاعة' : 'إضافة قاعة جديدة'}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Input 
              label="اسم القاعة" 
              value={currentHall.name || ''} 
              onChange={e => setCurrentHall({...currentHall, name: e.target.value})}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">المدينة</label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
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
            <Input 
              label="رابط الصورة (URL)" 
              value={currentHall.image_url || ''} 
              onChange={e => setCurrentHall({...currentHall, image_url: e.target.value})}
              className="md:col-span-2"
            />
             <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">الوصف</label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={currentHall.description || ''} 
                onChange={e => setCurrentHall({...currentHall, description: e.target.value})}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <Button variant="outline" onClick={() => setIsEditing(false)}>إلغاء</Button>
            <Button onClick={handleSave}>حفظ البيانات</Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {halls.map(hall => (
          <div key={hall.id} className="group relative rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
            <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-muted relative">
              {hall.image_url ? (
                <img src={hall.image_url} alt={hall.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">لا توجد صورة</div>
              )}
              <div className="absolute top-2 right-2 bg-background/90 px-2 py-1 rounded text-xs font-medium">
                {hall.city}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-lg">{hall.name}</h3>
              <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                <span>👥 {hall.capacity} شخص</span>
                <span className="font-bold text-primary">{formatCurrency(hall.price_per_night)}</span>
              </div>
              <p className="mt-2 text-sm line-clamp-2 text-muted-foreground">{hall.description}</p>
              
              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => { setCurrentHall(hall); setIsEditing(true); }}
                >
                  تعديل
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDelete(hall.id)}
                >
                  حذف
                </Button>
              </div>
            </div>
          </div>
        ))}
        {halls.length === 0 && !isEditing && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            لا توجد قاعات مضافة. ابدأ بإضافة قاعتك الأولى!
          </div>
        )}
      </div>
    </div>
  );
};