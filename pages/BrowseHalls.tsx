
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, VAT_RATE, SAUDI_CITIES } from '../types';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../utils/currency';
import { ImageOff, MapPin, CheckCircle2, Search, SlidersHorizontal, Users, Building2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { DatePickerWithRange } from '../components/ui/DatePickerWithRange';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';

interface BrowseHallsProps {
  user: UserProfile;
}

export const BrowseHalls: React.FC<BrowseHallsProps> = ({ user }) => {
  const [halls, setHalls] = useState<(Hall & { vendor?: { full_name: string, email: string } })[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingHall, setBookingHall] = useState<Hall | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(20000);
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [maxCapacity, setMaxCapacity] = useState<number>(5000);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchHalls();
    fetchBookings();
  }, []);

  const fetchHalls = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('halls')
      .select('*, vendor:vendor_id(full_name, email)')
      .eq('is_active', true);
    
    if (!error && data) {
      setHalls(data as any);
    }
    setLoading(false);
  };

  const fetchBookings = async () => {
    const { data } = await supabase.from('bookings').select('hall_id, booking_date, status');
    if (data) setBookings(data);
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
      fetchBookings(); // Refresh local booking state
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

    // Filter by availability in range (simplified)
    const isAvailableInRange = !bookings.some(b => {
      if (b.hall_id !== hall.id || b.status === 'cancelled') return false;
      const bDate = new Date(b.booking_date);
      if (!dateRange?.from || !dateRange?.to) return false;
      return bDate >= dateRange.from && bDate <= dateRange.to;
    });

    return matchesSearch && matchesCity && matchesPrice && matchesCapacity && isAvailableInRange;
  });

  if (loading) return <div className="p-12 text-center text-primary animate-pulse">جاري تحميل القاعات المتاحة...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">استكشف القاعات الفاخرة</h2>
          <p className="text-sm text-muted-foreground mt-1">ابحث عن المكان المثالي لليلة العمر.</p>
        </div>
        <div className="text-sm text-muted-foreground bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
          تم العثور على {filteredHalls.length} قاعة متاحة
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">البحث السريع</label>
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="اسم القاعة أو تفاصيل..." 
                className="w-full h-10 bg-background border rounded-lg pr-9 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">المدينة</label>
            <select 
              className="w-full h-10 bg-background border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none appearance-none"
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
            >
              <option value="">جميع المدن</option>
              {SAUDI_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
            </select>
          </div>

          <DatePickerWithRange 
            label="تاريخ المناسبة المتوقع"
            date={dateRange}
            setDate={setDateRange}
          />

          <div className="space-y-2">
             <div className="flex justify-between text-sm font-medium">
              <span>السعر الأقصى</span>
              <span className="text-primary">{formatCurrency(maxPrice)}</span>
            </div>
            <div className="pt-2">
              <input 
                type="range" 
                min="500" 
                max="30000" 
                step="500"
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
          <div className="flex items-center gap-4 w-full sm:w-auto">
             <div className="space-y-1 flex-1 sm:w-32">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">السعة الدنيا</label>
              <input 
                type="number" 
                className="w-full h-9 bg-background border rounded-lg px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                value={minCapacity}
                onChange={e => setMinCapacity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1 flex-1 sm:w-32">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">السعة القصوى</label>
              <input 
                type="number" 
                className="w-full h-9 bg-background border rounded-lg px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                value={maxCapacity}
                onChange={e => setMaxCapacity(Number(e.target.value))}
              />
            </div>
          </div>
          
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary" onClick={() => { setSearchTerm(''); setSelectedCity(''); setMaxPrice(20000); setMinCapacity(0); setMaxCapacity(5000); setDateRange(undefined); }}>
            <SlidersHorizontal className="w-4 h-4" /> إعادة ضبط كافة الفلاتر
          </Button>
        </div>
      </div>

      {bookingHall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border animate-in zoom-in-95">
            <h3 className="font-bold text-xl flex items-center gap-2 text-primary">
              <CheckCircle2 className="w-6 h-6" />
              تأكيد حجز {bookingHall.name}
            </h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">اختر تاريخ المناسبة</label>
              <input 
                type="date" 
                className="w-full rounded-lg border border-input bg-background px-3 h-10 text-foreground focus:ring-1 focus:ring-primary outline-none"
                value={bookingDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setBookingDate(e.target.value)}
              />
            </div>
            
            <div className="bg-muted/30 p-4 rounded-xl text-sm space-y-3 border">
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

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" className="rounded-xl px-6" onClick={() => setBookingHall(null)}>إلغاء</Button>
              <Button onClick={handleBook} disabled={!bookingDate} className="rounded-xl px-8 shadow-lg shadow-primary/20">إرسال طلب الحجز</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {filteredHalls.map(hall => (
          <div key={hall.id} className="group overflow-hidden rounded-3xl border bg-card shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col">
             <div className="aspect-[16/10] w-full bg-muted relative overflow-hidden">
              {hall.image_url ? (
                <img src={hall.image_url} alt={hall.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                  <ImageOff className="h-10 w-10 mb-2 opacity-20" />
                  <span className="text-xs">لا توجد صورة متوفرة</span>
                </div>
              )}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-foreground px-3 py-1.5 rounded-2xl text-[11px] font-bold flex items-center gap-1.5 shadow-sm border border-border">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {hall.city}
              </div>
              <div className="absolute bottom-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-[10px] font-bold shadow-lg">
                 جديد
              </div>
             </div>
             <div className="p-6 flex-1 flex flex-col">
               <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl leading-tight group-hover:text-primary transition-colors mb-1">{hall.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5" />
                      بواسطة: {hall.vendor?.full_name || 'بائع مجهول'}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="block font-black text-primary text-xl leading-none">{formatCurrency(hall.price_per_night)}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">لكل ليلة</span>
                  </div>
               </div>
               
               <div className="flex items-center gap-4 text-xs text-muted-foreground border-y py-3 mb-4">
                 <div className="flex items-center gap-1.5 font-medium">
                   <Users className="w-3.5 h-3.5 text-primary" />
                   يتسع لـ {hall.capacity} شخص
                 </div>
               </div>

               <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1 italic mb-6">
                 {hall.description || "استمتع بمناسبة لا تُنسى في أرقى القاعات السعودية المصممة خصيصاً لتناسب تطلعاتكم."}
               </p>

               <Button 
                className="w-full rounded-2xl h-11 text-base font-bold shadow-lg shadow-primary/10 group-hover:shadow-primary/30 group-hover:bg-primary/95 transition-all" 
                onClick={() => setBookingHall(hall)}
              >
                 احجز الآن
               </Button>
             </div>
          </div>
        ))}
        {filteredHalls.length === 0 && (
          <div className="col-span-full py-32 text-center border-2 border-dashed rounded-3xl bg-muted/5">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-muted p-4 rounded-full">
                <Search className="w-10 h-10 text-muted-foreground opacity-30" />
              </div>
              <p className="text-xl font-bold text-muted-foreground">عذراً، لم نجد قاعات متاحة بهذا التاريخ أو الفلاتر المختارة.</p>
              <p className="text-sm text-muted-foreground -mt-2">جرب تغيير النطاق الزمني أو تقليل حدود السعر.</p>
              <Button variant="outline" className="rounded-xl mt-2" onClick={() => { setSearchTerm(''); setSelectedCity(''); setMaxPrice(20000); setMinCapacity(0); setMaxCapacity(5000); setDateRange(undefined); }}>تصفح كافة القاعات</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
