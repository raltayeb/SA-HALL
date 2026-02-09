
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, VAT_RATE, HALL_AMENITIES, Booking, POSItem, HallAddon } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  MapPin, CheckCircle2, Loader2, Sparkles, 
  X, User, Phone, Share2, Heart, ArrowRight, Star,
  Calendar as CalendarIcon, ChevronLeft, ShieldCheck, Info, Check, Flame
} from 'lucide-react';
import { Calendar } from '../components/ui/Calendar';
import { useToast } from '../context/ToastContext';
import { format, isSameDay, isBefore, startOfDay, parse } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface HallDetailsProps {
  item: (Hall | Service) & { vendor?: UserProfile };
  type: 'hall' | 'service' | 'chalet';
  user: UserProfile | null;
  onBack: () => void;
}

export const HallDetails: React.FC<HallDetailsProps> = ({ item, type, user, onBack }) => {
  // --- State ---
  const [isBooking, setIsBooking] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [hallAddons, setHallAddons] = useState<HallAddon[]>([]);
  
  // Booking Form State
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [guestData, setGuestData] = useState({ name: user?.full_name || '', phone: user?.phone_number || '', email: user?.email || '' });
  
  const [selectedAddons, setSelectedAddons] = useState<HallAddon[]>([]);

  const { toast } = useToast();
  const isHall = type === 'hall' || type === 'chalet';
  const hall = isHall ? (item as Hall) : null;
  const service = !isHall ? (item as Service) : null;
  
  // --- Computed ---
  const allImages = useMemo(() => {
    const imgs = (item as any).images && (item as any).images.length > 0 
      ? (item as any).images : [(item as any).image_url].filter(Boolean);
    return imgs.length > 0 ? imgs : ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'];
  }, [item]);

  const subTotal = useMemo(() => {
    let sum = 0;
    if (isHall && hall?.price_per_night) {
      sum = Number(hall.price_per_night);
    } else if (!isHall && service?.price) {
      sum = Number(service.price);
    }
    // Add Hall Addons
    sum += selectedAddons.reduce((s, a) => s + Number(a.price), 0);
    return isNaN(sum) ? 0 : sum;
  }, [selectedAddons, isHall, hall, service]);

  const vat = subTotal * VAT_RATE;
  const total = subTotal + vat;

  // --- Effects ---
  const fetchData = useCallback(async () => {
    if (isHall) {
      // Fetch Booked Dates
      const { data: bookingsData } = await supabase.from('bookings').select('booking_date').eq('hall_id', item.id).neq('status', 'cancelled');
      if (bookingsData) {
          // Parse date strings safely
          const dates = bookingsData
            .map(b => {
                try {
                    return parse(b.booking_date, 'yyyy-MM-dd', new Date());
                } catch (e) {
                    return null;
                }
            })
            .filter((d): d is Date => d !== null);
          setBlockedDates(dates);
      }
      
      // Fetch Addons
      if ((item as Hall).addons) {
          setHallAddons((item as Hall).addons || []);
      }
    }
  }, [item.id, isHall, item]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Handlers ---
  const handleBookingSubmission = async () => {
    if (!bookingDate) {
        toast({ title: 'تنبيه', description: 'يرجى اختيار تاريخ الحجز من التقويم.', variant: 'destructive' });
        document.getElementById('availability-section')?.scrollIntoView({ behavior: 'smooth' });
        return;
    }
    if (!guestData.name || !guestData.phone) {
        toast({ title: 'تنبيه', description: 'يرجى إدخال اسمك ورقم الجوال.', variant: 'destructive' });
        return;
    }

    setIsBooking(true);
    try {
      const payload = {
        hall_id: isHall ? hall!.id : null,
        vendor_id: item.vendor_id,
        booking_date: format(bookingDate, 'yyyy-MM-dd'),
        total_amount: total,
        vat_amount: vat,
        guest_name: guestData.name,
        guest_phone: guestData.phone,
        items: selectedAddons.map(addon => ({
            name: addon.name,
            price: addon.price,
            qty: 1,
            type: 'addon'
        })),
        status: 'pending',
      };

      const { data, error } = await supabase.from('bookings').insert([payload]).select().single();
      if (error) throw error;
      
      setCompletedBooking(data as any);
      setShowInvoice(true);
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { 
      setIsBooking(false); 
    }
  };

  const toggleAddon = (addon: HallAddon) => {
      setSelectedAddons(prev => {
          const exists = prev.find(a => a.name === addon.name);
          if (exists) return prev.filter(a => a.name !== addon.name);
          return [...prev, addon];
      });
  };

  return (
    <div className="bg-[#F8F9FC] min-h-screen text-right font-tajawal pb-20" dir="rtl">
      
      {/* 1. Header Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 py-4 transition-all">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-primary font-bold transition-colors">
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                <ArrowRight className="w-5 h-5" />
            </div>
            <span className="hidden md:inline">العودة للقائمة</span>
          </button>
          
          <div className="flex gap-3">
            <Button variant="outline" size="icon" className="rounded-xl border-gray-200 hover:border-red-100 hover:text-red-500 hover:bg-red-50 shadow-sm bg-white"><Heart className="w-5 h-5" /></Button>
            <Button variant="outline" size="icon" className="rounded-xl border-gray-200 hover:text-primary hover:bg-primary/5 shadow-sm bg-white"><Share2 className="w-5 h-5" /></Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 2. Hero Images */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[400px] md:h-[500px] rounded-[3rem] overflow-hidden shadow-sm border border-gray-100 bg-white p-2">
            <div className="md:col-span-2 md:row-span-2 relative group cursor-pointer overflow-hidden rounded-[2.5rem]">
                <img src={allImages[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Main" />
            </div>
            <div className="hidden md:block relative group cursor-pointer overflow-hidden rounded-[2.5rem]">
                <img src={allImages[1] || allImages[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Side 1" />
            </div>
            <div className="hidden md:block relative group cursor-pointer overflow-hidden rounded-[2.5rem]">
                <img src={allImages[2] || allImages[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Side 2" />
            </div>
            <div className="hidden md:flex relative group cursor-pointer items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors rounded-[2.5rem]">
                <span className="font-black text-lg flex items-center gap-2">عرض الصور <ChevronLeft className="w-5 h-5" /></span>
            </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 relative">
            
            {/* LEFT COLUMN: Details (66%) */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* Title & Stats */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-2">{item.name}</h1>
                            <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                                <span className="flex items-center gap-1 text-primary bg-primary/5 px-2 py-1 rounded-lg"><MapPin className="w-4 h-4" /> {isHall ? hall?.city : 'خدمة شاملة'}</span>
                                <span className="flex items-center gap-1 text-yellow-500 bg-yellow-50 px-2 py-1 rounded-lg"><Star className="w-4 h-4 fill-current" /> 4.9 (12 تقييم)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 space-y-4">
                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <Info className="w-5 h-5 text-primary" /> نظرة عامة
                    </h3>
                    <p className="text-gray-600 leading-loose font-medium text-base">
                        {item.description || "استمتع بتجربة فريدة ومميزة مع خدماتنا المتكاملة."}
                    </p>
                </div>

                {/* Hall Services / Addons */}
                {isHall && hallAddons.length > 0 && (
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 space-y-6">
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" /> خدمات القاعة الإضافية
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {hallAddons.map((addon, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => toggleAddon(addon)}
                                    className={`cursor-pointer p-4 rounded-3xl border-2 transition-all flex items-center justify-between ${selectedAddons.find(a => a.name === addon.name) ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedAddons.find(a => a.name === addon.name) ? 'bg-primary border-primary text-white' : 'border-gray-300'}`}>
                                            {selectedAddons.find(a => a.name === addon.name) && <Check className="w-3 h-3" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{addon.name}</p>
                                            {addon.description && <p className="text-xs text-gray-400">{addon.description}</p>}
                                        </div>
                                    </div>
                                    <PriceTag amount={addon.price} className="text-sm font-black text-primary" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Availability Calendar */}
                <div id="availability-section" className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 space-y-6">
                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-primary" /> اختيار الموعد
                    </h3>
                    <p className="text-sm text-gray-500 font-bold">الحجز بنظام اليوم الكامل. الأيام المظللة غير متاحة.</p>
                    <div className="flex justify-center">
                        <Calendar 
                            mode="single"
                            selected={bookingDate}
                            onSelect={setBookingDate}
                            disabled={(date) => isBefore(date, startOfDay(new Date())) || blockedDates.some(d => isSameDay(d, date))}
                            className="w-full max-w-md bg-white rounded-2xl"
                            classNames={{
                                day_selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white rounded-xl shadow-lg shadow-primary/30",
                                day_today: "bg-gray-50 text-primary font-black border border-primary/20",
                                day: "h-12 w-12 p-0 font-bold aria-selected:opacity-100 hover:bg-gray-50 rounded-xl transition-all text-gray-900",
                                head_cell: "text-gray-400 rounded-md w-12 font-black text-[0.8rem] uppercase tracking-wider pb-4",
                            }}
                        />
                    </div>
                </div>

            </div>

            {/* RIGHT COLUMN: Sticky Sidebar Card (33%) */}
            <div className="relative">
                <div className="sticky top-24 space-y-6">
                    
                    {/* Main Booking Card */}
                    <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-purple-400"></div>
                        
                        {/* Price */}
                        <div className="flex justify-between items-end border-b border-gray-50 pb-6 mb-6">
                            <div>
                                <p className="text-xs font-bold text-gray-400 mb-1">الإجمالي التقريبي</p>
                                <div className="flex items-end gap-1">
                                    <PriceTag amount={total} className="text-4xl font-black text-primary" />
                                    <span className="text-xs font-bold text-gray-400 mb-1"> / شامل الضريبة</span>
                                </div>
                            </div>
                        </div>

                        {/* Social Proof with Fixed Icon */}
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-2xl text-xs font-black flex items-center gap-2 border border-red-100 mb-6 animate-pulse">
                           <Flame className="w-4 h-4" /> 18 شخص يتصفح هذه القاعة حالياً
                        </div>

                        {/* Guest Details */}
                        <div className="space-y-4 mb-6">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                                <p className="text-xs font-bold text-gray-400">سياسة الإلغاء</p>
                                <p className="text-sm font-black text-gray-800">مرنة (48 ساعة)</p>
                            </div>

                            <div className="space-y-3">
                                <Input 
                                    placeholder="الاسم الكامل" 
                                    className="h-12 bg-white border-gray-200 rounded-xl text-sm font-bold shadow-sm" 
                                    value={guestData.name}
                                    onChange={e => setGuestData({...guestData, name: e.target.value})}
                                />
                                <Input 
                                    placeholder="رقم الجوال (05...)" 
                                    className="h-12 bg-white border-gray-200 rounded-xl text-sm font-bold shadow-sm"
                                    value={guestData.phone}
                                    onChange={e => setGuestData({...guestData, phone: e.target.value})} 
                                />
                            </div>
                        </div>

                        {/* Total & Button */}
                        <div className="pt-2">
                            <Button onClick={handleBookingSubmission} disabled={isBooking} className="w-full h-14 rounded-2xl text-lg font-black bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95">
                                {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : 'إرسال طلب الحجز'}
                            </Button>
                            <p className="text-[10px] text-center text-gray-400 font-bold mt-3 flex items-center justify-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> عملية حجز آمنة
                            </p>
                        </div>
                    </div>

                    {/* Trust Badge */}
                    <div className="bg-gray-50 border border-gray-100 rounded-[2rem] p-6 text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
                            <ShieldCheck className="w-4 h-4" /> ضمان الجودة
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                            نضمن لك تجربة حجز سلسة وموثوقة.
                        </p>
                    </div>

                </div>
            </div>

        </div>
      </div>

      {showInvoice && completedBooking && <InvoiceModal isOpen={showInvoice} onClose={() => { setShowInvoice(false); onBack(); }} booking={completedBooking} />}
    </div>
  );
};
