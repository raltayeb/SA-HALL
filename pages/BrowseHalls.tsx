
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, VAT_RATE, SAUDI_CITIES } from '../types';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../utils/currency';
import { ImageOff, MapPin, CheckCircle2, Search, SlidersHorizontal, Users, Building2, User } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface BrowseHallsProps {
  user: UserProfile;
}

export const BrowseHalls: React.FC<BrowseHallsProps> = ({ user }) => {
  const [halls, setHalls] = useState<(Hall & { vendor?: { full_name: string, email: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingHall, setBookingHall] = useState<Hall | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(20000);
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [maxCapacity, setMaxCapacity] = useState<number>(5000);

  const { toast } = useToast();

  useEffect(() => {
    fetchHalls();
  }, []);

  const fetchHalls = async () => {
    setLoading(true);
    // Fetch halls with vendor info
    const { data, error } = await supabase
      .from('halls')
      .select('*, vendor:vendor_id(full_name, email)')
      .eq('is_active', true);
    
    if (!error && data) {
      setHalls(data as any);
    }
    setLoading(false);
  };

  const handleBook = async () => {
    if (!bookingHall || !bookingDate) return;

    const baseAmount = bookingHall.price_per_night;
    const vatAmount = baseAmount * VAT_RATE;
    const totalAmount = baseAmount + vatAmount;

    const { error } = await supabase.from('bookings').insert([{
      hall_id: bookingHall.id,
      user_id: user.id,
      vendor_id: bookingHall.vendor_id,
      booking_date: bookingDate,
      total_amount: totalAmount,
      vat_amount: vatAmount,
      status: 'pending'
    }]);

    if (!error) {
      toast({ 
        title: 'تم إرسال الطلب', 
        description: 'تم إرسال طلب الحجز بنجاح! تم إخطار صاحب القاعة عبر البريد الإلكتروني.', 
        variant: 'success' 
      });
      setBookingHall(null);
      setBookingDate('');
    } else {
      toast({ 
        title: 'فشل الحجز', 
        description: 'حدث خطأ أثناء محاولة الحجز. يرجى المحاولة مرة أخرى.', 
        variant: 'destructive' 
      });
    }
  };

  const filteredHalls = halls.filter(hall => {
    const matchesSearch = hall.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          hall.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = selectedCity === '' || hall.city === selectedCity;
    const matchesPrice = hall.price_per_night <= maxPrice;
    const matchesCapacity = hall.capacity >= minCapacity && hall.capacity <= maxCapacity;
    return matchesSearch && matchesCity && matchesPrice && matchesCapacity;
  });

  if (loading) return <div className="p-12 text-center text-primary animate-pulse">جاري تحميل القاعات المتاحة...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">تصفح القاعات المتاحة</h2>
        <div className="text-sm text-muted-foreground bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
          تم العثور على {filteredHalls.length} قاعة
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="ابحث باسم القاعة..." 
              className="w-full bg-background border rounded-lg pr-9 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            className="bg-background border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
          >
            <option value="">جميع المدن</option>
            {SAUDI_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
          </select>

          <div className="flex flex-col justify-center gap-1">
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <span>السعر الأقصى</span>
              <span>{formatCurrency(maxPrice)}</span>
            </div>
            <input 
              type="range" 
              min="500" 
              max="20000" 
              step="500"
              className="w-full accent-primary cursor-pointer"
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">السعة (من)</label>
              <input 
                type="number" 
                className="w-full bg-background border rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                value={minCapacity}
                onChange={e => setMinCapacity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">السعة (إلى)</label>
              <input 
                type="number" 
                className="w-full bg-background border rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                value={maxCapacity}
                onChange={e => setMaxCapacity(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-2 border-t mt-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => { setSearchTerm(''); setSelectedCity(''); setMaxPrice(20000); setMinCapacity(0); setMaxCapacity(5000); }}>
            <SlidersHorizontal className="w-4 h-4" /> إعادة تعيين الفلاتر
          </Button>
        </div>
      </div>

      {bookingHall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-xl p-6 space-y-4 shadow-2xl border animate-in zoom-in-95">
            <h3 className="font-bold text-xl flex items-center gap-2 text-primary">
              <CheckCircle2 className="w-6 h-6" />
              تأكيد حجز {bookingHall.name}
            </h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">اختر تاريخ المناسبة</label>
              <input 
                type="date" 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none"
                value={bookingDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setBookingDate(e.target.value)}
              />
            </div>
            
            <div className="bg-muted/50 p-4 rounded-xl text-sm space-y-3 border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">سعر الليلة</span>
                <span className="font-medium">{formatCurrency(bookingHall.price_per_night)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>ضريبة القيمة المضافة (15%)</span>
                <span>{formatCurrency(bookingHall.price_per_night * VAT_RATE)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-primary pt-3 border-t">
                <span>الإجمالي شامل الضريبة</span>
                <span>{formatCurrency(bookingHall.price_per_night * (1 + VAT_RATE))}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => setBookingHall(null)}>إلغاء</Button>
              <Button onClick={handleBook} disabled={!bookingDate} className="px-8">إتمام الطلب</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredHalls.map(hall => (
          <div key={hall.id} className="group overflow-hidden rounded-2xl border bg-card shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
             <div className="aspect-[4/3] w-full bg-muted relative overflow-hidden">
              {hall.image_url ? (
                <img src={hall.image_url} alt={hall.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                  <ImageOff className="h-10 w-10 mb-2 opacity-20" />
                  <span className="text-xs">لا توجد صورة متوفرة</span>
                </div>
              )}
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border border-white/20">
                <MapPin className="w-3 h-3 text-primary" />
                {hall.city}
              </div>
             </div>
             <div className="p-5 flex-1 flex flex-col">
               <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{hall.name}</h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      بواسطة: {hall.vendor?.full_name || 'بائع مجهول'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block font-black text-primary text-lg">{formatCurrency(hall.price_per_night)}</span>
                    <span className="text-[10px] text-muted-foreground">لليلة الواحدة</span>
                  </div>
               </div>
               
               <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                 <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded">
                   <Users className="w-3 h-3" />
                   {hall.capacity} شخص
                 </div>
               </div>

               <p className="mt-4 text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1 italic">
                 {hall.description || "لا يوجد وصف لهذه القاعة حالياً."}
               </p>

               <Button 
                className="w-full mt-5 rounded-xl shadow-sm group-hover:shadow-primary/20" 
                onClick={() => setBookingHall(hall)}
              >
                 احجز الآن
               </Button>
             </div>
          </div>
        ))}
        {filteredHalls.length === 0 && (
          <div className="col-span-full py-24 text-center border-2 border-dashed rounded-2xl bg-muted/5">
            <div className="flex flex-col items-center gap-3">
              <Search className="w-12 h-12 text-muted-foreground opacity-20" />
              <p className="text-lg font-medium text-muted-foreground">لم نجد أي قاعات تطابق بحثك.</p>
              <Button variant="outline" onClick={() => { setSearchTerm(''); setSelectedCity(''); setMaxPrice(20000); setMinCapacity(0); setMaxCapacity(5000); }}>تصفح كافة القاعات</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
