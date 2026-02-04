
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Hall, UserProfile, Service, VAT_RATE, HALL_AMENITIES } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PriceTag } from '../ui/PriceTag';
import { Badge } from '../ui/Badge';
import { 
  X, MapPin, Users, Star, Share2, 
  Calendar as CalendarIcon, CheckCircle2, 
  Loader2, Sparkles, Check, ChevronRight, ChevronLeft,
  ShieldCheck, Zap, Diamond, Clock, CreditCard, ArrowLeft, User
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { format, parseISO, startOfDay, isSameDay, isBefore } from 'date-fns';
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
  
  // Booking Wizard State
  const [step, setStep] = useState(1); // 1: Date/Time, 2: Guest Info, 3: Payment/Confirm
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Booking Data
  // Using string for native date input compatibility (YYYY-MM-DD)
  const [bookingDateStr, setBookingDateStr] = useState<string>(''); 
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

  const { total, vat } = calculateTotal();

  // Wizard Handlers
  const handleBookingClick = () => {
    setStep(1);
    setIsBookingModalOpen(true);
  };

  const checkAvailability = () => {
    if (!bookingDateStr) return false;
    const selected = parseISO(bookingDateStr);
    
    // Check past dates
    if (isBefore(selected, startOfDay(new Date()))) {
        toast({ title: 'تاريخ غير صالح', description: 'لا يمكن الحجز في تاريخ قديم.', variant: 'destructive' });
        return false;
    }

    // Check availability
    const isBlocked = blockedDates.some(blocked => isSameDay(blocked, selected));
    if (isBlocked) {
        toast({ title: 'نعتذر', description: 'هذا اليوم محجوز مسبقاً، يرجى اختيار يوم آخر.', variant: 'destructive' });
        return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (step === 1) {
        if (!bookingDateStr) {
            toast({ title: 'تنبيه', description: 'يرجى اختيار التاريخ.', variant: 'destructive' });
            return;
        }
        if (startTime >= endTime) {
            toast({ title: 'خطأ في الوقت', description: 'وقت الخروج يجب أن يكون بعد وقت الدخول.', variant: 'destructive' });
            return;
        }
        if (!checkAvailability()) return;
        setStep(2);
    } else if (step === 2) {
        if (!guestName || !guestPhone) {
            toast({ title: 'تنبيه', description: 'يرجى إكمال البيانات الشخصية.', variant: 'destructive' });
            return;
        }
        setStep(3);
    }
  };

  const handleBookingSubmission = async () => {
    if (paymentMethod === 'credit_card' && (!cardNumber || !cardExpiry || !cardCVC)) {
        toast({ title: 'بيانات الدفع', description: 'يرجى إدخال بيانات البطاقة لإتمام الدفع.', variant: 'destructive' });
        return;
    }

    setIsBooking(true);
    
    try {
      const isPaid = paymentMethod === 'credit_card';
      const paymentStatus = isPaid ? 'paid' : 'unpaid';
      const paidAmount = isPaid ? total : 0;

      const { error: bookingError } = await supabase.from('bookings').insert([{
        hall_id: isHall ? hall!.id : null,
        service_id: !isHall ? service!.id : null,
        user_id: user?.id || null, 
        vendor_id: item.vendor_id,
        booking_date: bookingDateStr,
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
        message: `طلب حجز لـ ${item.name} بتاريخ ${bookingDateStr}`,
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
                           {bookingDateStr ? (
                             <span>{format(parseISO(bookingDateStr), 'EEEE, d MMMM yyyy', { locale: arSA })}</span>
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
              
              {/* Wizard Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 rounded-t-[2.5rem]">
                 <button onClick={() => setIsBookingModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400"><X className="w-5 h-5" /></button>
                 
                 {/* Stepper */}
                 <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                    <div className={`w-8 h-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                    <div className={`w-8 h-1 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`}></div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                 </div>

                 <h2 className="text-lg font-black text-gray-900 w-8"> </h2>
              </div>
              
              <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
                 
                 {/* STEP 1: Date & Availability */}
                 {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-black text-gray-900">تحديد الموعد</h3>
                            <p className="text-sm text-gray-500">اختر اليوم والوقت المناسب لمناسبتك</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2 text-right">
                                <label className="text-xs font-black text-gray-500 flex items-center justify-end gap-2">تاريخ المناسبة <CalendarIcon className="w-3.5 h-3.5" /></label>
                                <Input 
                                    type="date" 
                                    value={bookingDateStr} 
                                    onChange={e => setBookingDateStr(e.target.value)} 
                                    className="h-12 rounded-xl text-right font-bold appearance-none bg-gray-50 border-gray-200 focus:border-primary"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 text-right">
                                    <label className="text-xs font-black text-gray-500 flex items-center justify-end gap-2">وقت الخروج <Clock className="w-3.5 h-3.5" /></label>
                                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-12 rounded-xl text-center font-bold bg-gray-50" />
                                </div>
                                <div className="space-y-2 text-right">
                                    <label className="text-xs font-black text-gray-500 flex items-center justify-end gap-2">وقت الدخول <Clock className="w-3.5 h-3.5" /></label>
                                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-12 rounded-xl text-center font-bold bg-gray-50" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3 text-right">
                            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-blue-800 leading-relaxed">سيتم التحقق من إتاحة القاعة فورياً عند الضغط على التالي. الأيام المحجوزة مسبقاً لن تقبل الحجز.</p>
                        </div>
                    </div>
                 )}

                 {/* STEP 2: Guest Info */}
                 {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-black text-gray-900">بيانات الحجز</h3>
                            <p className="text-sm text-gray-500">لمن سيتم تسجيل هذا الحجز؟</p>
                        </div>

                        <div className="space-y-4">
                            <Input 
                                label="الاسم الكامل" 
                                placeholder="مثال: محمد أحمد"
                                value={guestName} 
                                onChange={e => setGuestName(e.target.value)} 
                                className="text-right h-12 rounded-xl font-bold" 
                            />
                            <Input 
                                label="رقم الجوال" 
                                value={guestPhone} 
                                onChange={e => setGuestPhone(e.target.value)} 
                                className="text-right h-12 rounded-xl font-bold" 
                                placeholder="05xxxxxxxx" 
                            />
                        </div>

                        <div className="bg-gray-50 p-4 rounded-2xl text-center space-y-1 border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">تاريخ الحجز المختار</p>
                            <p className="text-sm font-black text-primary dir-ltr">
                                {format(parseISO(bookingDateStr), 'EEEE, d MMMM yyyy', { locale: arSA })}
                            </p>
                            <p className="text-xs font-bold text-gray-500 dir-ltr">{startTime} - {endTime}</p>
                        </div>
                    </div>
                 )}

                 {/* STEP 3: Payment & Confirm */}
                 {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-black text-gray-900">الدفع والتأكيد</h3>
                            <p className="text-sm text-gray-500">مراجعة نهائية قبل إتمام الحجز</p>
                        </div>

                        <div className="bg-white border-2 border-dashed border-gray-200 p-6 rounded-2xl space-y-4 text-right">
                            <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                                <span>سعر القاعة</span>
                                <PriceTag amount={isHall ? hall?.price_per_night || 0 : service?.price || 0} />
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                                <span>الضريبة (15%)</span>
                                <PriceTag amount={vat} />
                            </div>
                            <div className="border-t pt-4 flex justify-between items-center text-lg font-black text-gray-900">
                                <span>الإجمالي</span>
                                <PriceTag amount={total} className="text-primary" />
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest text-right">طريقة الدفع</h4>
                            <div className="flex gap-3">
                                <button onClick={() => setPaymentMethod('pay_later')} className={`flex-1 py-4 rounded-2xl text-xs font-bold border-2 transition-all ${paymentMethod === 'pay_later' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400 bg-white'}`}>دفع عربون (تحويل)</button>
                                <button onClick={() => setPaymentMethod('credit_card')} className={`flex-1 py-4 rounded-2xl text-xs font-bold border-2 transition-all ${paymentMethod === 'credit_card' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400 bg-white'}`}>دفع كامل (بطاقة)</button>
                            </div>

                            {paymentMethod === 'credit_card' && (
                                <div className="space-y-3 animate-in slide-in-from-top-2">
                                    <Input placeholder="رقم البطاقة" value={cardNumber} onChange={e => setCardNumber(e.target.value)} className="bg-gray-50 h-11 text-center font-mono" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} className="bg-gray-50 h-11 text-center font-mono" />
                                        <Input placeholder="CVC" value={cardCVC} onChange={e => setCardCVC(e.target.value)} className="bg-gray-50 h-11 text-center font-mono" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                 )}
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-[2.5rem] flex gap-3">
                 {step > 1 && (
                    <Button variant="outline" onClick={() => setStep(step - 1)} className="h-14 px-6 rounded-2xl font-bold">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                 )}
                 {step < 3 ? (
                    <Button onClick={handleNextStep} className="flex-1 h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">
                        الخطوة التالية
                    </Button>
                 ) : (
                    <Button onClick={handleBookingSubmission} disabled={isBooking} className="flex-1 h-14 rounded-2xl font-black text-lg shadow-xl shadow-green-500/20 bg-green-600 hover:bg-green-700 text-white">
                        {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : 'تأكيد الحجز نهائياً'}
                    </Button>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
