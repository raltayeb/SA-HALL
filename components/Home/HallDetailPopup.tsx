
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Hall, UserProfile, Service, VAT_RATE, HALL_AMENITIES } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PriceTag } from '../ui/PriceTag';
import { Badge } from '../ui/Badge';
import { DatePicker } from '../ui/DatePicker';
import { 
  X, MapPin, Users, Star, Share2, 
  Calendar as CalendarIcon, CheckCircle2, 
  Loader2, Sparkles, Check, ChevronRight, ChevronLeft,
  ShieldCheck, Zap, Diamond, Clock, CreditCard
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';
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
  const [bookingDate, setBookingDate] = useState<Date | undefined>(new Date());
  
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

  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(true);
  const [isBooking, setIsBooking] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  const { toast } = useToast();
  const isHall = type === 'hall';
  const hall = isHall ? (item as Hall) : null;
  const service = !isHall ? (item as Service) : null;
  
  const allImages = (item as any).images && (item as any).images.length > 0 
    ? (item as any).images 
    : [(item as any).image_url].filter(Boolean);

  const fetchVendorAddons = async () => {
    if (isHall) {
      const { data: servicesData } = await supabase.from('services').select('*').eq('vendor_id', item.vendor_id).eq('is_active', true);
      setVendorServices(servicesData || []);
      
      const { data: blocksData } = await supabase.from('availability_blocks').select('block_date').eq('hall_id', item.id);
      if (blocksData) setBlockedDates(blocksData.map(b => b.block_date));
    }
  };

  const checkAvailability = useCallback(async () => {
    if (!bookingDate || !isHall) return;
    const dateStr = format(bookingDate, 'yyyy-MM-dd');
    
    if (blockedDates.includes(dateStr)) {
        setIsAvailable(false);
        return;
    }

    setIsChecking(true);
    try {
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('hall_id', item.id)
        .eq('booking_date', dateStr)
        .neq('status', 'cancelled')
        .maybeSingle();

      setIsAvailable(!existingBooking);
    } catch (e) {
      console.error(e);
      setIsAvailable(true); 
    } finally {
      setIsChecking(false);
    }
  }, [item.id, bookingDate, isHall, blockedDates]);

  useEffect(() => { fetchVendorAddons(); }, [item.vendor_id, isHall]);

  useEffect(() => {
    if (bookingDate) checkAvailability();
  }, [bookingDate, checkAvailability]);

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

  const handleBookingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isAvailable === false) {
        toast({ title: 'عذراً', description: 'هذا التاريخ محجوز بالفعل.', variant: 'destructive' });
        return;
    }

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
    
    if (paymentMethod === 'credit_card' && (!cardNumber || !cardExpiry || !cardCVC)) {
        toast({ title: 'بيانات الدفع', description: 'يرجى إدخال بيانات البطاقة لإتمام الدفع.', variant: 'destructive' });
        return;
    }

    setIsBooking(true);
    const { total, vat } = calculateTotal();
    const dateStr = format(bookingDate, 'yyyy-MM-dd');

    // Simulate Payment Processing
    const isPaid = paymentMethod === 'credit_card';
    const paymentStatus = isPaid ? 'paid' : 'unpaid';
    const paidAmount = isPaid ? total : 0;

    try {
      const { error: bookingError } = await supabase.from('bookings').insert([{
        hall_id: isHall ? hall!.id : null,
        service_id: !isHall ? service!.id : null,
        user_id: user?.id || null, 
        vendor_id: item.vendor_id,
        booking_date: dateStr,
        start_time: startTime,
        end_time: endTime,
        total_amount: total,
        paid_amount: paidAmount, // Store paid amount
        vat_amount: vat,
        payment_status: paymentStatus,
        status: isPaid ? 'confirmed' : 'pending', // Auto confirm if paid
        notes: `الاسم: ${guestName} | الجوال: ${guestPhone} ${!user ? '(حجز زائر)' : ''} | الدفع: ${isPaid ? 'بطاقة ائتمان' : 'لاحقاً'}`
      }]);

      if (bookingError) throw bookingError;

      await supabase.from('notifications').insert([{
        user_id: item.vendor_id,
        title: isPaid ? 'حجز جديد مدفوع 💰' : 'طلب حجز جديد (زائر) 👑',
        message: `لديك طلب حجز ${isPaid ? 'مؤكد' : 'جديد'} لـ ${item.name} من ${guestName}.`,
        type: 'booking_new',
        link: 'hall_bookings'
      }]);

      toast({ 
        title: isPaid ? 'تم الحجز والدفع بنجاح' : 'تم إرسال طلبك بنجاح', 
        description: isPaid ? 'تم تأكيد حجزك وإرسال التفاصيل.' : 'سيقوم فريق القاعة بالتواصل معك قريباً لتأكيد التفاصيل والدفع.', 
        variant: 'success' 
      });
      setIsBookingModalOpen(false);
      onClose();
    } catch (err: any) {
      console.error('Booking Submission Error:', err);
      toast({ 
        title: 'خطأ في معالجة الطلب', 
        description: err.message || 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.', 
        variant: 'destructive' 
      });
    } finally {
      setIsBooking(false);
    }
  };

  const { total, vat } = calculateTotal();

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col overflow-hidden animate-in fade-in duration-700 font-sans text-foreground">
      <header className="px-6 h-20 flex justify-between items-center shrink-0 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
         <div className="flex items-center gap-6">
            <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
               <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
               <Diamond className="w-6 h-6 text-primary fill-current" />
               <h4 className="text-4xl font-ruqaa text-primary leading-none mt-1">قاعه</h4>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="rounded-2xl w-12 h-12 border-gray-100"><Share2 className="w-5 h-5 text-muted-foreground" /></Button>
            <Button type="button" onClick={handleBookingClick} className="rounded-2xl px-10 h-12 font-bold shadow-xl shadow-primary/20 text-lg">احجز الآن</Button>
         </div>
      </header>

      {/* Main Content (Images, Info, Services) - Same as before... */}
      <div className="flex-1 overflow-y-auto">
        {/* ... (Images Section - No changes needed) ... */}
        <section className="px-6 lg:px-20 pt-10">
            <div className="max-w-7xl mx-auto">
               <div className="relative aspect-[21/9] rounded-[3rem] overflow-hidden bg-gray-100 shadow-2xl group border border-gray-100">
                  <img src={allImages[activeImage]} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Hero View" />
                  <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-all duration-500">
                     <button onClick={() => setActiveImage(prev => (prev + 1) % allImages.length)} className="w-14 h-14 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white shadow-xl"><ChevronLeft className="w-7 h-7" /></button>
                     <button onClick={() => setActiveImage(prev => (prev - 1 + allImages.length) % allImages.length)} className="w-14 h-14 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white shadow-xl"><ChevronRight className="w-7 h-7" /></button>
                  </div>
                  <div className="absolute bottom-8 inset-x-10 flex gap-3 overflow-x-auto no-scrollbar pb-2">
                     {allImages.map((img, idx) => (
                        <button key={idx} onClick={() => setActiveImage(idx)} className={`w-24 h-16 rounded-xl border-2 transition-all shrink-0 overflow-hidden ${activeImage === idx ? 'border-primary scale-105 shadow-xl' : 'border-white/10 opacity-70 hover:opacity-100'}`}>
                           <img src={img} className="w-full h-full object-cover" />
                        </button>
                     ))}
                  </div>
               </div>
            </div>
        </section>

        <div className="max-w-7xl mx-auto px-6 lg:px-20 py-16">
          <div className="grid lg:grid-cols-12 gap-16">
            <div className="lg:col-span-7 space-y-12 text-start">
               {/* ... (Description, Amenities, Vendor Services - No changes needed) ... */}
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

                {isHall && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900">خدمات إضافية متاحة</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {vendorServices.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">لا توجد خدمات إضافية حالياً.</p>
                      ) : vendorServices.map(s => (
                        <div key={s.id} onClick={() => toggleService(s.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${selectedServices.includes(s.id) ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-gray-100 hover:border-primary/30'}`}>
                           <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedServices.includes(s.id) ? 'bg-primary border-primary' : 'border-gray-200'}`}>
                                 {selectedServices.includes(s.id) && <Check className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <div className="text-right">
                                 <p className="text-sm font-bold text-gray-900">{s.name}</p>
                                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.category}</p>
                              </div>
                           </div>
                           <PriceTag amount={s.price} className="text-sm text-primary" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                           <div className="bg-primary/5 text-primary px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase flex items-center gap-2 border border-primary/10">متاح الآن</div>
                        </div>

                        {isHall && (
                          <div className="space-y-4">
                            <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center justify-between flex-row-reverse">
                               <span>تاريخ المناسبة</span>
                               {isChecking ? (
                                 <span className="flex items-center gap-1 text-primary animate-pulse flex-row-reverse text-[10px]"><Loader2 className="w-3 h-3 animate-spin" /> جاري التحقق...</span>
                               ) : isAvailable === true ? (
                                 <span className="text-green-600 flex items-center gap-1 flex-row-reverse text-[10px]"><CheckCircle2 className="w-3 h-3" /> متاح للحجز</span>
                               ) : isAvailable === false ? (
                                 <span className="text-red-500 font-bold text-[10px]">غير متاح</span>
                               ) : null}
                            </h5>
                            <DatePicker 
                              date={bookingDate} 
                              setDate={setBookingDate}
                              placeholder="اختر تاريخ الحفل"
                            />
                          </div>
                        )}

                        <div className="space-y-3 text-[11px] font-bold text-gray-500">
                           <div className="flex justify-between flex-row-reverse"><span>سعر {isHall ? 'القاعة' : 'الخدمة'}</span> <PriceTag amount={isHall ? hall!.price_per_night : service!.price} className="text-gray-900" iconSize={12} /></div>
                           {selectedServices.length > 0 && (
                             <div className="flex justify-between flex-row-reverse"><span>الخدمات الإضافية</span> <PriceTag amount={vendorServices.filter(s => selectedServices.includes(s.id)).reduce((sum, sumS) => sum + Number(sumS.price), 0)} className="text-gray-900" iconSize={12} /></div>
                           )}
                           <div className="flex justify-between flex-row-reverse text-gray-400"><span>ضريبة القيمة المضافة (15%)</span> <PriceTag amount={vat} className="text-gray-400 font-bold" iconSize={12} /></div>
                        </div>
                     </div>
                     
                     <div className="space-y-4">
                        <Button 
                          type="button"
                          onClick={handleBookingClick} 
                          className={`w-full h-16 rounded-2xl font-bold text-xl transition-all ${isAvailable === false ? 'opacity-50 cursor-not-allowed grayscale' : 'shadow-2xl shadow-primary/20 hover:scale-[1.02]'}`}
                          disabled={isHall && isAvailable === false}
                        >
                          {isHall && isAvailable === false ? 'التاريخ محجوز' : 'إكمال الحجز'} <Zap className="w-5 h-5 ms-3 fill-current" />
                        </Button>
                     </div>

                     <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 justify-end">
                           <h5 className="text-[10px] font-bold text-gray-900 uppercase">نظام حماية الحجوزات</h5>
                           <ShieldCheck className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 text-right leading-tight">نضمن لك أفضل جودة وخدمة متكاملة لمناسبتك الخاصة.</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in overflow-y-auto">
           <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl relative border border-gray-100 flex flex-col animate-in zoom-in-95 my-10">
              <button type="button" onClick={() => setIsBookingModalOpen(false)} className="absolute top-10 end-10 p-4 hover:bg-gray-50 rounded-2xl transition-all z-[1050] text-gray-400"><X className="w-6 h-6" /></button>
              <div className="p-12 space-y-8 text-right">
                 <div className="space-y-4">
                    <div className="w-16 h-16 bg-primary/5 rounded-[1.5rem] flex items-center justify-center text-primary border border-primary/10">
                       <CalendarIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 tracking-tighter uppercase leading-none">تأكيد الحجز</h2>
                      <p className="text-gray-400 font-bold text-sm mt-2">أكمل بياناتك لنقوم بتخصيص التجربة المثالية لمناسبتك.</p>
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                    {/* Date & Time Section */}
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                        <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
                            <Clock className="w-4 h-4" /> التوقيت والموعد
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400">تاريخ المناسبة</label>
                                <div className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 flex items-center justify-end font-bold text-sm text-gray-900">
                                    {bookingDate ? format(bookingDate, 'dd MMMM yyyy', { locale: arSA }) : 'لم يتم اختيار تاريخ'}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400">من الساعة</label>
                                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full h-12 bg-white border border-gray-200 rounded-xl px-2 font-bold text-sm text-center outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400">إلى الساعة</label>
                                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full h-12 bg-white border border-gray-200 rounded-xl px-2 font-bold text-sm text-center outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Guest Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                       <Input label="الاسم الكامل" placeholder="الاسم" className="h-14 rounded-2xl font-bold text-right" value={guestName} onChange={e => setGuestName(e.target.value)} />
                       <Input label="رقم الجوال" placeholder="05xxxxxxxx" className="h-14 rounded-2xl font-bold text-right" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
                    </div>

                    {/* Payment Section */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
                            <CreditCard className="w-4 h-4" /> طريقة الدفع
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setPaymentMethod('pay_later')}
                                className={`h-16 rounded-2xl border-2 font-bold text-sm flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === 'pay_later' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}
                            >
                                <span>دفع لاحقاً</span>
                                <span className="text-[9px]">تأكيد مبدئي</span>
                            </button>
                            <button 
                                onClick={() => setPaymentMethod('credit_card')}
                                className={`h-16 rounded-2xl border-2 font-bold text-sm flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === 'credit_card' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}
                            >
                                <span>بطاقة ائتمان</span>
                                <span className="text-[9px]">تأكيد فوري</span>
                            </button>
                        </div>

                        {paymentMethod === 'credit_card' && (
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4 animate-in slide-in-from-top-2">
                                <Input label="رقم البطاقة" placeholder="0000 0000 0000 0000" value={cardNumber} onChange={e => setCardNumber(e.target.value)} className="bg-white" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="تاريخ الانتهاء" placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} className="bg-white" />
                                    <Input label="CVC" placeholder="123" value={cardCVC} onChange={e => setCardCVC(e.target.value)} className="bg-white" />
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold pt-2">
                                    <span>المبلغ المستحق للدفع:</span>
                                    <PriceTag amount={total} className="text-lg text-primary" />
                                </div>
                            </div>
                        )}
                    </div>

                    <Button type="button" onClick={handleBookingSubmission} disabled={isChecking || isBooking} className="w-full h-16 rounded-[1.5rem] font-bold text-xl shadow-xl shadow-primary/20 mt-6">
                      {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : paymentMethod === 'credit_card' ? `دفع ${total} ر.س وتأكيد` : 'إرسال طلب الحجز'}
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
