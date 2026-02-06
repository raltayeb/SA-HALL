import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, VAT_RATE, HALL_AMENITIES, POSItem, Coupon } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Badge } from '../components/ui/Badge';
import { 
  MapPin, Users, Star, Share2, Heart, ChevronRight, ChevronLeft,
  CheckCircle2, Loader2, Sparkles, 
  ShieldCheck, Clock, CreditCard, ArrowLeft, X, User, Phone, Wallet, Eye,
  Briefcase, ShoppingBag, Plus, Package, Store, Ticket
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { format, parseISO, startOfDay, isSameDay, isBefore } from 'date-fns';

interface HallDetailsProps {
  item: (Hall | Service) & { vendor?: UserProfile };
  type: 'hall' | 'service';
  user: UserProfile | null;
  onBack: () => void;
}

export const HallDetails: React.FC<HallDetailsProps> = ({ item, type, user, onBack }) => {
  // UI State
  const [activeSlide, setActiveSlide] = useState(0);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [viewersCount, setViewersCount] = useState(0);

  // Data State
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [vendorServices, setVendorServices] = useState<Service[]>([]);
  const [storeItems, setStoreItems] = useState<POSItem[]>([]);
  const [partnerServices, setPartnerServices] = useState<(Service & { vendor?: { business_name: string } })[]>([]);
  
  // Booking Form State
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('23:00');
  const [guestName, setGuestName] = useState(user?.full_name || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone_number || '');
  const [paymentMethod, setPaymentMethod] = useState<'pay_later' | 'credit_card'>('credit_card');
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '' });
  
  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);

  // Add-ons State
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  const { toast } = useToast();
  const isHall = type === 'hall';
  const hall = isHall ? (item as Hall) : null;
  const service = !isHall ? (item as Service) : null;
  
  const allImages = (item as any).images && (item as any).images.length > 0 
    ? (item as any).images 
    : [(item as any).image_url].filter(Boolean);

  // Auto Slider & Viewer Counter (Preserved)
  useEffect(() => {
    const timer = setInterval(() => setActiveSlide((prev) => (prev + 1) % allImages.length), 5000);
    return () => clearInterval(timer);
  }, [allImages.length]);

  useEffect(() => {
    setViewersCount(Math.floor(Math.random() * (380 - 100 + 1)) + 100);
  }, []);

  const fetchDetails = useCallback(async () => {
    if (isHall) {
      const { data: bookingsData } = await supabase.from('bookings').select('booking_date').eq('hall_id', item.id).neq('status', 'cancelled');
      if (bookingsData) setBlockedDates(bookingsData.map(b => parseISO(b.booking_date)));

      const { data: vServices } = await supabase.from('services').select('*').eq('vendor_id', item.vendor_id).eq('is_active', true);
      setVendorServices(vServices || []);

      const { data: vStore } = await supabase.from('pos_items').select('*').eq('vendor_id', item.vendor_id);
      setStoreItems(vStore || []);

      const { data: pServices } = await supabase.from('services').select('*, vendor:vendor_id(business_name)').neq('vendor_id', item.vendor_id).eq('is_active', true).limit(4);
      setPartnerServices(pServices as any || []);
    }
  }, [item.id, item.vendor_id, isHall]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  // Handle Coupon Application
  const applyCoupon = async () => {
    if (!couponCodeInput) return;
    setIsVerifyingCoupon(true);
    try {
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('vendor_id', item.vendor_id)
            .eq('code', couponCodeInput.toUpperCase())
            .eq('is_active', true)
            .gte('end_date', new Date().toISOString().split('T')[0])
            .maybeSingle();

        if (error || !data) {
            toast({ title: 'كوبون غير صالح', description: 'تأكد من الرمز أو تاريخ الصلاحية.', variant: 'destructive' });
            setAppliedCoupon(null);
        } else {
            // Check if coupon applies to the main item or any selected extras
            const targetIds = data.target_ids || [];
            const isApplicableToMain = targetIds.length === 0 || targetIds.includes(item.id);
            
            if (!isApplicableToMain) {
                toast({ title: 'تنبيه', description: 'هذا الكوبون غير صالح لهذا المنتج المحدد.', variant: 'warning' });
                setIsVerifyingCoupon(false);
                return;
            }

            setAppliedCoupon(data as Coupon);
            toast({ title: 'تم تطبيق الخصم', description: `حصلت على خصم ${data.discount_value}${data.discount_type === 'percentage' ? '%' : ' ر.س'}`, variant: 'success' });
        }
    } catch (err) {
        console.error(err);
    } finally {
        setIsVerifyingCoupon(false);
    }
  };

  // Calculations
  const basePrice = isHall ? Number(hall!.price_per_night) : Number(service!.price);
  const extrasTotal = useMemo(() => {
    let sum = 0;
    const allExtras = [...vendorServices, ...storeItems, ...partnerServices];
    selectedExtras.forEach(id => {
        const found = allExtras.find(e => e.id === id);
        if (found) sum += Number(found.price);
    });
    return sum;
  }, [selectedExtras, vendorServices, storeItems, partnerServices]);

  const subTotal = basePrice + extrasTotal;
  
  // Calculate Discount
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
        return subTotal * (appliedCoupon.discount_value / 100);
    } else {
        return appliedCoupon.discount_value;
    }
  }, [appliedCoupon, subTotal]);

  const priceAfterDiscount = Math.max(0, subTotal - discountAmount);
  const vat = priceAfterDiscount * VAT_RATE;
  const total = priceAfterDiscount + vat;

  // --- Booking Wizard Logic Fixes ---

  /**
   * checkAvailability: Checks if the selected booking date is available and not in the past.
   */
  const checkAvailability = () => {
    if (!bookingDate) return false;
    if (isBefore(bookingDate, startOfDay(new Date()))) {
        toast({ title: 'تاريخ غير صالح', description: 'لا يمكن الحجز في الماضي.', variant: 'destructive' });
        return false;
    }
    const isBlocked = blockedDates.some(blocked => isSameDay(blocked, bookingDate));
    if (isBlocked) {
        toast({ title: 'نعتذر', description: 'هذا اليوم محجوز مسبقاً.', variant: 'destructive' });
        return false;
    }
    return true;
  };

  /**
   * handleNextStep: Orchestrates the transition between wizard steps with validation.
   */
  const handleNextStep = () => {
    if (step === 1) {
        if (!bookingDate) {
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
        // Extras step is optional
        setStep(3);
    } else if (step === 3) {
        if (!guestName || !guestPhone) {
            toast({ title: 'تنبيه', description: 'يرجى إكمال البيانات الشخصية.', variant: 'destructive' });
            return;
        }
        setStep(4);
    }
  };

  const handleBookingSubmission = async () => {
    if (paymentMethod === 'credit_card' && (!cardData.number || !cardData.expiry || !cardData.cvc)) {
        toast({ title: 'بيانات الدفع', description: 'بيانات البطاقة ناقصة.', variant: 'destructive' });
        return;
    }

    setIsBooking(true);
    try {
      const isPaid = paymentMethod === 'credit_card';
      const dateStr = bookingDate ? format(bookingDate, 'yyyy-MM-dd') : '';

      const { error: bookingError } = await supabase.from('bookings').insert([{
        hall_id: isHall ? hall!.id : null,
        service_id: !isHall ? service!.id : null,
        user_id: user?.id || null, 
        vendor_id: item.vendor_id,
        booking_date: dateStr,
        start_time: startTime,
        end_time: endTime,
        total_amount: total,
        paid_amount: isPaid ? total : 0,
        vat_amount: vat,
        discount_amount: discountAmount,
        applied_coupon: appliedCoupon?.code || null,
        payment_status: isPaid ? 'paid' : 'unpaid',
        guest_name: guestName,
        guest_phone: guestPhone,
        status: isPaid ? 'confirmed' : 'pending',
        notes: `كوبون: ${appliedCoupon?.code || 'لا يوجد'}`
      }]);

      if (bookingError) throw bookingError;

      toast({ title: 'تم الحجز بنجاح', description: 'سيتم توجيهك الآن للمتابعة.', variant: 'success' });
      setIsWizardOpen(false);
      onBack();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="bg-[#F8F9FC] min-h-screen animate-in fade-in duration-500 pt-24 pb-20">
      <main className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
         
         <div className="relative w-full aspect-[16/9] md:h-[500px] md:aspect-auto rounded-[2.5rem] overflow-hidden bg-black group mb-10 shadow-2xl">
            {allImages.map((img, i) => (
               <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === activeSlide ? 'opacity-100' : 'opacity-0'}`}>
                  <img src={img} className="w-full h-full object-cover" alt="Venue" />
               </div>
            ))}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
               {allImages.map((_, i) => <button key={i} onClick={() => setActiveSlide(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeSlide ? 'w-8 bg-white' : 'w-2 bg-white/40'}`} />)}
            </div>
         </div>

         <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 space-y-8">
               <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100 space-y-6">
                  <div className="flex flex-wrap items-center gap-4">
                     <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs gap-1"><Sparkles className="w-3 h-3" /> موصى به</Badge>
                     {isHall && <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{hall?.capacity} ضيف</span>}
                  </div>
                  <h2 className="text-4xl font-black text-gray-900 leading-tight">{item.name}</h2>
                  <p className="text-gray-600 leading-loose text-lg font-medium">{item.description || "استمتع بتجربة فريدة ومميزة في هذا المكان الرائع."}</p>
               </div>

               {/* Services/Extras - Multi Select UI in Wizard for simplicity, but showing host info here */}
               {isHall && (
                  <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100 space-y-6">
                     <h3 className="text-xl font-black flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> الخدمات والمرافق</h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(hall?.amenities?.length ? hall.amenities : HALL_AMENITIES).map((amenity, i) => (
                           <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-700 hover:border-primary/30 transition-colors">
                              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> {amenity}
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            {/* LEFT SIDEBAR: PRICE & BOOKING */}
            <div className="lg:col-span-4 relative">
               <div className="sticky top-24 space-y-6">
                  <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl shadow-gray-200/50 space-y-6">
                     <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                        <div className="text-right">
                           <p className="text-xs font-bold text-gray-400 mb-1">السعر يبدأ من</p>
                           <PriceTag amount={basePrice} className="text-3xl font-black text-primary" />
                        </div>
                        <span className="text-xs font-bold text-gray-400">/{isHall ? 'الليلة' : 'الخدمة'}</span>
                     </div>
                     
                     <div className="space-y-4">
                        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-xs font-black flex items-center gap-3 border border-green-100">
                           <ShieldCheck className="w-5 h-5" /> ضمان أفضل سعر في المملكة
                        </div>
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 border border-red-100 animate-pulse">
                           <Eye className="w-4 h-4" /> {viewersCount} شخص يتابعون هذا المكان حالياً
                        </div>
                     </div>

                     <Button onClick={() => { setStep(1); setIsWizardOpen(true); }} className="w-full h-16 rounded-[1.5rem] text-xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all bg-primary text-white">
                        احجز موعدك الآن
                     </Button>
                  </div>
               </div>
            </div>
         </div>
      </main>

      {/* Booking Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
              
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                 <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs">{step}</span>
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                        {step === 1 ? 'الموعد' : step === 2 ? 'الإضافات' : step === 3 ? 'البيانات' : 'تأكيد الحجز'}
                    </span>
                 </div>
                 <button onClick={() => setIsWizardOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                 {/* Step 1: Date & Time */}
                 {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center"><h3 className="text-2xl font-black mb-1">متى ستكون مناسبتك؟</h3><p className="text-sm text-gray-500 font-bold">يرجى اختيار التاريخ والوقت لتأكيد التوفر.</p></div>
                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                            <label className="block text-xs font-black text-gray-400 uppercase mb-3">تاريخ اليوم المنشود</label>
                            <input type="date" value={bookingDate ? format(bookingDate, 'yyyy-MM-dd') : ''} onChange={(e) => setBookingDate(e.target.value ? parseISO(e.target.value) : undefined)} min={new Date().toISOString().split('T')[0]} className="w-full h-14 bg-white border border-gray-200 rounded-2xl px-5 font-black text-gray-900 outline-none focus:ring-2 ring-primary/20" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="وقت الدخول" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-12 rounded-xl text-center font-bold" />
                            <Input label="وقت الخروج" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-12 rounded-xl text-center font-bold" />
                        </div>
                    </div>
                 )}

                 {/* Step 2: Extras & Coupon */}
                 {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                        <div className="text-center"><h3 className="text-2xl font-black">تحسين تجربتك</h3><p className="text-sm text-gray-500 font-bold">اختر خدمات إضافية أو طبق كوبون الخصم.</p></div>
                        
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-2">كوبون الخصم</label>
                            <div className="flex gap-2">
                                <Input placeholder="أدخل رمز الكوبون" value={couponCodeInput} onChange={e => setCouponCodeInput(e.target.value)} className="h-12 rounded-xl font-bold uppercase tracking-widest text-center flex-1" />
                                <Button onClick={applyCoupon} disabled={!couponCodeInput || isVerifyingCoupon} className="px-6 rounded-xl font-black bg-[#111827] text-white">
                                    {isVerifyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تطبيق'}
                                </Button>
                            </div>
                            {appliedCoupon && (
                                <div className="bg-green-50 border border-green-100 p-3 rounded-xl flex items-center justify-between animate-in zoom-in-95">
                                    <div className="flex items-center gap-2 text-green-700 font-bold text-xs"><Ticket className="w-4 h-4" /> كوبون {appliedCoupon.code} نشط</div>
                                    <button onClick={() => { setAppliedCoupon(null); setCouponCodeInput(''); }} className="text-red-400 hover:text-red-600 transition-colors"><X className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>

                        {vendorServices.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">خدمات المضيف المتاحة</h4>
                                <div className="grid gap-3">
                                    {vendorServices.map(s => (
                                        <div key={s.id} onClick={() => {
                                            const targets = appliedCoupon?.target_ids || [];
                                            if (targets.length > 0 && !targets.includes(s.id)) {
                                                toast({ title: 'تنبيه', description: 'هذا الكوبون لا يشمل هذه الخدمة.', variant: 'warning' });
                                            }
                                            // Fixed 'id' to 's.id'
                                            setSelectedExtras(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]);
                                        }} className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${selectedExtras.includes(s.id) ? 'bg-primary/5 border-primary' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selectedExtras.includes(s.id) ? 'bg-primary text-white border-primary' : 'bg-gray-100'}`}>
                                                    {selectedExtras.includes(s.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </div>
                                                <span className="font-bold text-sm text-gray-700">{s.name}</span>
                                            </div>
                                            <PriceTag amount={s.price} className="text-sm font-black" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                 )}

                 {/* Step 3: Guest Info */}
                 {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center"><h3 className="text-2xl font-black">لمن هذا الحجز؟</h3><p className="text-sm text-gray-500 font-bold">يرجى تأكيد بيانات التواصل لإرسال الفاتورة.</p></div>
                        <div className="space-y-4">
                            <Input label="الاسم الكامل للمسؤول" value={guestName} onChange={e => setGuestName(e.target.value)} className="h-14 rounded-2xl font-black" icon={<User className="w-5 h-5" />} />
                            <Input label="رقم جوال التواصل" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="h-14 rounded-2xl font-black" icon={<Phone className="w-5 h-5" />} />
                        </div>
                    </div>
                 )}

                 {/* Step 4: Confirm & Pay */}
                 {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center"><h3 className="text-2xl font-black">مراجعة التكاليف</h3><p className="text-sm text-gray-500 font-bold">يرجى مراجعة تفاصيل المبلغ النهائي وطريقة الدفع.</p></div>
                        
                        <div className="bg-gray-900 text-white p-8 rounded-[2rem] space-y-4 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                            <div className="flex justify-between text-white/60 text-sm font-bold"><span>تكلفة القاعة والخدمات</span><PriceTag amount={subTotal} className="text-white" /></div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-red-400 text-sm font-black"><span>الخصم المطبق ({appliedCoupon?.code})</span><span>-{discountAmount.toLocaleString()} ر.س</span></div>
                            )}
                            <div className="flex justify-between text-white/60 text-xs font-bold border-t border-white/10 pt-2"><span>الضريبة (15%)</span><PriceTag amount={vat} className="text-white" /></div>
                            <div className="flex justify-between text-2xl font-black pt-4 border-t border-white/20"><span>الإجمالي النهائي</span><PriceTag amount={total} className="text-white text-3xl" /></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setPaymentMethod('credit_card')} className={`p-5 rounded-2xl border-2 font-black text-xs flex flex-col items-center gap-3 transition-all ${paymentMethod === 'credit_card' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400'}`}>
                                <CreditCard className="w-8 h-8" /> بطاقة ائتمانية
                            </button>
                            <button onClick={() => setPaymentMethod('pay_later')} className={`p-5 rounded-2xl border-2 font-black text-xs flex flex-col items-center gap-3 transition-all ${paymentMethod === 'pay_later' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400'}`}>
                                <Wallet className="w-8 h-8" /> دفع آجل / تحويل
                            </button>
                        </div>
                    </div>
                 )}
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
                 {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} className="h-14 px-8 rounded-2xl font-black border-2"><ArrowLeft className="w-5 h-5" /></Button>}
                 <Button onClick={step < 4 ? handleNextStep : handleBookingSubmission} disabled={isBooking} className="flex-1 h-14 rounded-2xl font-black text-xl shadow-2xl shadow-primary/20 bg-primary text-white">
                    {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : (step < 4 ? 'متابعة الحجز' : 'تأكيد ودفع')}
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
