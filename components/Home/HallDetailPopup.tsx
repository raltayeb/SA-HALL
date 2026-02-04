
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Hall, UserProfile, Service, VAT_RATE, HALL_AMENITIES } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PriceTag } from '../ui/PriceTag';
import { Badge } from '../ui/Badge';
import { Calendar } from '../ui/Calendar'; 
import { 
  X, MapPin, Users, Star, Share2, 
  Calendar as CalendarIcon, CheckCircle2, 
  Loader2, Sparkles, Check, ChevronRight, ChevronLeft,
  ShieldCheck, Zap, Diamond, Clock, CreditCard
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { format, parseISO, startOfDay } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface HallDetailPopupProps {
  item: (Hall | Service) & { vendor?: UserProfile };
  type: 'hall' | 'service';
  user: UserProfile | null;
  onClose: () => void;
}

export const HallDetailPopup: React.FC<HallDetailPopupProps> = ({ item, type, user, onClose }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [vendorServices, setVendorServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  // Booking State
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  
  // Guest Info
  const [guestName, setGuestName] = useState(user?.full_name || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone_number || '');
  
  // Time Selection
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('23:00');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'pay_later' | 'credit_card'>('pay_later');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');

  const [isBooking, setIsBooking] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const { toast } = useToast();
  const isHall = type === 'hall';
  const hall = isHall ? (item as Hall) : null;
  const service = !isHall ? (item as Service) : null;
  
  const allImages = (item as any).images && (item as any).images.length > 0 
    ? (item as any).images 
    : [(item as any).image_url].filter(Boolean);

  const fetchDetails = useCallback(async () => {
    if (isHall) {
      // 1. Services
      const { data: servicesData } = await supabase.from('services').select('*').eq('vendor_id', item.vendor_id).eq('is_active', true);
      setVendorServices(servicesData || []);
      
      // 2. Blocked Dates (Confirmed Bookings)
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('booking_date')
        .eq('hall_id', item.id)
        .neq('status', 'cancelled');
        
      if (bookingsData) {
        const dates = bookingsData.map(b => parseISO(b.booking_date));
        setBlockedDates(dates);
      }
    }
  }, [item.id, item.vendor_id, isHall]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const calculateTotal = () => {
    const basePrice = isHall ? Number(hall!.price_per_night) : Number(service!.price);
    const addonsPrice = vendorServices
      .filter(s => selectedServices.includes(s.id))
      .reduce((sum, sumS) => sum + Number(sumS.price), 0);
    const subtotal = basePrice + addonsPrice;
    const vat = subtotal * VAT_RATE;
    return { subtotal, vat, total: subtotal + vat };
  };

  const handleBookingClick = () => {
    setIsBookingModalOpen(true);
  };

  const handleBookingSubmission = async () => {
    if (!guestName || !guestPhone) {
      toast({ title: 'تنبيه', description: 'يرجى إدخال اسمك ورقم الجوال.', variant: 'destructive' });
      return;
    }
    if (!bookingDate) {
      toast({ title: 'تنبيه', description: 'يرجى اختيار تاريخ المناسبة.', variant: 'destructive' });
      return;
    }
    
    // Check time logic
    if (startTime >= endTime) {
        toast({ title: 'خطأ في الوقت', description: 'وقت الخروج يجب أن يكون بعد وقت الدخول.', variant: 'destructive' });
        return;
    }

    if (paymentMethod === 'credit_card' && (!cardNumber || !cardExpiry || !cardCVC)) {
        toast({ title: 'بيانات الدفع', description: 'يرجى إدخال بيانات البطاقة لإتمام الدفع.', variant: 'destructive' });
        return;
    }

    setIsBooking(true);
    const { total, vat } = calculateTotal();
    const dateStr = format(bookingDate, 'yyyy-MM-dd');

    try {
      const isPaid = paymentMethod === 'credit_card';
      const paymentStatus = isPaid ? 'paid' : 'unpaid';
      const paidAmount = isPaid ? total : 0;

      const { error: bookingError } = await supabase.from('bookings').insert([{
        hall_id: isHall ? hall!.id : null,
        service_id: !isHall ? service!.id : null,
        user_id: user?.id || null, 
        vendor_id: item.vendor_id,
        booking_date: dateStr,
        start_time: startTime,
        end_time: endTime,
        total_amount: total,
        paid_amount: paidAmount,
        vat_amount: vat,
        payment_status: paymentStatus,
        status: isPaid ? 'confirmed' : 'pending',
        notes: `الاسم: ${guestName} | الجوال: ${guestPhone} ${!user ? '(حجز زائر)' : ''} | الدفع: ${isPaid ? 'بطاقة ائتمان' : 'لاحقاً'}`
      }]);

      if (bookingError) throw bookingError;

      // Create Notification
      await supabase.from('notifications').insert([{
        user_id: item.vendor_id,
        title: isPaid ? 'حجز جديد مدفوع 💰' : 'طلب حجز جديد 📅',
        message: `طلب حجز لـ ${item.name} بتاريخ ${dateStr}`,
        type: 'booking_new',
        link: 'hall_bookings'
      }]);

      toast({ 
        title: isPaid ? 'تم الحجز والدفع بنجاح' : 'تم إرسال طلبك بنجاح', 
        description: isPaid ? 'تم تأكيد حجزك وإرسال التفاصيل.' : 'سيقوم فريق القاعة بالتواصل معك قريباً لتأكيد التفاصيل.', 
        variant: 'success' 
      });
      setIsBookingModalOpen(false);
      onClose();
    } catch (err: any) {
      console.error('Booking Error:', err);
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setIsBooking(false);
    }
  };

  const { total, vat } = calculateTotal();

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col overflow-hidden animate-in fade-in duration-700 font-sans text-foreground">
      {/* Header */}
      <header className="px-6 h-20 flex justify-between items-center shrink-0 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
         <div className="flex items-center gap-6">
            <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
               <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
               <img src="/logo.png" alt="SA Hall" className="h-10 w-auto object-contain" />
            </div>
         </div>
         <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="rounded-2xl w-12 h-12 border-gray-100"><Share2 className="w-5 h-5 text-muted-foreground" /></Button>
            <Button type="button" onClick={handleBookingClick} className="rounded-2xl px-10 h-12 font-bold shadow-xl shadow-primary/20 text-lg">احجز الآن</Button>
         </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Images */}
        <section className="px-6 lg:px-20 pt-10">
            <div className="max-w-7xl mx-auto">
               <div className="relative aspect-[21/9] rounded-[3rem] overflow-hidden bg-gray-100 shadow-2xl group border border-gray-100">
                  <img src={allImages[activeImage]} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Hero View" />
                  <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-all duration-500">
                     <button onClick={() => setActiveImage(prev => (prev + 1) % allImages.length)} className="w-14 h-14 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white shadow-xl"><ChevronLeft className="w-7 h-7" /></button>
                     <button onClick={() => setActiveImage(prev => (prev - 1 + allImages.length) % allImages.length)} className="w-14 h-14 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white shadow-xl"><ChevronRight className="w-7 h-7" /></button>
                  </div>
               </div>
            </div>
        </section>

        <div className="max-w-7xl mx-auto px-6 lg:px-20 py-16">
          <div className="grid lg:grid-cols-12 gap-16">
            <div className="lg:col-span-7 space-y-12 text-start">
               <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="bg-primary/5 text-primary px-5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-primary/10 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> قاعة ملكية</span>
                  <div className="flex items-center gap-2 text-primary bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10"><Star className="w-4 h-4 fill-current" /><span className="text-[10px] font-bold tracking-widest uppercase">4.9 تقييم</span></div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{item.name}</h1>
                <div className="flex flex-wrap items-center gap-8 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary/60" /> {isHall ? hall?.city : item.vendor?.business_name}</span>
                  {isHall && <span className="flex items-center gap-2"><Users className="w-4 h-4 text-primary/60" /> {hall?.capacity} ضيف</span>}
                </div>
              </div>

              <div className="space-y-10 text-right">
                <div>
                  <h3 className="text-lg font-bold mb-4 text-gray-900">وصف المكان</h3>
                  <p className="text-base text-gray-500 leading-relaxed font-medium">{item.description || "نقدم لكم تجربة استثنائية في عالم المناسبات الفاخرة."}</p>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-4 text-gray-900">المميزات والمرافق</h3>
                  <div className="flex flex-wrap gap-3">
                    {(isHall ? (hall?.amenities?.length ? hall.amenities : HALL_AMENITIES) : ['جودة عالية', 'فريق محترف']).map((amenity, i) => (
                      <Badge key={i} variant="default" className="px-4 py-2 rounded-xl text-[11px] font-bold bg-primary/5 border-primary/10 text-primary">{amenity}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
               <div className="sticky top-32 space-y-8">
                  <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl space-y-6 ring-1 ring-black/5">
                     <div className="space-y-6 text-right">
                        <div className="flex justify-between items-center border-b border-gray-50 pb-6 flex-row-reverse">
                           <div className="space-y-1">
                              <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">إجمالي الحجز</h5>
                              <PriceTag amount={total} className="text-3xl text-gray-900 justify-end" />
                           </div>
                           <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase flex items-center gap-2 border border-emerald-100">
                              <CheckCircle2 className="w-3 h-3" /> متاح للحجز
                           </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between text-xs font-bold text-gray-500">
                           {bookingDate ? (
                             <span>{format(bookingDate, 'EEEE, d MMMM yyyy', { locale: arSA })}</span>
                           ) : (
                             <span>لم يتم تحديد تاريخ</span>
                           )}
                           <CalendarIcon className="w-4 h-4 text-primary" />
                        </div>
                     </div>
                     
                     <div className="space-y-4">
                        <Button 
                          type="button"
                          onClick={handleBookingClick} 
                          className="w-full h-16 rounded-2xl font-bold text-xl transition-all shadow-2xl shadow-primary/20 hover:scale-[1.02]"
                        >
                          إكمال الحجز <Zap className="w-5 h-5 ms-3 fill-current" />
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Wizard Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in overflow-y-auto">
           <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl relative border border-gray-100 flex flex-col animate-in zoom-in-95 my-10 max-h-[90vh]">
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                 <button onClick={() => setIsBookingModalOpen(false)} className="p-2 hover:bg-gray-50 rounded-full transition-all text-gray-400"><X className="w-5 h-5" /></button>
                 <h2 className="text-lg font-black text-gray-900">تأكيد الحجز</h2>
              </div>
              
              <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                 {/* Step 1: Calendar */}
                 <div className="space-y-4">
                    <h3 className="text-sm font-black text-gray-900 flex items-center justify-end gap-2">
                       <CalendarIcon className="w-4 h-4 text-primary" /> اختر تاريخ المناسبة
                    </h3>
                    <div className="flex justify-center bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
                       <Calendar
                          mode="single"
                          selected={bookingDate}
                          onSelect={setBookingDate}
                          disabled={[
                             { before: startOfDay(new Date()) },
                             ...blockedDates 
                          ]}
                          className="w-full"
                          classNames={{
                             // Green for available, dark gray for disabled
                             day: "h-10 w-10 p-0 font-bold text-sm rounded-xl transition-all flex items-center justify-center bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 mx-auto", 
                             day_selected: "!bg-[#4B0082] !text-white shadow-xl hover:!bg-[#3a0063]",
                             day_disabled: "!bg-gray-200 !text-gray-400 opacity-100 cursor-not-allowed hover:!bg-gray-200 decoration-0",
                             day_today: "border-2 border-emerald-500",
                             head_cell: "text-gray-400 font-bold text-[0.8rem] w-10 pb-2",
                             caption_label: "text-base font-black text-gray-900"
                          }}
                       />
                    </div>
                    {bookingDate && (
                        <div className="text-center text-xs font-bold text-primary bg-primary/5 py-2 rounded-lg">
                            تم اختيار: {format(bookingDate, 'EEEE, d MMMM yyyy', { locale: arSA })}
                        </div>
                    )}
                 </div>

                 {/* Step 2: Time */}
                 <div className="space-y-4">
                    <h3 className="text-sm font-black text-gray-900 flex items-center justify-end gap-2">
                       <Clock className="w-4 h-4 text-primary" /> توقيت الحفل
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="space-y-2 text-right">
                            <label className="text-[10px] font-bold text-gray-500">وقت الدخول</label>
                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full h-12 bg-white border border-gray-200 rounded-xl px-3 font-bold text-center outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none" />
                        </div>
                        <div className="space-y-2 text-right">
                            <label className="text-[10px] font-bold text-gray-500">وقت الخروج</label>
                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full h-12 bg-white border border-gray-200 rounded-xl px-3 font-bold text-center outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none" />
                        </div>
                    </div>
                 </div>

                 {/* Step 3: Guest Info */}
                 <div className="space-y-4">
                    <h3 className="text-sm font-black text-gray-900 flex items-center justify-end gap-2">
                       <Users className="w-4 h-4 text-primary" /> بيانات التواصل
                    </h3>
                    <div className="space-y-3">
                       <Input label="الاسم الكامل" value={guestName} onChange={e => setGuestName(e.target.value)} className="text-right h-12 rounded-xl" />
                       <Input label="رقم الجوال" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="text-right h-12 rounded-xl" placeholder="05xxxxxxxx" />
                    </div>
                 </div>

                 {/* Step 4: Payment */}
                 <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-black text-gray-900 flex items-center justify-end gap-2">
                       <CreditCard className="w-4 h-4 text-primary" /> تأكيد الدفع
                    </h3>
                    
                    <div className="flex gap-3">
                        <button onClick={() => setPaymentMethod('pay_later')} className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${paymentMethod === 'pay_later' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400'}`}>دفع لاحقاً (عربون)</button>
                        <button onClick={() => setPaymentMethod('credit_card')} className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${paymentMethod === 'credit_card' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400'}`}>دفع كامل (بطاقة)</button>
                    </div>

                    {paymentMethod === 'credit_card' && (
                        <div className="space-y-3 animate-in slide-in-from-top-2">
                            <Input placeholder="رقم البطاقة" value={cardNumber} onChange={e => setCardNumber(e.target.value)} className="bg-gray-50 h-11" />
                            <div className="grid grid-cols-2 gap-3">
                                <Input placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} className="bg-gray-50 h-11" />
                                <Input placeholder="CVC" value={cardCVC} onChange={e => setCardCVC(e.target.value)} className="bg-gray-50 h-11" />
                            </div>
                        </div>
                    )}
                 </div>

                 <Button onClick={handleBookingSubmission} disabled={isBooking} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">
                    {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : 'تأكيد الحجز النهائي'}
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
