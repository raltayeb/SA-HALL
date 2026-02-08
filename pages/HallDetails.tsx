
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, VAT_RATE, HALL_AMENITIES, Coupon, BookingItem, Booking } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  MapPin, CheckCircle2, Loader2, Sparkles, 
  Briefcase, ArrowLeft, X, User, Phone, Wallet,
  Package, Ticket, MessageCircle, CreditCard, Flame, Share2, Heart, ArrowRight, Star,
  ShieldCheck, Calendar, Info, ChevronRight, ChevronLeft
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { format, parseISO } from 'date-fns';

interface HallDetailsProps {
  item: (Hall | Service) & { vendor?: UserProfile };
  type: 'hall' | 'service' | 'chalet';
  user: UserProfile | null;
  onBack: () => void;
}

export const HallDetails: React.FC<HallDetailsProps> = ({ item, type, user, onBack }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [viewersCount, setViewersCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [vendorServices, setVendorServices] = useState<Service[]>([]);
  
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('23:00');
  const [guestName, setGuestName] = useState(user?.full_name || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone_number || '');
  
  const [paymentMethod, setPaymentMethod] = useState<'pay_later' | 'credit_card'>('credit_card');
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);
  const [selectedItems, setSelectedItems] = useState<BookingItem[]>([]);

  const { toast } = useToast();
  
  // Logic to determine if it's a hall context for amenities
  const isHall = type === 'hall' || type === 'chalet' || (item as Hall).type === 'chalet' || (item as Hall).type === 'resort';
  const hall = isHall ? (item as Hall) : null;
  const service = !isHall ? (item as Service) : null;
  
  const allImages = useMemo(() => {
    const imgs = (item as any).images && (item as any).images.length > 0 
      ? (item as any).images 
      : [(item as any).image_url].filter(Boolean);
    return imgs.length > 0 ? imgs : ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'];
  }, [item]);

  useEffect(() => {
    if (allImages.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % allImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [allImages.length]);

  useEffect(() => {
    setViewersCount(Math.floor(Math.random() * (45 - 12 + 1)) + 12);
    const handleWindowScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handleWindowScroll);
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, []);

  const fetchDetails = useCallback(async () => {
    if (isHall) {
      const { data: bookingsData } = await supabase.from('bookings').select('booking_date').eq('hall_id', item.id).neq('status', 'cancelled');
      if (bookingsData) setBlockedDates(bookingsData.map(b => parseISO(b.booking_date)));

      const { data: vServices } = await supabase.from('services').select('*').eq('vendor_id', item.vendor_id).eq('is_active', true).neq('id', item.id);
      setVendorServices(vServices || []);
    }
  }, [item.id, item.vendor_id, isHall]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const toggleService = (srv: Service) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === srv.id);
      if (exists) return prev.filter(i => i.id !== srv.id);
      return [...prev, { id: srv.id, name: srv.name, price: Number(srv.price), qty: 1, type: 'service' }];
    });
  };

  const applyCoupon = async () => {
    if (!couponCodeInput) return;
    setIsVerifyingCoupon(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCodeInput.toUpperCase())
        .eq('is_active', true)
        .eq('vendor_id', item.vendor_id)
        .single();

      if (error || !data) {
        toast({ title: 'كود غير صالح', variant: 'destructive' });
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon(data as Coupon);
        toast({ title: 'تم تطبيق الخصم', variant: 'success' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifyingCoupon(false);
    }
  };

  const basePrice = isHall ? Number(hall!.price_per_night) : Number(service!.price);
  const itemsTotal = useMemo(() => selectedItems.reduce((sum, i) => sum + (i.price * i.qty), 0), [selectedItems]);
  const subTotal = basePrice + itemsTotal;
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    return appliedCoupon.discount_type === 'percentage' 
      ? subTotal * (appliedCoupon.discount_value / 100) 
      : appliedCoupon.discount_value;
  }, [appliedCoupon, subTotal]);

  const priceAfterDiscount = Math.max(0, subTotal - discountAmount);
  const vat = priceAfterDiscount * VAT_RATE;
  const total = priceAfterDiscount + vat;

  const handleNextStep = () => {
    if (step === 1 && !bookingDate) { toast({ title: 'اختر التاريخ', variant: 'destructive' }); return; }
    if (step === 3 && (!guestName || !guestPhone)) { toast({ title: 'أكمل البيانات', variant: 'destructive' }); return; }
    setStep(prev => prev + 1);
  };

  const handleBookingSubmission = async () => {
    setIsBooking(true);
    try {
      const payload = {
        hall_id: isHall ? hall!.id : null,
        service_id: !isHall ? service!.id : null,
        user_id: user?.id || null, 
        vendor_id: item.vendor_id,
        booking_date: bookingDate ? format(bookingDate, 'yyyy-MM-dd') : '',
        start_time: startTime,
        end_time: endTime,
        total_amount: total,
        paid_amount: paymentMethod === 'credit_card' ? total : 0,
        vat_amount: vat,
        discount_amount: discountAmount,
        applied_coupon: appliedCoupon?.code || null,
        payment_status: paymentMethod === 'credit_card' ? 'paid' : 'unpaid',
        items: selectedItems,
        guest_name: guestName,
        guest_phone: guestPhone,
        status: paymentMethod === 'credit_card' ? 'confirmed' : 'pending',
      };

      const { data, error } = await supabase.from('bookings').insert([payload]).select().single();
      if (error) throw error;

      setCompletedBooking({
          ...data,
          halls: isHall ? hall : undefined,
          services: !isHall ? service : undefined,
          vendor: { business_name: item.vendor?.business_name, pos_config: item.vendor?.pos_config }
      } as any);
      setIsWizardOpen(false);
      setShowInvoice(true);
      toast({ title: 'تم الحجز بنجاح', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setIsBooking(false);
    }
  };

  const categoryName = isHall ? (hall?.type === 'chalet' ? 'الشاليهات' : 'القاعات') : 'الخدمات';

  return (
    <div className="bg-[#F8F9FC] min-h-screen font-tajawal pb-20 animate-in fade-in duration-500 text-right" dir="rtl">
      
      {/* Sticky Header */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${isScrolled ? 'bg-white border-gray-100 py-3 shadow-sm' : 'bg-transparent border-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-700">
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className={`transition-all duration-300 ${isScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
              <h1 className="text-lg font-black text-gray-900">{item.name}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="rounded-xl border-gray-200 bg-white"><Share2 className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" className="rounded-xl border-gray-200 bg-white text-red-500"><Heart className="w-4 h-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="pt-24 lg:pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* RTL Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-8 overflow-x-auto no-scrollbar py-2">
            <button onClick={onBack} className="hover:text-primary whitespace-nowrap">الرئيسية</button>
            <ChevronLeft className="w-3 h-3 shrink-0" />
            <span className="whitespace-nowrap">{categoryName}</span>
            <ChevronLeft className="w-3 h-3 shrink-0" />
            <span className="text-gray-900 whitespace-nowrap">{item.name}</span>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-start">
            
            {/* Right Column: Main Content (RTL flow) */}
            <div className="lg:col-span-8 space-y-12">
              
              {/* Photo Carousel */}
              <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border border-gray-100 bg-gray-50 group">
                {allImages.map((img, idx) => (
                  <div key={idx} className={`absolute inset-0 transition-all duration-1000 ${idx === activeSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}>
                    <img src={img} className="w-full h-full object-cover" alt={`${item.name} - ${idx}`} />
                  </div>
                ))}
                
                {/* Carousel Controls */}
                {allImages.length > 1 && (
                  <div className="absolute inset-0 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setActiveSlide(prev => prev === 0 ? allImages.length - 1 : prev - 1)} className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-md flex items-center justify-center text-gray-800 hover:text-primary shadow-sm border border-gray-100">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    <button onClick={() => setActiveSlide(prev => (prev + 1) % allImages.length)} className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-md flex items-center justify-center text-gray-800 hover:text-primary shadow-sm border border-gray-100">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  </div>
                )}

                {/* Indicators */}
                {allImages.length > 1 && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                    {allImages.map((_, i) => (
                      <button key={i} onClick={() => setActiveSlide(i)} className={`h-1.5 rounded-full transition-all ${i === activeSlide ? 'w-8 bg-white' : 'w-2 bg-white/50'}`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Title & Badge */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/5 text-primary border border-primary/10 text-[10px] font-black uppercase tracking-widest">
                      <Sparkles className="w-3.5 h-3.5" /> موثق ومعتمد
                   </div>
                   <div className="flex items-center gap-1 text-yellow-500 text-sm font-black bg-yellow-50 px-3 py-1.5 rounded-xl border border-yellow-100">
                      <Star className="w-4 h-4 fill-current" /> 4.9
                   </div>
                </div>
                <h2 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight">{item.name}</h2>
                <div className="flex items-center gap-2 text-gray-500 font-bold">
                   <MapPin className="w-4 h-4 text-primary" /> 
                   <span>{isHall ? `${hall?.city}, المملكة العربية السعودية` : 'متوفر في جميع المناطق'}</span>
                </div>
              </div>

              {/* Content Boxed Sections */}
              <div className="space-y-8">
                
                {/* Description */}
                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-12 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-6 border-b border-gray-50">
                      <div className="p-3 bg-primary/5 rounded-2xl text-primary"><Briefcase className="w-6 h-6" /></div>
                      <h3 className="text-2xl font-black text-gray-900">نظرة عامة</h3>
                    </div>
                    <p className="text-gray-600 leading-loose text-lg font-medium">
                      {item.description || "استمتع بتجربة فريدة في قاعتنا المجهزة بأحدث التقنيات وأرقى الأثاث. نقدم لكم خدمة متكاملة لضمان راحة ضيوفكم ونجاح مناسبتكم. فريقنا الاحترافي جاهز لخدمتكم على مدار الساعة."}
                    </p>
                  </div>
                </div>

                {/* Features (Separated) */}
                {isHall && (
                  <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-12 space-y-8">
                    <div className="flex items-center gap-3 pb-6 border-b border-gray-50">
                      <div className="p-3 bg-primary/5 rounded-2xl text-primary"><CheckCircle2 className="w-6 h-6" /></div>
                      <h3 className="text-2xl font-black text-gray-900">المميزات والمرافق</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {(hall?.amenities?.length ? hall.amenities : HALL_AMENITIES).map((amenity, i) => (
                        <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-700 hover:border-primary/20 transition-all">
                          <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center text-green-600 shrink-0"><CheckCircle2 className="w-4 h-4" /></div>
                          <span>{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Services (Separated) */}
                {vendorServices.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-12 space-y-8">
                    <div className="flex items-center gap-3 pb-6 border-b border-gray-50">
                      <div className="p-3 bg-primary/5 rounded-2xl text-primary"><Sparkles className="w-6 h-6" /></div>
                      <h3 className="text-2xl font-black text-gray-900">خدمات إضافية حصرية</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {vendorServices.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-5 rounded-2xl bg-gray-50 border border-gray-100 transition-all hover:bg-white group">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center text-gray-300 group-hover:text-primary transition-colors overflow-hidden">
                                {s.image_url ? <img src={s.image_url} className="w-full h-full object-cover" alt={s.name} /> : <Package className="w-5 h-5" />}
                             </div>
                             <div>
                                <span className="font-black text-sm text-gray-900 block">{s.name}</span>
                                <PriceTag amount={s.price} className="text-xs font-bold text-primary mt-1" />
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Map Placeholder */}
                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-12 space-y-8">
                  <div className="flex items-center gap-3 pb-6 border-b border-gray-50">
                    <div className="p-3 bg-primary/5 rounded-2xl text-primary"><MapPin className="w-6 h-6" /></div>
                    <h3 className="text-2xl font-black text-gray-900">الموقع الجغرافي</h3>
                  </div>
                  <div className="aspect-video bg-gray-50 rounded-3xl border border-gray-200 flex items-center justify-center relative overflow-hidden group">
                    <MapPin className="w-16 h-16 text-gray-200 group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md border border-gray-100 p-6 rounded-2xl flex justify-between items-center transition-all flex-row-reverse">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">المنطقة والمدينة</p>
                        <span className="text-sm font-bold text-gray-700">{hall?.city} - {hall?.address || 'سيتم إرسال الموقع التفصيلي بعد الحجز'}</span>
                      </div>
                      <Button variant="outline" className="rounded-xl border-gray-200 text-primary font-black hover:bg-primary/5 h-10 px-5">فتح الخرائط</Button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Left Column: Sticky Sidebar Card */}
            <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
              
              <div className="bg-white border border-gray-100 rounded-[3rem] p-10 space-y-10">
                <div className="flex justify-between items-end pb-8 border-b border-gray-50 flex-row-reverse">
                   <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">سعر الحجز يبدأ من</p>
                      <PriceTag amount={basePrice} className="text-4xl font-black text-primary" />
                   </div>
                   <span className="text-xs font-bold text-gray-400 mb-1">/{isHall ? 'الليلة' : 'الخدمة'}</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 py-4 px-4 rounded-2xl border border-red-100 flex-row-reverse">
                     <Flame className="w-4 h-4 fill-current animate-pulse" />
                     <span className="text-xs font-black">{viewersCount} شخص يتصفح هذه القاعة حالياً</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">سياسة الإلغاء</p>
                        <p className="text-xs font-black text-gray-700">مرنة (48 ساعة)</p>
                     </div>
                     <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">الحجز</p>
                        <p className="text-xs font-black text-gray-700">تأكيد فوري</p>
                     </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button onClick={() => { setStep(1); setIsWizardOpen(true); }} className="w-full h-16 rounded-[2rem] text-xl font-black bg-primary text-white border-none hover:bg-primary/95 transition-all active:scale-[0.98]">
                     احجز موعدك الآن
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 flex-row-reverse">
                     <ShieldCheck className="w-4 h-4 text-green-500" />
                     <span>عملية حجز آمنة بنسبة 100%</span>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-50 flex items-center gap-4 flex-row-reverse">
                  <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary font-black text-2xl uppercase">
                     {item.vendor?.business_name?.[0] || 'V'}
                  </div>
                  <div className="text-right flex-1">
                     <h4 className="text-sm font-black text-gray-900">{item.vendor?.business_name || 'مزود الخدمة المعتمد'}</h4>
                     <p className="text-[10px] text-gray-400 font-bold">عضو موثق في المنصة</p>
                  </div>
                  <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all"><MessageCircle className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-[2.5rem] p-8 space-y-4">
                <div className="flex items-center justify-end gap-2 text-gray-800 font-black text-sm">
                   <span>تعهد منصة القاعة</span>
                   <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-medium text-gray-500 leading-relaxed text-right">نضمن لك صحة البيانات وسلامة عملية الدفع وتوثيق الحجز مع مزود الخدمة بشكل رسمي.</p>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Booking Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
              
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-row-reverse">
                 <div className="flex items-center gap-4 flex-row-reverse">
                    <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-base">{step}</div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">المرحلة الحالية</p>
                       <span className="text-sm font-black text-gray-700">
                           {step === 1 ? 'تحديد الموعد' : step === 2 ? 'إضافات حصرية' : step === 3 ? 'بيانات العميل' : 'الدفع والمراجعة'}
                       </span>
                    </div>
                 </div>
                 <button onClick={() => setIsWizardOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10">
                 {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                        <div className="text-center space-y-2">
                           <h3 className="text-2xl font-black text-gray-900">متى سيكون الفرح؟</h3>
                           <p className="text-sm text-gray-400 font-bold">حدد تاريخ وتوقيت مناسبتك الخاصة</p>
                        </div>
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-200 space-y-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">تاريخ الحجز</label>
                            <div className="relative">
                               <input 
                                 type="date" 
                                 value={bookingDate ? format(bookingDate, 'yyyy-MM-dd') : ''} 
                                 onChange={(e) => setBookingDate(e.target.value ? parseISO(e.target.value) : undefined)} 
                                 min={new Date().toISOString().split('T')[0]} 
                                 className="w-full h-14 bg-white border border-gray-200 rounded-2xl px-6 font-black text-lg outline-none focus:border-primary transition-all text-right" 
                               />
                               <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-6 h-6" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="وقت الحضور" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-14 rounded-2xl text-center font-black" />
                            <Input label="وقت الانصراف" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-14 rounded-2xl text-center font-black" />
                        </div>
                    </div>
                 )}

                 {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                        <div className="text-center space-y-2">
                           <h3 className="text-2xl font-black text-gray-900">خدمات إضافية</h3>
                           <p className="text-sm text-gray-400 font-bold">ارتقِ بمناسبتك مع خدماتنا المميزة</p>
                        </div>
                        
                        {vendorServices.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                                {vendorServices.map(s => (
                                    <button key={s.id} onClick={() => toggleService(s)} className={`flex justify-between items-center p-5 rounded-2xl border transition-all flex-row-reverse ${selectedItems.some(i => i.id === s.id) ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                                        <div className="flex gap-4 items-center flex-row-reverse">
                                            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${selectedItems.some(i => i.id === s.id) ? 'bg-primary border-primary text-white' : 'bg-gray-100 border-gray-200'}`}>
                                                {selectedItems.some(i => i.id === s.id) && <CheckCircle2 className="w-4 h-4" />}
                                            </div>
                                            <div className="text-right">
                                               <span className="font-black text-sm text-gray-900 block">{s.name}</span>
                                               <PriceTag amount={s.price} className="text-xs font-black text-primary mt-1" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                           <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                              <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                              <p className="text-xs text-gray-400 font-bold">لا توجد خدمات إضافية حالياً</p>
                           </div>
                        )}

                        <div className="pt-8 border-t border-gray-100">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 block mb-3">كود خصم؟</label>
                            <div className="flex gap-3 flex-row-reverse">
                                <input placeholder="ادخل الرمز هنا" value={couponCodeInput} onChange={e => setCouponCodeInput(e.target.value)} className="flex-1 h-14 bg-gray-50 border border-gray-200 rounded-2xl px-6 text-center uppercase font-black tracking-widest outline-none focus:border-primary transition-all" />
                                <Button onClick={applyCoupon} disabled={!couponCodeInput || isVerifyingCoupon} className="h-14 px-8 font-black bg-gray-900 text-white rounded-2xl">
                                   {isVerifyingCoupon ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تطبيق'}
                                </Button>
                            </div>
                        </div>
                    </div>
                 )}

                 {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                        <div className="text-center space-y-2">
                           <h3 className="text-2xl font-black text-gray-900">بيانات التواصل</h3>
                           <p className="text-sm text-gray-400 font-bold">الرجاء تزويدنا ببياناتك لتأكيد الحجز</p>
                        </div>
                        <div className="space-y-4">
                           <Input label="الاسم الكامل" value={guestName} onChange={e => setGuestName(e.target.value)} className="h-14 rounded-2xl font-black bg-gray-50 border-gray-200" icon={<User className="w-5 h-5 text-gray-400" />} />
                           <Input label="رقم الجوال" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="h-14 rounded-2xl font-black bg-gray-50 border-gray-200" icon={<Phone className="w-5 h-5 text-gray-400" />} />
                        </div>
                    </div>
                 )}

                 {step === 4 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                        <div className="text-center space-y-2">
                           <h3 className="text-2xl font-black text-gray-900">مراجعة الحساب</h3>
                           <p className="text-sm text-gray-400 font-bold">الملخص المالي النهائي</p>
                        </div>
                        
                        <div className="bg-gray-900 text-white p-10 rounded-[2.5rem] space-y-6 relative overflow-hidden">
                            <div className="relative z-10 space-y-4">
                               <div className="flex justify-between items-center text-white/50 text-[10px] font-black uppercase tracking-widest flex-row-reverse">
                                  <span>قيمة الحجز</span>
                                  <PriceTag amount={subTotal} className="text-white" />
                               </div>
                               {discountAmount > 0 && (
                                  <div className="flex justify-between items-center text-red-400 text-[10px] font-black uppercase tracking-widest border-t border-white/5 pt-4 flex-row-reverse">
                                     <span className="flex items-center gap-1"><Ticket className="w-3.5 h-3.5" /> الخصم</span>
                                     <span>-{discountAmount} SAR</span>
                                  </div>
                               )}
                               <div className="flex justify-between items-center text-white/50 text-[10px] font-black uppercase tracking-widest border-t border-white/5 pt-4 flex-row-reverse">
                                  <span>الضريبة (15%)</span>
                                  <PriceTag amount={vat} className="text-white" />
                               </div>
                               <div className="flex justify-between items-center text-4xl font-black pt-6 border-t border-white/10 mt-2 flex-row-reverse">
                                  <span>الإجمالي</span>
                                  <PriceTag amount={total} className="text-white" />
                               </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <button onClick={() => setPaymentMethod('credit_card')} className={`p-6 border-2 rounded-2xl flex flex-col items-center gap-3 transition-all ${paymentMethod === 'credit_card' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400'}`}>
                               <CreditCard className="w-8 h-8" /> <span className="text-sm font-black">مدى / فيزا</span>
                           </button>
                           <button onClick={() => setPaymentMethod('pay_later')} className={`p-6 border-2 rounded-2xl flex flex-col items-center gap-3 transition-all ${paymentMethod === 'pay_later' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400'}`}>
                               <Wallet className="w-8 h-8" /> <span className="text-sm font-black">آجل / تحويل</span>
                           </button>
                        </div>
                    </div>
                 )}
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50/30 flex gap-4 flex-row-reverse">
                 <Button onClick={step < 4 ? handleNextStep : handleBookingSubmission} disabled={isBooking} className="flex-1 h-16 rounded-2xl font-black text-xl bg-primary text-white border-none hover:bg-primary/95 transition-all">
                    {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : (step < 4 ? 'الخطوة التالية' : 'تأكيد الحجز')}
                 </Button>
                 {step > 1 && (
                    <Button variant="outline" onClick={() => setStep(step - 1)} className="h-16 px-8 rounded-2xl font-black border-2 border-gray-200">
                       <ArrowRight className="w-5 h-5" />
                    </Button>
                 )}
              </div>
           </div>
        </div>
      )}

      {showInvoice && completedBooking && (
          <InvoiceModal isOpen={showInvoice} onClose={() => { setShowInvoice(false); onBack(); }} booking={completedBooking} />
      )}
    </div>
  );
};
