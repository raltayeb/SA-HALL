
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, VAT_RATE, SAUDI_CITIES } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { ImageOff, MapPin, CheckCircle2, Search, SlidersHorizontal, Users, Building2, ChevronRight, ChevronLeft, Eye, X, Heart, Star, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { DatePickerWithRange } from '../components/ui/DatePickerWithRange';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';

interface BrowseHallsProps {
  user: UserProfile;
}

export const BrowseHalls: React.FC<BrowseHallsProps> = ({ user }) => {
  const [halls, setHalls] = useState<(Hall & { vendor?: { full_name: string, email: string } })[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingHall, setBookingHall] = useState<Hall | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  
  const [selectedHallDetails, setSelectedHallDetails] = useState<(Hall & { vendor?: any }) | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [similarHalls, setSimilarHalls] = useState<Hall[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(30000);
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
    fetchFavorites();
  }, []);

  const fetchHalls = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('halls')
      .select('*, vendor:vendor_id(full_name, email)')
      .eq('is_active', true);
    
    if (!error && data) setHalls(data as any);
    setLoading(false);
  };

  const fetchFavorites = async () => {
    const { data } = await supabase.from('user_favorites').select('hall_id').eq('user_id', user.id);
    if (data) setFavorites(data.map(f => f.hall_id));
  };

  const fetchBookings = async () => {
    const { data } = await supabase.from('bookings').select('hall_id, booking_date, status');
    if (data) setBookings(data);
  };

  const toggleFavorite = async (e: React.MouseEvent, hallId: string) => {
    e.stopPropagation();
    const isFav = favorites.includes(hallId);
    if (isFav) {
      await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('hall_id', hallId);
      setFavorites(prev => prev.filter(id => id !== hallId));
    } else {
      await supabase.from('user_favorites').insert([{ user_id: user.id, hall_id: hallId }]);
      setFavorites(prev => [...prev, hallId]);
      toast({ title: 'تمت الإضافة', description: 'تمت إضافة القاعة إلى مفضلاتك.', variant: 'success' });
    }
  };

  const openDetails = (hall: any) => {
    setSelectedHallDetails(hall);
    setGalleryIndex(0);
    const similar = halls.filter(h => 
      h.id !== hall.id && (h.city === hall.city || Math.abs(h.price_per_night - hall.price_per_night) < 5000)
    ).slice(0, 3);
    setSimilarHalls(similar);
  };

  const handleBook = async () => {
    if (!bookingHall || !bookingDate) return;
    const baseAmount = bookingHall.price_per_night;
    const vatAmount = baseAmount * VAT_RATE;
    const totalAmount = baseAmount + vatAmount;

    const { error } = await supabase.from('bookings').insert([{
      hall_id: bookingHall.id, user_id: user.id, vendor_id: bookingHall.vendor_id,
      booking_date: bookingDate, total_amount: totalAmount, vat_amount: vatAmount, status: 'pending'
    }]);

    if (!error) {
      toast({ title: 'تم إرسال الطلب', description: 'تم إرسال طلب الحجز بنجاح!', variant: 'success' });
      setBookingHall(null); fetchBookings(); 
    } else {
      toast({ title: 'فشل الحجز', description: 'حدث خطأ أثناء محاولة الحجز.', variant: 'destructive' });
    }
  };

  const filteredHalls = halls.filter(hall => {
    const matchesSearch = hall.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = selectedCity === '' || hall.city === selectedCity;
    const matchesPrice = hall.price_per_night <= maxPrice;
    const matchesCapacity = hall.capacity >= minCapacity && hall.capacity <= maxCapacity;
    return matchesSearch && matchesCity && matchesPrice && matchesCapacity;
  });

  if (loading) return <div className="p-12 text-center text-primary animate-pulse">جاري تحميل القاعات المتاحة...</div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-primary">استكشف القاعات الفاخرة</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">خطوة واحدة تفصلك عن ليلة العمر المثالية.</p>
        </div>
        <div className="text-xs font-bold text-muted-foreground bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
          {filteredHalls.length} قاعة بانتظارك
        </div>
      </div>

      <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">البحث السريع</label>
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="اسم القاعة..." className="w-full h-10 bg-background border rounded-xl pr-9 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">المدينة</label>
            <select className="w-full h-10 bg-background border rounded-xl px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
              <option value="">جميع المدن</option>
              {SAUDI_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
            </select>
          </div>
          <DatePickerWithRange label="تاريخ المناسبة" date={dateRange} setDate={setDateRange} />
          <div className="space-y-2">
             <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-5">
              <span>السعر الأقصى</span>
              <PriceTag amount={maxPrice} className="text-primary" />
            </div>
            <div className="pt-2">
              <input type="range" min="500" max="30000" step="500" className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} />
            </div>
          </div>
        </div>
      </div>

      {/* Hall Details Modal */}
      {selectedHallDetails && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="bg-card w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl relative animate-in zoom-in-95 border border-white/10">
            <button onClick={() => setSelectedHallDetails(null)} className="absolute top-6 left-6 z-10 bg-black/40 hover:bg-black/60 text-white p-2.5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="relative aspect-square lg:aspect-auto bg-black flex items-center justify-center">
                {selectedHallDetails.images && selectedHallDetails.images.length > 0 ? (
                  <img src={selectedHallDetails.images[galleryIndex]} className="w-full h-full object-cover animate-in fade-in duration-500" alt={selectedHallDetails.name} />
                ) : (
                  <ImageOff className="w-20 h-20 text-white opacity-20" />
                )}
              </div>
              <div className="p-8 lg:p-12 space-y-8">
                <div className="space-y-3">
                   <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
                   </div>
                   <h2 className="text-4xl font-black text-primary leading-none">{selectedHallDetails.name}</h2>
                   <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" />{selectedHallDetails.city}</span>
                      <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-primary" />بواسطة: {selectedHallDetails.vendor?.full_name}</span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/40 p-5 rounded-2xl border border-border/50">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">السعة</p>
                    <p className="text-xl font-black flex items-center gap-2"><Users className="w-5 h-5 text-primary" />{selectedHallDetails.capacity} شخص</p>
                  </div>
                  <div className="bg-muted/40 p-5 rounded-2xl border border-border/50">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">السعر</p>
                    <PriceTag amount={selectedHallDetails.price_per_night} className="text-2xl" iconSize={24} />
                  </div>
                </div>

                {selectedHallDetails.amenities && selectedHallDetails.amenities.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">المرافق والمميزات</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedHallDetails.amenities.map(a => (
                        <span key={a} className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />{a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t flex gap-4">
                   <Button className="flex-1 h-14 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20" onClick={() => { setBookingHall(selectedHallDetails); setSelectedHallDetails(null); }}>احجز الآن</Button>
                   <Button variant="outline" className="h-14 w-14 rounded-2xl" onClick={(e) => toggleFavorite(e, selectedHallDetails.id)}>
                      <Heart className={`w-6 h-6 ${favorites.includes(selectedHallDetails.id) ? 'fill-destructive text-destructive' : ''}`} />
                   </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {filteredHalls.map(hall => (
          <div key={hall.id} className="group overflow-hidden rounded-[2.5rem] border bg-card shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col relative">
             <button onClick={(e) => toggleFavorite(e, hall.id)} className="absolute top-5 left-5 z-20 bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform">
                <Heart className={`w-5 h-5 ${favorites.includes(hall.id) ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
             </button>
             <div className="aspect-[1.2/1] w-full bg-muted relative overflow-hidden cursor-pointer" onClick={() => openDetails(hall)}>
              {hall.image_url || (hall.images && hall.images[0]) ? (
                <img src={hall.image_url || hall.images[0]} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground opacity-20"><ImageOff className="h-12 w-12" /></div>
              )}
              <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-xl text-white px-4 py-2 rounded-2xl text-[11px] font-black border border-white/20">
                {hall.city}
              </div>
             </div>
             <div className="p-8 flex-1 flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-2xl group-hover:text-primary transition-colors cursor-pointer" onClick={() => openDetails(hall)}>{hall.name}</h3>
                  <div className="text-left"><PriceTag amount={hall.price_per_night} className="text-primary text-2xl" /></div>
                </div>
                <p className="text-sm text-muted-foreground font-medium line-clamp-2 italic leading-relaxed">{hall.description || "استمتع بمناسبة لا تُنسى في أرقى القاعات السعودية المصممة خصيصاً لتناسب تطلعاتكم."}</p>
                <div className="flex gap-2 pt-4">
                   <Button variant="outline" className="flex-1 rounded-2xl h-12 text-sm font-bold" onClick={() => openDetails(hall)}>التفاصيل</Button>
                   <Button className="flex-[2] rounded-2xl h-12 text-base font-bold shadow-lg shadow-primary/10" onClick={() => setBookingHall(hall)}>احجز موعدك</Button>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
