
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Hall, UserProfile, Service, VAT_RATE, HALL_AMENITIES, HallAddon } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PriceTag } from '../ui/PriceTag';
import { Badge } from '../ui/Badge';
import { DatePicker } from '../ui/DatePicker';
import { 
  X, MapPin, Star, Share2, 
  Calendar as CalendarIcon, CheckCircle2, 
  Loader2, Sparkles, ChevronRight, ChevronLeft,
  ShieldCheck, ArrowLeft, User, Phone, ArrowRight, Heart, Check
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { format, parseISO, startOfDay, isSameDay, isBefore } from 'date-fns';

interface HallDetailPopupProps {
  item: (Hall | Service) & { vendor?: UserProfile };
  type: 'hall' | 'service';
  user: UserProfile | null;
  onClose: () => void;
}

export const HallDetailPopup: React.FC<HallDetailPopupProps> = ({ item, type, user, onClose }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isBooking, setIsBooking] = useState(false);

  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [hallAddons, setHallAddons] = useState<HallAddon[]>([]);
  
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [guestName, setGuestName] = useState(user?.full_name || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone_number || '');
  const [selectedAddons, setSelectedAddons] = useState<HallAddon[]>([]);

  const { toast } = useToast();
  const isHall = type === 'hall';
  const hall = isHall ? (item as Hall) : null;
  const service = !isHall ? (item as Service) : null;
  
  const allImages = (item as any).images && (item as any).images.length > 0 
    ? (item as any).images 
    : [(item as any).image_url].filter(Boolean);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 50);
  };

  const fetchDetails = useCallback(async () => {
    if (isHall) {
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('booking_date')
        .eq('hall_id', item.id)
        .neq('status', 'cancelled');
        
      if (bookingsData) {
        const dates = bookingsData.map(b => parseISO(b.booking_date));
        setBlockedDates(dates);
      }

      if ((item as Hall).addons) {
          setHallAddons((item as Hall).addons || []);
      }
    }
  }, [item.id, isHall, item]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const basePrice = isHall ? Number(hall!.price_per_night) : Number(service!.price);
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + Number(a.price), 0);
  const total = basePrice + addonsTotal;

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
    setIsBooking(true);
    try {
      const dateStr = bookingDate ? format(bookingDate, 'yyyy-MM-dd') : '';

      const { error: bookingError } = await supabase.from('bookings').insert([{
        hall_id: isHall ? hall!.id : null,
        service_id: !isHall ? service!.id : null,
        user_id: user?.id || null, 
        vendor_id: item.vendor_id,
        booking_date: dateStr,
        total_amount: total,
        paid_amount: 0,
        vat_amount: total * VAT_RATE,
        payment_status: 'unpaid',
        guest_name: guestName,
        guest_phone: guestPhone,
        status: 'pending',
        items: selectedAddons.map(addon => ({
            name: addon.name,
            price: addon.price,
            qty: 1,
            type: 'addon'
        })),
        notes: `طلب حجز جديد`
      }]);

      if (bookingError) throw bookingError;

      await supabase.from('notifications').insert([{
        user_id: item.vendor_id,
        title: 'طلب حجز جديد 📅',
        message: `طلب من ${guestName} لـ ${item.name} بتاريخ ${dateStr}`,
        type: 'booking_new',
        link: 'hall_bookings'
      }]);

      toast({ 
        title: 'تم إرسال الطلب بنجاح', 
        description: 'سيقوم فريق القاعة بمراجعة الطلب والتواصل معك.', 
        variant: 'success' 
      });
      setIsWizardOpen(false);
      onClose(); 
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
    <div className="fixed inset-0 z-[200] bg-background flex flex-col animate-in slide-in-from-bottom-4 duration-300">
      
      <header className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100 py-3' : 'bg-transparent py-5'}`}>
         <div className="max-w-7xl mx-auto px-6 lg:px-20 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm text-gray-700">
                  <ArrowRight className="w-5 h-5" />
               </button>
               {isScrolled && <h1 className="text-lg font-black text-gray-900 animate-in fade-in">{item.name}</h1>}
            </div>
            <div className="flex items-center gap-3">
               <Button variant="outline" size="icon" className="rounded-full w-10 h-10 bg-white border-gray-200"><Share2 className="w-4 h-4" /></Button>
               <Button variant="outline" size="icon" className="rounded-full w-10 h-10 bg-white border-gray-200"><Heart className="w-4 h-4" /></Button>
            </div>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
         <div className="max-w-7xl mx-auto px-6 lg:px-20 pb-20">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 h-[400px] md:h-[500px]">
               <div className="md:col-span-2 md:row-span-2 relative rounded-[2.5rem] overflow-hidden group">
                  <img src={allImages[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Main View" />
               </div>
               <div className="hidden md:block relative rounded-[2.5rem] overflow-hidden group">
                  <img src={allImages[1] || allImages[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Side View 1" />
               </div>
               <div className="hidden md:block relative rounded-[2.5rem] overflow-hidden group">
                  <img src={allImages[2] || allImages[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Side View 2" />
               </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-12">
               <div className="lg:col-span-8 space-y-10 text-right">
                  <div className="space-y-4">
                     <div className="flex items-center gap-3">
                        <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs">موثق</Badge>
                        <div className="flex items-center gap-1 text-yellow-500 text-sm font-bold"><Star className="w-4 h-4 fill-current" /> 4.9 (120 تقييم)</div>
                     </div>
                     <h1 className="text-4xl font-black text-gray-900 leading-tight">{item.name}</h1>
                     <p className="text-gray-500 font-bold flex items-center gap-2 text-sm"><MapPin className="w-4 h-4" /> {isHall ? `${hall?.city}, المملكة العربية السعودية` : 'متوفر في جميع المناطق'}</p>
                  </div>

                  <div className="border-t border-gray-100 pt-8">
                     <h3 className="text-xl font-black mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> عن المكان</h3>
                     <p className="text-gray-600 leading-loose text-base font-medium">
                        {item.description || "استمتع بتجربة فريدة في قاعتنا المجهزة بأحدث التقنيات وأرقى الأثاث."}
                     </p>
                  </div>

                  <div className="border-t border-gray-100 pt-8">
                     <h3 className="text-xl font-black mb-6">المميزات والخدمات</h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(isHall ? (hall?.amenities?.length ? hall.amenities : HALL_AMENITIES) : ['فريق احترافي', 'معدات حديثة']).map((amenity, i) => (
                           <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-700 hover:border-primary/30 transition-colors">
                              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> {amenity}
                           </div>
                        ))}
                     </div>
                  </div>

                  {isHall && hallAddons.length > 0 && (
                    <div className="border-t border-gray-100 pt-8">
                        <h3 className="text-xl font-black mb-6 text-gray-900 flex items-center gap-2">
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
                                        </div>
                                    </div>
                                    <PriceTag amount={addon.price} className="text-sm font-black text-primary" />
                                </div>
                            ))}
                        </div>
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-8">
                     <h3 className="text-xl font-black mb-6">الموقع</h3>
                     <div className="aspect-video bg-gray-100 rounded-[2rem] border border-gray-200 flex items-center justify-center relative overflow-hidden">
                        <MapPin className="w-10 h-10 text-gray-300" />
                        <span className="mt-2 text-xs text-gray-400 font-bold absolute bottom-4">الخريطة التفاعلية</span>
                     </div>
                  </div>
               </div>

               <div className="lg:col-span-4 relative">
                  <div className="sticky top-28 bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 space-y-6">
                     <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                        <div className="text-right">
                           <p className="text-xs font-bold text-gray-400 mb-1">الإجمالي التقريبي</p>
                           <PriceTag amount={total} className="text-3xl font-black text-primary" />
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-green-100">
                           <CheckCircle2 className="w-4 h-4" /> متاح للحجز
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center space-y-1">
                           <p className="text-xs font-bold text-gray-400">سياسة الإلغاء</p>
                           <p className="text-sm font-black text-gray-800">إلغاء مجاني قبل 48 ساعة</p>
                        </div>
                     </div>

                     <Button onClick={() => { setStep(1); setIsWizardOpen(true); }} className="w-full h-16 rounded-[2rem] text-lg font-black shadow-2xl shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all">
                        احجز الآن
                     </Button>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {isWizardOpen && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
              
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                 <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm">{step}</span>
                    <span className="text-sm font-bold text-gray-500">
                        {step === 1 ? 'الموعد' : step === 2 ? 'البيانات' : 'تأكيد'}
                    </span>
                 </div>
                 <button onClick={() => setIsWizardOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                 {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center">
                            <h3 className="text-xl font-black mb-2">متى مناسبتك؟</h3>
                            <p className="text-sm text-gray-500 font-medium">اختر اليوم المناسب لحجز {item.name}</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                            <DatePicker date={bookingDate} setDate={setBookingDate} disabledDates={blockedDates} className="w-full" placeholder="اختر يوم المناسبة" />
                        </div>
                    </div>
                 )}

                 {step === 2 && (
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

                 {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center">
                            <h3 className="text-xl font-black mb-2">مراجعة وتأكيد</h3>
                            <p className="text-sm text-gray-500 font-medium">إرسال الطلب للموافقة</p>
                        </div>
                        
                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                            <div className="flex justify-between text-sm font-bold text-gray-500">
                                <span>التاريخ</span>
                                <span className="text-gray-900">{bookingDate ? format(bookingDate, 'yyyy-MM-dd') : ''}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-gray-500">
                                <span>الإجمالي المقدر</span>
                                <PriceTag amount={total} className="text-primary font-black" />
                            </div>
                        </div>
                        <p className="text-[10px] text-center text-gray-400 font-bold">لن يتم الدفع الآن. سيتم التواصل معك لتأكيد الحجز والدفع.</p>
                    </div>
                 )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                 {step > 1 && (
                    <Button variant="outline" onClick={() => setStep(step - 1)} className="h-14 px-6 rounded-2xl font-bold">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                 )}
                 <Button onClick={step < 3 ? handleNextStep : handleBookingSubmission} disabled={isBooking} className="flex-1 h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">
                    {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : (step < 3 ? 'التالي' : 'إرسال الطلب')}
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
