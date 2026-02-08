
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, VAT_RATE, HALL_AMENITIES, POSItem, Coupon, BookingItem, Booking } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Badge } from '../components/ui/Badge';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  MapPin, CheckCircle2, Loader2, Sparkles, 
  Briefcase, ArrowLeft, X, User, Phone, Wallet,
  Package, Store, Ticket, MessageCircle, CreditCard, Flame, Eye, Share2, Heart, ArrowRight, Clock, Star,
  // Fix: Added ShieldCheck to imports
  ShieldCheck
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
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Invoice State
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  // Data State
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [vendorServices, setVendorServices] = useState<Service[]>([]);
  const [storeItems, setStoreItems] = useState<POSItem[]>([]);
  
  // Booking Form State
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('23:00');
  const [guestName, setGuestName] = useState(user?.full_name || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone_number || '');
  
  // Payment State
  const [bookingType, setBookingType] = useState<'booking' | 'consultation'>('booking');
  const [paymentMethod, setPaymentMethod] = useState<'pay_later' | 'credit_card' | 'cash'>('credit_card');
  const [cashType, setCashType] = useState<'full' | 'deposit'>('full');
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '' });
  
  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);

  // Cart/Extras State (Services + Products)
  const [selectedItems, setSelectedItems] = useState<BookingItem[]>([]);

  const { toast } = useToast();
  const isHall = type === 'hall';
  const hall = isHall ? (item as Hall) : null;
  const service = !isHall ? (item as Service) : null;
  
  const allImages = (item as any).images && (item as any).images.length > 0 
    ? (item as any).images 
    : [(item as any).image_url].filter(Boolean);

  // Auto Slider & Viewer Counter
  useEffect(() => {
    const timer = setInterval(() => setActiveSlide((prev) => (prev + 1) % allImages.length), 5000);
    return () => clearInterval(timer);
  }, [allImages.length]);

  useEffect(() => {
    setViewersCount(Math.floor(Math.random() * (50 - 15 + 1)) + 15);
    const viewerInterval = setInterval(() => {
        setViewersCount(prev => Math.max(12, prev + Math.floor(Math.random() * 5) - 2));
    }, 10000);
    return () => clearInterval(viewerInterval);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 50);
  };

  const fetchDetails = useCallback(async () => {
    if (isHall) {
      const { data: bookingsData } = await supabase.from('bookings').select('booking_date').eq('hall_id', item.id).neq('status', 'cancelled');
      if (bookingsData) setBlockedDates(bookingsData.map(b => parseISO(b.booking_date)));

      const { data: vServices } = await supabase.from('services').select('*').eq('vendor_id', item.vendor_id).eq('is_active', true);
      setVendorServices(vServices || []);

      const { data: vStore } = await supabase.from('pos_items').select('*').eq('vendor_id', item.vendor_id);
      setStoreItems(vStore || []);
    }
  }, [item.id, item.vendor_id, isHall]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  // Handle Cart Operations
  const addToCart = (product: POSItem) => {
    setSelectedItems(prev => {
        const exists = prev.find(i => i.id === product.id && i.type === 'product');
        if (exists) {
            return prev.map(i => i.id === product.id && i.type === 'product' ? { ...i, qty: i.qty + 1 } : i);
        }
        return [...prev, { id: product.id, name: product.name, price: Number(product.price), qty: 1, type: 'product' }];
    });
  };

  const removeFromCart = (id: string, type: 'product' | 'service') => {
      setSelectedItems(prev => prev.filter(i => !(i.id === id && i.type === type)));
  };

  const toggleService = (srv: Service) => {
      setSelectedItems(prev => {
          const exists = prev.find(i => i.id === srv.id && i.type === 'service');
          if (exists) return prev.filter(i => i.id !== srv.id);
          return [...prev, { id: srv.id, name: srv.name, price: Number(srv.price), qty: 1, type: 'service' }];
      });
  };

  // Fix: Implemented applyCoupon function
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
        toast({ title: 'كود غير صالح', description: 'تأكد من صحة الكود وصلاحيته.', variant: 'destructive' });
        setAppliedCoupon(null);
      } else {
        const coupon = data as Coupon;
        const now = new Date();
        if (new Date(coupon.end_date) < now) {
            toast({ title: 'كود منتهي', description: 'هذا الكود قد انتهت صلاحيته.', variant: 'destructive' });
            setAppliedCoupon(null);
            return;
        }
        setAppliedCoupon(coupon);
        toast({ title: 'تم تطبيق الخصم', variant: 'success' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifyingCoupon(false);
    }
  };

  // Calculations
  const basePrice = isHall ? Number(hall!.price_per_night) : Number(service!.price);
  const itemsTotal = useMemo(() => selectedItems.reduce((sum, i) => sum + (i.price * i.qty), 0), [selectedItems]);
  const subTotal = basePrice + itemsTotal;
  
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
        return subTotal * (appliedCoupon.discount_value / 100);
    } else {
        return appliedCoupon.discount_value;
    }
  }, [appliedCoupon, subTotal]);

  const priceAfterDiscount = Math.max(0, subTotal - discountAmount);
  const vat = bookingType === 'consultation' ? 0 : priceAfterDiscount * VAT_RATE;
  const total = bookingType === 'consultation' ? 0 : priceAfterDiscount + vat;

  // Wizard Logic
  const handleNextStep = () => {
    if (step === 1) {
        if (!bookingDate) { toast({ title: 'اختر التاريخ', variant: 'destructive' }); return; }
        if (startTime >= endTime) { toast({ title: 'تحقق من الوقت', variant: 'destructive' }); return; }
        setStep(2);
    } else if (step === 2) {
        setStep(3);
    } else if (step === 3) {
        if (!guestName || !guestPhone) { toast({ title: 'أكمل البيانات', variant: 'destructive' }); return; }
        setStep(4);
    }
  };

  const handleBookingSubmission = async () => {
    setIsBooking(true);
    try {
      const dateStr = bookingDate ? format(bookingDate, 'yyyy-MM-dd') : '';
      let calculatedPaidAmount = 0;
      let paymentStatus = 'unpaid';

      if (bookingType === 'booking') {
          if (paymentMethod === 'credit_card') {
              calculatedPaidAmount = total;
              paymentStatus = 'paid';
          } else if (paymentMethod === 'cash') {
              calculatedPaidAmount = cashType === 'full' ? total : depositAmount;
              paymentStatus = cashType === 'full' ? 'paid' : 'partial';
          }
      }

      const payload = {
        hall_id: isHall ? hall!.id : null,
        service_id: !isHall ? service!.id : null,
        user_id: user?.id || null, 
        vendor_id: item.vendor_id,
        booking_date: dateStr,
        start_time: startTime,
        end_time: endTime,
        total_amount: total,
        paid_amount: calculatedPaidAmount,
        vat_amount: vat,
        discount_amount: discountAmount,
        applied_coupon: appliedCoupon?.code || null,
        payment_status: paymentStatus,
        booking_type: bookingType,
        items: selectedItems,
        guest_name: guestName,
        guest_phone: guestPhone,
        status: (paymentStatus === 'paid' || bookingType === 'consultation') ? 'confirmed' : 'pending',
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
      toast({ title: 'تمت العملية بنجاح', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="bg-[#F8F9FC] min-h-screen animate-in fade-in duration-500 font-tajawal">
      {/* Sticky Header - Refined */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md border-b border-gray-200 py-3' : 'bg-transparent py-6'}`}>
         <div className="max-w-7xl mx-auto px-4 lg:px-8 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:border-primary/30 transition-all text-gray-700">
                  <ArrowRight className="w-5 h-5" />
               </button>
               {isScrolled && <h1 className="text-lg font-black text-gray-900 animate-in fade-in">{item.name}</h1>}
            </div>
            <div className="flex items-center gap-3">
               <Button variant="outline" size="icon" className="rounded-xl w-10 h-10 bg-white border-gray-200 hover:border-primary/30"><Share2 className="w-4 h-4" /></Button>
               <Button variant="outline" size="icon" className="rounded-xl w-10 h-10 bg-white border-gray-200 hover:border-red-200 text-red-400"><Heart className="w-4 h-4" /></Button>
            </div>
         </div>
      </header>

      {/* Main Content Area */}
      <div className="pt-24 pb-20 overflow-y-auto" onScroll={handleScroll}>
         <div className="max-w-7xl mx-auto px-4 lg:px-8">
            
            {/* Gallery Section - Boxed Flat */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12 h-[450px] md:h-[550px]">
               <div className="md:col-span-2 md:row-span-2 relative rounded-3xl overflow-hidden bg-gray-100 border border-gray-200">
                  <img src={allImages[0]} className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105" alt="Main" />
               </div>
               <div className="hidden md:block relative rounded-3xl overflow-hidden bg-gray-100 border border-gray-200">
                  <img src={allImages[1] || allImages[0]} className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105" alt="Side 1" />
               </div>
               <div className="hidden md:block relative rounded-3xl overflow-hidden bg-gray-100 border border-gray-200">
                  <img src={allImages[2] || allImages[0]} className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105" alt="Side 2" />
               </div>
               <div className="hidden md:block relative rounded-3xl overflow-hidden bg-gray-100 border border-gray-200 group cursor-pointer">
                  <img src={allImages[3] || allImages[0]} className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105 opacity-80" alt="More" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white font-black text-xl">+{allImages.length} صور</div>
               </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-12">
               {/* Content Details */}
               <div className="lg:col-span-8 space-y-10 text-right">
                  <div className="space-y-4">
                     <div className="flex items-center gap-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/5 text-primary border border-primary/10 text-[10px] font-black uppercase tracking-widest">
                           <Sparkles className="w-3.5 h-3.5" /> موثق ومعتمد
                        </div>
                        <div className="flex items-center gap-1 text-yellow-500 text-sm font-black bg-yellow-50 px-2.5 py-1 rounded-xl">
                           <Star className="w-4 h-4 fill-current" /> 4.9
                        </div>
                     </div>
                     <h2 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight">{item.name}</h2>
                     <p className="text-gray-500 font-bold flex items-center gap-2 justify-end text-sm"><MapPin className="w-4 h-4 text-primary" /> {isHall ? `${hall?.city}, المملكة العربية السعودية` : 'متوفر في جميع المناطق'}</p>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 space-y-8">
                     <div className="space-y-4">
                        <h3 className="text-xl font-black flex items-center gap-2 justify-end border-b border-gray-50 pb-4">
                           عن {isHall ? 'المكان' : 'الخدمة'} <Briefcase className="w-5 h-5 text-primary" />
                        </h3>
                        <p className="text-gray-600 leading-loose text-lg font-medium">
                           {item.description || "استمتع بتجربة فريدة في قاعتنا المجهزة بأحدث التقنيات وأرقى الأثاث. نقدم لكم خدمة متكاملة لضمان راحة ضيوفكم ونجاح مناسبتكم. فريقنا الاحترافي جاهز لخدمتكم على مدار الساعة."}
                        </p>
                     </div>

                     {isHall && (
                        <div className="space-y-6 pt-6">
                           <h4 className="text-lg font-black">المميزات والخدمات</h4>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {(hall?.amenities?.length ? hall.amenities : HALL_AMENITIES).map((amenity, i) => (
                                 <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-700 hover:border-primary/20 transition-colors">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> {amenity}
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>

                  <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 space-y-6">
                     <h3 className="text-xl font-black flex items-center gap-2 justify-end">الموقع الجغرافي <MapPin className="w-5 h-5 text-primary" /></h3>
                     <div className="aspect-video bg-gray-50 rounded-3xl border border-gray-200 flex items-center justify-center relative overflow-hidden">
                        <MapPin className="w-12 h-12 text-gray-200" />
                        <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                           <span className="text-xs font-bold text-gray-600">{hall?.city} - {hall?.address || 'الموقع التفصيلي'}</span>
                           <Button variant="outline" size="sm" className="rounded-xl text-xs font-black">فتح الخرائط</Button>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Booking Sidebar */}
               <div className="lg:col-span-4 relative">
                  <div className="sticky top-28 space-y-6">
                     <div className="bg-white border-2 border-primary/5 rounded-[2.5rem] p-8 space-y-8">
                        <div className="flex justify-between items-end border-b border-gray-50 pb-8">
                           <div className="text-right">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">السعر يبدأ من</p>
                              <PriceTag amount={basePrice} className="text-4xl font-black text-primary" />
                           </div>
                           <span className="text-xs font-bold text-gray-400">/{isHall ? 'الليلة' : 'الخدمة'}</span>
                        </div>
                        
                        <div className="space-y-4">
                           <div className="flex items-center justify-center gap-2 text-red-500 bg-red-50 py-3.5 px-4 rounded-2xl border border-red-100 animate-pulse">
                              <Flame className="w-4 h-4 fill-current" />
                              <span className="text-xs font-black">{viewersCount} شخص يشاهد هذه القاعة الآن</span>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-3">
                              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                                 <p className="text-[9px] font-bold text-gray-400 uppercase">سياسة الإلغاء</p>
                                 <p className="text-[11px] font-black text-gray-700">مرنة (48 ساعة)</p>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                                 <p className="text-[9px] font-bold text-gray-400 uppercase">تأكيد فوري</p>
                                 <p className="text-[11px] font-black text-gray-700">متاح الآن</p>
                              </div>
                           </div>
                        </div>

                        <Button onClick={() => { setStep(1); setIsWizardOpen(true); }} className="w-full h-16 rounded-2xl text-xl font-black bg-primary text-white hover:bg-primary/90 transition-all active:scale-[0.98]">
                           احجز موعدك الآن
                        </Button>
                        
                        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400">
                           <ShieldCheck className="w-3.5 h-3.5" />
                           <span>دفع آمن بنسبة 100%</span>
                        </div>
                     </div>

                     {/* Vendor Quick Info */}
                     <div className="bg-gray-50 border border-gray-200 rounded-[2rem] p-6 flex items-center gap-4 flex-row-reverse">
                        <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-primary font-black text-lg uppercase">
                           {item.vendor?.business_name?.[0] || 'V'}
                        </div>
                        <div className="text-right flex-1">
                           <h4 className="text-sm font-black text-gray-900">{item.vendor?.business_name || 'مزود الخدمة'}</h4>
                           <p className="text-[10px] text-gray-400 font-bold">عضو منذ 2024</p>
                        </div>
                        <button className="text-primary hover:bg-white p-2 rounded-xl border border-transparent hover:border-primary/10 transition-all"><MessageCircle className="w-5 h-5" /></button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Booking Wizard - Refined Overlay */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
              
              <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm">{step}</div>
                    <span className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">
                        {step === 1 ? 'الموعد' : step === 2 ? 'إضافات' : step === 3 ? 'البيانات' : 'الدفع'}
                    </span>
                 </div>
                 <button onClick={() => setIsWizardOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                 {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center space-y-2">
                           <h3 className="text-2xl font-black text-gray-900">متى ستحتفل؟</h3>
                           <p className="text-sm text-gray-400 font-bold">اختر التاريخ والوقت المناسبين لمناسبتك</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">تاريخ المناسبة</label>
                            <input 
                              type="date" 
                              value={bookingDate ? format(bookingDate, 'yyyy-MM-dd') : ''} 
                              onChange={(e) => setBookingDate(e.target.value ? parseISO(e.target.value) : undefined)} 
                              min={new Date().toISOString().split('T')[0]} 
                              className="w-full h-14 bg-white border border-gray-200 rounded-2xl px-5 font-black text-lg outline-none focus:border-primary/30 transition-all" 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="وقت الدخول" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-12 rounded-xl text-center font-bold" />
                            <Input label="وقت الخروج" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-12 rounded-xl text-center font-bold" />
                        </div>
                    </div>
                 )}

                 {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                        <div className="text-center space-y-2">
                           <h3 className="text-2xl font-black text-gray-900">إضافات حصرية</h3>
                           <p className="text-sm text-gray-400 font-bold">أضف لمسة من الفخامة إلى حجزك</p>
                        </div>
                        
                        {vendorServices.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right px-2">خدمات إضافية</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {vendorServices.map(s => (
                                        <button key={s.id} onClick={() => toggleService(s)} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${selectedItems.some(i => i.id === s.id) ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                                            <div className="flex gap-3 items-center">
                                                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${selectedItems.some(i => i.id === s.id) ? 'bg-primary border-primary text-white' : 'bg-gray-100 border-gray-200'}`}>
                                                    {selectedItems.some(i => i.id === s.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </div>
                                                <span className="font-bold text-sm text-gray-800">{s.name}</span>
                                            </div>
                                            <PriceTag amount={s.price} className="text-sm font-black text-primary" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 pt-4 border-t border-gray-50">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">هل لديك كود خصم؟</label>
                            <div className="flex gap-2">
                                <Input placeholder="أدخل الرمز هنا" value={couponCodeInput} onChange={e => setCouponCodeInput(e.target.value)} className="h-12 text-center uppercase font-black bg-gray-50 border-gray-200" />
                                <Button onClick={applyCoupon} disabled={!couponCodeInput || isVerifyingCoupon} className="h-12 px-6 font-black bg-gray-900 text-white hover:bg-black">{isVerifyingCoupon ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تطبيق'}</Button>
                            </div>
                        </div>
                    </div>
                 )}

                 {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center space-y-2">
                           <h3 className="text-2xl font-black text-gray-900">بيانات التواصل</h3>
                           <p className="text-sm text-gray-400 font-bold">لمن سيتم إصدار هذا الحجز؟</p>
                        </div>
                        <div className="space-y-4">
                            <Input label="الاسم الكامل" value={guestName} onChange={e => setGuestName(e.target.value)} className="h-14 rounded-2xl font-black bg-gray-50 border-gray-200" icon={<User className="w-5 h-5 text-gray-400" />} />
                            <Input label="رقم الجوال" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="h-14 rounded-2xl font-black bg-gray-50 border-gray-200" icon={<Phone className="w-5 h-5 text-gray-400" />} />
                        </div>
                    </div>
                 )}

                 {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center space-y-2">
                           <h3 className="text-2xl font-black text-gray-900">المراجعة والدفع</h3>
                           <p className="text-sm text-gray-400 font-bold">مراجعة أخيرة قبل إتمام الحجز</p>
                        </div>
                        
                        <div className="bg-gray-900 text-white p-8 rounded-[2.5rem] space-y-4 relative overflow-hidden border border-gray-800">
                            <div className="flex justify-between items-center text-white/60 text-xs font-bold uppercase tracking-widest"><span>السعر الأساسي</span><PriceTag amount={subTotal} className="text-white" /></div>
                            {discountAmount > 0 && <div className="flex justify-between items-center text-red-400 text-xs font-bold uppercase tracking-widest"><span>الخصم</span><span>-{discountAmount} ر.س</span></div>}
                            <div className="flex justify-between items-center text-white/60 text-xs uppercase tracking-widest border-t border-white/5 pt-4"><span>ضريبة القيمة المضافة</span><PriceTag amount={vat} className="text-white" /></div>
                            <div className="flex justify-between items-center text-3xl font-black pt-4 border-t border-white/10"><span>الإجمالي</span><PriceTag amount={total} className="text-white" /></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setPaymentMethod('credit_card')} className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${paymentMethod === 'credit_card' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400'}`}>
                                <CreditCard className="w-6 h-6" /> <span className="text-xs font-black">بطاقة (مدى/فيزا)</span>
                            </button>
                            <button onClick={() => setPaymentMethod('cash')} className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400'}`}>
                                <Wallet className="w-6 h-6" /> <span className="text-xs font-black">نقدي / تحويل</span>
                            </button>
                        </div>

                        {paymentMethod === 'credit_card' && (
                            <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-in fade-in">
                                <Input placeholder="رقم البطاقة" value={cardData.number} onChange={e => setCardData({...cardData, number: e.target.value})} className="bg-white text-center font-mono h-12 rounded-xl border-gray-200" />
                                <div className="grid grid-cols-2 gap-3">
                                    <Input placeholder="MM/YY" value={cardData.expiry} onChange={e => setCardData({...cardData, expiry: e.target.value})} className="bg-white text-center font-mono h-12 rounded-xl border-gray-200" />
                                    <Input placeholder="CVC" value={cardData.cvc} onChange={e => setCardData({...cardData, cvc: e.target.value})} className="bg-white text-center font-mono h-12 rounded-xl border-gray-200" />
                                </div>
                            </div>
                        )}
                    </div>
                 )}
              </div>

              <div className="p-8 border-t border-gray-50 bg-gray-50/30 flex gap-4">
                 {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} className="h-14 px-8 rounded-2xl font-black border-2 border-gray-200"><ArrowLeft className="w-5 h-5" /></Button>}
                 <Button onClick={step < 4 ? handleNextStep : handleBookingSubmission} disabled={isBooking} className="flex-1 h-14 rounded-2xl font-black text-xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-[0.98]">
                    {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : (step < 4 ? 'متابعة' : 'تأكيد ودفع')}
                 </Button>
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
