
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, VAT_RATE, HALL_AMENITIES, POSItem } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Badge } from '../components/ui/Badge';
import { 
  MapPin, Users, Star, Share2, Heart, ChevronRight, ChevronLeft,
  CheckCircle2, Loader2, Sparkles, 
  ShieldCheck, Clock, CreditCard, ArrowLeft, X, User, Phone, Wallet, Eye,
  Briefcase, ShoppingBag, Plus, Package, Store
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
  
  // Add-ons State
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]); // IDs of selected services/items

  const { toast } = useToast();
  const isHall = type === 'hall';
  const hall = isHall ? (item as Hall) : null;
  const service = !isHall ? (item as Service) : null;
  
  const allImages = (item as any).images && (item as any).images.length > 0 
    ? (item as any).images 
    : [(item as any).image_url].filter(Boolean);

  // Auto-scroll Slider
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % allImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [allImages.length]);

  // Fake Viewers Counter
  useEffect(() => {
    setViewersCount(Math.floor(Math.random() * (380 - 100 + 1)) + 100);
    const interval = setInterval(() => {
      setViewersCount(prev => {
        const change = Math.floor(Math.random() * 8) - 3;
        let next = prev + change;
        if (next < 100) next = 100;
        if (next > 380) next = 380;
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchDetails = useCallback(async () => {
    if (isHall) {
      // 1. Blocked Dates
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('booking_date')
        .eq('hall_id', item.id)
        .neq('status', 'cancelled');
        
      if (bookingsData) {
        const dates = bookingsData.map(b => parseISO(b.booking_date));
        setBlockedDates(dates);
      }

      // 2. Vendor Services
      const { data: vServices } = await supabase.from('services').select('*').eq('vendor_id', item.vendor_id).eq('is_active', true);
      setVendorServices(vServices || []);

      // 3. Store Items (POS)
      const { data: vStore } = await supabase.from('pos_items').select('*').eq('vendor_id', item.vendor_id);
      setStoreItems(vStore || []);

      // 4. Partner Services (Cross-sell from other vendors)
      const { data: pServices } = await supabase.from('services')
        .select('*, vendor:vendor_id(business_name)')
        .neq('vendor_id', item.vendor_id)
        .eq('is_active', true)
        .limit(4);
      setPartnerServices(pServices as any || []);
    }
  }, [item.id, item.vendor_id, isHall]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  // Calculations
  const basePrice = isHall ? Number(hall!.price_per_night) : Number(service!.price);
  
  // Calculate Add-ons Total
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
  const vat = subTotal * VAT_RATE;
  const total = subTotal + vat;

  // Handlers
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
        setStep(2); // Go to Add-ons
    } else if (step === 2) {
        setStep(3); // Go to Guest Info
    } else if (step === 3) {
        if (!guestName || !guestPhone) {
            toast({ title: 'تنبيه', description: 'يرجى إكمال البيانات الشخصية.', variant: 'destructive' });
            return;
        }
        setStep(4); // Go to Payment/Confirm
    }
  };

  const toggleExtra = (id: string) => {
      setSelectedExtras(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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

      // Prepare Notes with Extras
      const allExtras = [...vendorServices, ...storeItems, ...partnerServices];
      const selectedItemsDetails = selectedExtras.map(id => {
          const item = allExtras.find(e => e.id === id);
          return item ? `${item.name} (${item.price} ر.س)` : '';
      }).filter(Boolean).join(', ');

      const bookingNotes = `طريقة الدفع: ${isPaid ? 'بطاقة ائتمان' : 'تحويل بنكي/آجل'}. 
      ${selectedItemsDetails ? `الإضافات: ${selectedItemsDetails}` : ''}`;

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
        payment_status: isPaid ? 'paid' : 'unpaid',
        guest_name: guestName,
        guest_phone: guestPhone,
        status: isPaid ? 'confirmed' : 'pending',
        notes: bookingNotes
      }]);

      if (bookingError) throw bookingError;

      toast({ 
        title: 'تم إرسال الطلب بنجاح', 
        description: isPaid ? 'تم تأكيد حجزك وإرسال التفاصيل.' : 'سيقوم فريق القاعة بالتواصل معك.', 
        variant: 'success' 
      });
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
         
         {/* 1. Natural Boxed Slider */}
         <div className="relative w-full aspect-[16/9] md:h-[500px] md:aspect-auto rounded-[2.5rem] overflow-hidden bg-black group mb-10 shadow-2xl">
            {allImages.map((img, i) => (
               <div 
                  key={i} 
                  className={`absolute inset-0 transition-opacity duration-1000 ${i === activeSlide ? 'opacity-100' : 'opacity-0'}`}
               >
                  <img src={img} className="w-full h-full object-cover" alt="Venue" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
               </div>
            ))}
            
            <div className="absolute inset-0 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={() => setActiveSlide((prev) => (prev - 1 + allImages.length) % allImages.length)} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-black flex items-center justify-center transition-all">
                  <ChevronRight className="w-6 h-6" />
               </button>
               <button onClick={() => setActiveSlide((prev) => (prev + 1) % allImages.length)} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-black flex items-center justify-center transition-all">
                  <ChevronLeft className="w-6 h-6" />
               </button>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
               {allImages.map((_, i) => (
                  <button 
                     key={i} 
                     onClick={() => setActiveSlide(i)} 
                     className={`h-1.5 rounded-full transition-all duration-300 ${i === activeSlide ? 'w-8 bg-white' : 'w-2 bg-white/40'}`} 
                  />
               ))}
            </div>
         </div>

         <div className="grid lg:grid-cols-12 gap-12">
            
            {/* RIGHT: Content */}
            <div className="lg:col-span-8 space-y-8">
               <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-gray-200/50 space-y-8 border border-gray-100">
                  <div className="flex flex-wrap items-center gap-4">
                     <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs gap-1"><Sparkles className="w-3 h-3" /> موصى به</Badge>
                     {isHall && <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{hall?.capacity} ضيف</span>}
                     <div className="flex items-center gap-1 text-yellow-500 text-sm font-bold"><Star className="w-4 h-4 fill-current" /> 4.9 (120 تقييم)</div>
                  </div>

                  <div>
                     <div className="flex justify-between items-start">
                        <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">{item.name}</h2>
                        <div className="flex gap-2">
                           <Button variant="ghost" className="rounded-full w-10 h-10 p-0 hover:bg-gray-100"><Share2 className="w-5 h-5 text-gray-400" /></Button>
                           <Button variant="ghost" className="rounded-full w-10 h-10 p-0 hover:bg-gray-100"><Heart className="w-5 h-5 text-gray-400" /></Button>
                        </div>
                     </div>
                     <p className="text-xs text-gray-500 font-bold flex items-center gap-1 mb-6"><MapPin className="w-3 h-3" /> {isHall ? hall?.city : 'خدمة'}</p>
                     
                     <p className="text-gray-600 leading-loose text-lg font-medium">
                        {item.description || "استمتع بتجربة فريدة ومميزة. نوفر لكم أفضل الخدمات لضمان نجاح مناسبتكم بأعلى معايير الجودة والفخامة."}
                     </p>
                  </div>

                  <div className="border-t border-gray-100 pt-8">
                     <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-gray-900"><CheckCircle2 className="w-6 h-6 text-primary" /> المميزات والخدمات</h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(isHall ? (hall?.amenities?.length ? hall.amenities : HALL_AMENITIES) : ['فريق احترافي', 'معدات حديثة']).map((amenity, i) => (
                           <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-700 hover:border-primary/30 transition-colors">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span> {amenity}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Services & Store Section */}
               {isHall && (
                   <>
                       {/* 1. Host Services */}
                       {vendorServices.length > 0 && (
                           <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-gray-200/50 space-y-6 border border-gray-100">
                               <div className="flex justify-between items-center">
                                   <h3 className="text-xl font-black flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> خدمات إضافية من المضيف</h3>
                                   <span className="text-xs font-bold text-gray-400">يمكنك إضافتها عند الحجز</span>
                               </div>
                               <div className="grid sm:grid-cols-2 gap-4">
                                   {vendorServices.map(svc => (
                                       <div key={svc.id} className="flex items-center gap-4 p-4 rounded-3xl border border-gray-100 hover:shadow-lg hover:border-primary/20 transition-all bg-gray-50/50">
                                           {svc.image_url ? (
                                               <img src={svc.image_url} className="w-16 h-16 rounded-2xl object-cover" alt={svc.name} />
                                           ) : (
                                               <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-primary"><Briefcase className="w-6 h-6" /></div>
                                           )}
                                           <div>
                                               <h4 className="font-bold text-gray-900">{svc.name}</h4>
                                               <PriceTag amount={svc.price} className="text-primary text-sm font-black" />
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       )}

                       {/* 2. Store Products */}
                       {storeItems.length > 0 && (
                           <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-gray-200/50 space-y-6 border border-gray-100">
                               <div className="flex justify-between items-center">
                                   <h3 className="text-xl font-black flex items-center gap-2"><Store className="w-5 h-5 text-primary" /> منتجات المتجر</h3>
                                   <span className="text-xs font-bold text-gray-400">منتجات مميزة للمناسبة</span>
                               </div>
                               <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                   {storeItems.map(item => (
                                       <div key={item.id} className="min-w-[160px] p-4 rounded-3xl border border-gray-100 hover:shadow-lg transition-all bg-white text-center space-y-2">
                                           <div className="w-12 h-12 mx-auto bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                                               <Package className="w-5 h-5" />
                                           </div>
                                           <h4 className="font-bold text-sm text-gray-900 truncate">{item.name}</h4>
                                           <PriceTag amount={item.price} className="text-primary text-sm font-black justify-center" />
                                       </div>
                                   ))}
                               </div>
                           </div>
                       )}

                       {/* 3. Partner Services */}
                       {partnerServices.length > 0 && (
                           <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-gray-200/50 space-y-6 border border-gray-100">
                               <div className="flex justify-between items-center">
                                   <h3 className="text-xl font-black flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-600" /> خدمات شركاء النجاح</h3>
                                   <Badge className="bg-blue-50 text-blue-600 border-blue-100">موصى به</Badge>
                               </div>
                               <div className="grid sm:grid-cols-2 gap-4">
                                   {partnerServices.map(svc => (
                                       <div key={svc.id} className="p-4 rounded-3xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all bg-white group cursor-pointer">
                                           <div className="flex justify-between items-start mb-2">
                                               <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{svc.category}</span>
                                               <span className="text-[10px] font-bold text-blue-600">{svc.vendor?.business_name}</span>
                                           </div>
                                           <h4 className="font-bold text-gray-900 mb-1">{svc.name}</h4>
                                           <PriceTag amount={svc.price} className="text-gray-900 text-sm font-black" />
                                       </div>
                                   ))}
                               </div>
                           </div>
                       )}
                   </>
               )}

               {/* Map Section */}
               <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
                  <h3 className="text-xl font-black mb-6 text-gray-900">الموقع على الخريطة</h3>
                  <div className="aspect-video bg-gray-100 rounded-[2rem] border border-gray-200 flex items-center justify-center relative overflow-hidden group cursor-pointer">
                     <MapPin className="w-12 h-12 text-gray-400 group-hover:scale-110 transition-transform" />
                     <span className="mt-2 text-sm text-gray-500 font-bold absolute bottom-6">اضغط لفتح الخريطة</span>
                  </div>
               </div>
            </div>

            {/* LEFT: Booking Sidebar */}
            <div className="lg:col-span-4 relative">
               <div className="sticky top-24 space-y-6">
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xl shadow-gray-200/50 space-y-6 relative overflow-hidden">
                     
                     <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                        <div className="text-right">
                           <p className="text-xs font-bold text-gray-400 mb-1">السعر يبدأ من</p>
                           <PriceTag amount={basePrice} className="text-3xl font-bold text-primary" />
                        </div>
                        <div className="text-left">
                           <span className="text-xs font-bold text-gray-400">/{isHall ? 'الليلة' : 'الخدمة'}</span>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 border border-green-100">
                           <ShieldCheck className="w-5 h-5" /> ضمان أفضل سعر
                        </div>
                        
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-red-100 transition-colors duration-500">
                           <Eye className="w-4 h-4" />
                           <span>هناك {viewersCount} شخص يشاهد هذه القاعة الآن</span>
                        </div>
                     </div>

                     <Button onClick={() => { setStep(1); setIsWizardOpen(true); }} className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all bg-primary text-white">
                        احجز الآن
                     </Button>
                     
                     <div className="flex justify-center items-center gap-2 text-[10px] text-gray-400 font-bold">
                        <User className="w-3 h-3" /> أكثر من 50 شخص حجزوا هذا المكان
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </main>

      {/* Booking Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
              
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                 <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm">{step}</span>
                    <span className="text-sm font-bold text-gray-500">
                        {step === 1 ? 'الموعد' : step === 2 ? 'الإضافات' : step === 3 ? 'البيانات' : 'الدفع'}
                    </span>
                 </div>
                 <button onClick={() => setIsWizardOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                 {/* Step 1: Date & Time */}
                 {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center">
                            <h3 className="text-xl font-black mb-2">متى مناسبتك؟</h3>
                            <p className="text-sm text-gray-500 font-medium">اختر التاريخ والوقت المناسب</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                            <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الحجز</label>
                            <input
                                type="date"
                                value={bookingDate ? format(bookingDate, 'yyyy-MM-dd') : ''}
                                onChange={(e) => setBookingDate(e.target.value ? parseISO(e.target.value) : undefined)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 font-bold text-gray-900 focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="وقت الدخول" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-12 rounded-xl text-center font-bold" />
                            <Input label="وقت الخروج" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-12 rounded-xl text-center font-bold" />
                        </div>
                    </div>
                 )}

                 {/* Step 2: Add-ons (Services & Store) */}
                 {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center">
                            <h3 className="text-xl font-black mb-2">إضافات للحجز</h3>
                            <p className="text-sm text-gray-500 font-medium">أضف خدمات أو منتجات لطلبك (اختياري)</p>
                        </div>
                        
                        <div className="space-y-6">
                            {/* Vendor Services */}
                            {vendorServices.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">خدمات المضيف</h4>
                                    {vendorServices.map(s => (
                                        <div 
                                            key={s.id} 
                                            onClick={() => toggleExtra(s.id)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${selectedExtras.includes(s.id) ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedExtras.includes(s.id) ? 'border-primary bg-primary text-white' : 'border-gray-300'}`}>
                                                    {selectedExtras.includes(s.id) && <CheckCircle2 className="w-3 h-3" />}
                                                </div>
                                                <span className="font-bold text-sm">{s.name}</span>
                                            </div>
                                            <PriceTag amount={s.price} className="text-sm font-black" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Store Items */}
                            {storeItems.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">منتجات المتجر</h4>
                                    {storeItems.map(item => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => toggleExtra(item.id)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${selectedExtras.includes(item.id) ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedExtras.includes(item.id) ? 'border-primary bg-primary text-white' : 'border-gray-300'}`}>
                                                    {selectedExtras.includes(item.id) && <CheckCircle2 className="w-3 h-3" />}
                                                </div>
                                                <span className="font-bold text-sm">{item.name}</span>
                                            </div>
                                            <PriceTag amount={item.price} className="text-sm font-black" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Partner Services */}
                            {partnerServices.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest px-2">خدمات شركاء (خارجية)</h4>
                                    {partnerServices.map(s => (
                                        <div 
                                            key={s.id} 
                                            onClick={() => toggleExtra(s.id)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${selectedExtras.includes(s.id) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedExtras.includes(s.id) ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>
                                                    {selectedExtras.includes(s.id) && <CheckCircle2 className="w-3 h-3" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{s.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold">{s.vendor?.business_name}</p>
                                                </div>
                                            </div>
                                            <PriceTag amount={s.price} className="text-sm font-black" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                 )}

                 {/* Step 3: Guest Info */}
                 {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center">
                            <h3 className="text-xl font-black mb-2">بيانات التواصل</h3>
                            <p className="text-sm text-gray-500 font-medium">لمن سيتم إصدار الحجز؟</p>
                        </div>
                        <div className="space-y-4">
                            <Input label="الاسم الكامل" value={guestName} onChange={e => setGuestName(e.target.value)} className="h-14 rounded-2xl font-bold" icon={<User className="w-4 h-4" />} />
                            <Input label="رقم الجوال" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="h-14 rounded-2xl font-bold" icon={<Phone className="w-4 h-4" />} />
                        </div>
                    </div>
                 )}

                 {/* Step 4: Confirm & Pay */}
                 {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center">
                            <h3 className="text-xl font-black mb-2">مراجعة وتأكيد</h3>
                            <p className="text-sm text-gray-500 font-medium">الخطوة الأخيرة لإتمام الحجز</p>
                        </div>
                        
                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                            <div className="flex justify-between text-sm font-bold text-gray-500">
                                <span>التاريخ</span>
                                <span className="text-gray-900">{bookingDate ? format(bookingDate, 'yyyy-MM-dd') : ''}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-gray-500">
                                <span>سعر القاعة</span>
                                <PriceTag amount={basePrice} />
                            </div>
                            {extrasTotal > 0 && (
                                <div className="flex justify-between text-sm font-bold text-blue-600">
                                    <span>الإضافات ({selectedExtras.length})</span>
                                    <PriceTag amount={extrasTotal} />
                                </div>
                            )}
                            <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                                <span>الإجمالي</span>
                                <PriceTag amount={total} className="text-primary font-black" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setPaymentMethod('credit_card')} className={`p-4 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-2 ${paymentMethod === 'credit_card' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400'}`}>
                                <CreditCard className="w-6 h-6" /> دفع إلكتروني
                            </button>
                            <button onClick={() => setPaymentMethod('pay_later')} className={`p-4 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-2 ${paymentMethod === 'pay_later' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400'}`}>
                                <Wallet className="w-6 h-6" /> تحويل / آجل
                            </button>
                        </div>

                        {paymentMethod === 'credit_card' && (
                            <div className="space-y-3 animate-in slide-in-from-top-2">
                                <Input placeholder="رقم البطاقة" value={cardData.number} onChange={e => setCardData({...cardData, number: e.target.value})} className="text-center font-mono h-12 rounded-xl" />
                                <div className="grid grid-cols-2 gap-3">
                                    <Input placeholder="MM/YY" value={cardData.expiry} onChange={e => setCardData({...cardData, expiry: e.target.value})} className="text-center font-mono h-12 rounded-xl" />
                                    <Input placeholder="CVC" value={cardData.cvc} onChange={e => setCardData({...cardData, cvc: e.target.value})} className="text-center font-mono h-12 rounded-xl" />
                                </div>
                            </div>
                        )}
                    </div>
                 )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                 {step > 1 && (
                    <Button variant="outline" onClick={() => setStep(step - 1)} className="h-14 px-6 rounded-2xl font-bold">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                 )}
                 <Button onClick={step < 4 ? handleNextStep : handleBookingSubmission} disabled={isBooking} className="flex-1 h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">
                    {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : (step < 4 ? 'التالي' : 'تأكيد الحجز')}
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
