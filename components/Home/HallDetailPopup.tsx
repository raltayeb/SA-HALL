
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Hall, UserProfile, Service, VAT_RATE } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PriceTag } from '../ui/PriceTag';
import { 
  X, MapPin, Users, Star, Building2, Share2, 
  Heart, Calendar, CheckCircle2, MessageSquare, 
  Mail, Phone, Info, Loader2, ArrowRight, ArrowLeft,
  Sparkles, Check, ChevronRight, ChevronLeft,
  Plus, Camera, Coffee, Utensils, Music, ShieldCheck,
  Compass, Layout, Package, Timer, Zap, Diamond
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';

interface HallDetailPopupProps {
  item: (Hall | Service) & { vendor?: UserProfile };
  type: 'hall' | 'service';
  user: UserProfile | null;
  onClose: () => void;
}

export const HallDetailPopup: React.FC<HallDetailPopupProps> = ({ item, type, user, onClose }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'amenities' | 'reviews'>('overview');
  const [vendorServices, setVendorServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [bookingDate, setBookingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [guestCount, setGuestCount] = useState('100 - 300');
  const [guestName, setGuestName] = useState(user?.full_name || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone_number || '');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const { toast } = useToast();
  const isHall = type === 'hall';
  const hall = isHall ? (item as Hall) : null;
  const service = !isHall ? (item as Service) : null;
  
  const allImages = (item as any).images && (item as any).images.length > 0 
    ? (item as any).images 
    : [(item as any).image_url].filter(Boolean);

  const fetchVendorAddons = async () => {
    if (isHall) {
      const { data } = await supabase.from('services').select('*').eq('vendor_id', item.vendor_id).eq('is_active', true);
      setVendorServices(data || []);
    }
  };

  const checkAvailability = useCallback(async () => {
    if (!bookingDate || !isHall) return;
    setIsChecking(true);
    try {
      const [bookings, blocks] = await Promise.all([
        supabase.from('bookings').select('id').eq('hall_id', item.id).eq('booking_date', bookingDate).neq('status', 'cancelled').maybeSingle(),
        supabase.from('availability_blocks').select('id').eq('hall_id', item.id).eq('block_date', bookingDate).maybeSingle()
      ]);
      setIsAvailable(!bookings.data && !blocks.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsChecking(false);
    }
  }, [item.id, bookingDate, isHall]);

  useEffect(() => { fetchVendorAddons(); }, [item.vendor_id, isHall]);

  useEffect(() => {
    if (isBookingModalOpen && isHall) {
        const timer = setTimeout(checkAvailability, 500);
        return () => clearTimeout(timer);
    }
  }, [bookingDate, checkAvailability, isBookingModalOpen, isHall]);

  const calculateTotal = () => {
    const basePrice = isHall ? Number(hall!.price_per_night) : Number(service!.price);
    const addonsPrice = vendorServices
      .filter(s => selectedServices.includes(s.id))
      .reduce((sum, s) => sum + Number(s.price), 0);
    const subtotal = basePrice + addonsPrice;
    const vat = subtotal * VAT_RATE;
    return { subtotal, vat, total: subtotal + vat };
  };

  const handleBooking = async () => {
    if (!guestName || !guestPhone) {
      toast({ title: 'تنبيه', description: 'يرجى إدخال الاسم ورقم الهاتف.', variant: 'destructive' });
      return;
    }
    setIsBooking(true);
    const { total, vat } = calculateTotal();
    try {
      const { data: bookingData, error } = await supabase.from('bookings').insert([{
        hall_id: isHall ? hall!.id : null,
        service_id: isHall ? null : service!.id,
        user_id: user?.id || '00000000-0000-0000-0000-000000000000',
        vendor_id: item.vendor_id,
        booking_date: bookingDate,
        total_amount: total,
        vat_amount: vat,
        status: 'pending',
        notes: `حجز ${isHall ? 'قاعة' : 'خدمة'} | العميل: ${guestName}`
      }]).select().single();

      if (error) throw error;

      await supabase.from('notifications').insert([{
        user_id: item.vendor_id,
        title: 'طلب حجز جديد 🔔',
        message: `وصلك طلب حجز جديد لـ ${item.name} من قبل ${guestName}.`,
        type: 'booking_new',
        link: 'hall_bookings',
        is_read: false
      }]);

      toast({ title: 'تم إرسال الطلب', description: 'سيتواصل معك فريقنا قريباً لتأكيد الحجز.', variant: 'success' });
      setIsBookingModalOpen(false);
      onClose();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { setIsBooking(false); }
  };

  const { total, subtotal, vat } = calculateTotal();

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col overflow-hidden animate-in fade-in duration-700 font-sans text-foreground selection:bg-primary/20 selection:text-primary">
      <header className="px-6 h-20 flex justify-between items-center shrink-0 border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-50">
         <div className="flex items-center gap-6">
            <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-card border border-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-lg">
               <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
               <Diamond className="w-6 h-6 text-primary fill-current" />
               <h4 className="text-4xl font-ruqaa text-primary leading-none mt-1">قاعه</h4>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="rounded-2xl w-12 h-12 border-white/5"><Share2 className="w-5 h-5 text-muted-foreground" /></Button>
            <Button onClick={() => setIsBookingModalOpen(true)} className="rounded-2xl px-10 h-12 font-black shadow-xl shadow-primary/40 text-lg">احجز الآن</Button>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <section className="px-6 lg:px-20 pt-10">
            <div className="max-w-7xl mx-auto">
               <div className="relative aspect-[21/9] rounded-[3rem] overflow-hidden bg-card shadow-2xl group border border-white/5">
                  <img src={allImages[activeImage]} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-80" alt="Hero View" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60"></div>
                  <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-all duration-500">
                     <button onClick={() => setActiveImage(prev => (prev + 1) % allImages.length)} className="w-14 h-14 rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-white shadow-xl"><ChevronLeft className="w-7 h-7" /></button>
                     <button onClick={() => setActiveImage(prev => (prev - 1 + allImages.length) % allImages.length)} className="w-14 h-14 rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-white shadow-xl"><ChevronRight className="w-7 h-7" /></button>
                  </div>
                  <div className="absolute bottom-8 inset-x-10 flex gap-3 overflow-x-auto no-scrollbar pb-2">
                     {allImages.map((img, idx) => (
                        <button key={idx} onClick={() => setActiveImage(idx)} className={`w-24 h-16 rounded-xl border-2 transition-all shrink-0 overflow-hidden ${activeImage === idx ? 'border-primary scale-105 shadow-xl' : 'border-white/10 opacity-50 hover:opacity-100'}`}>
                           <img src={img} className="w-full h-full object-cover" />
                        </button>
                     ))}
                  </div>
               </div>
            </div>
        </section>

        <div className="max-w-7xl mx-auto px-6 lg:px-20 py-20">
          <div className="grid lg:grid-cols-12 gap-20">
            <div className="lg:col-span-8 space-y-16 text-start">
              <div className="space-y-10">
                <div className="flex flex-wrap justify-between items-start gap-8 border-b border-white/5 pb-12">
                   <div className="space-y-6">
                     <div className="flex flex-wrap items-center gap-4">
                        <span className="bg-primary/10 text-primary px-5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] border border-primary/20 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Elite Selection</span>
                        <div className="flex items-center gap-2 text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20"><Star className="w-4 h-4 fill-current" /><span className="text-xs font-black tracking-widest uppercase">4.9 Excellence</span></div>
                     </div>
                     <h1 className="text-5xl md:text-6xl font-black text-foreground tracking-tighter leading-none">{item.name}</h1>
                     <div className="flex flex-wrap items-center gap-8 text-xs font-black text-muted-foreground uppercase tracking-widest">
                        {isHall && <span className="flex items-center gap-3 bg-card border border-white/5 px-4 py-2 rounded-xl"><Users className="w-4 h-4 text-primary" /> {hall?.capacity} ضيف كحد أقصى</span>}
                        <span className="flex items-center gap-3 bg-card border border-white/5 px-4 py-2 rounded-xl"><MapPin className="w-4 h-4 text-primary" /> {isHall ? hall?.city : item.vendor?.business_name}</span>
                     </div>
                   </div>
                   <div className="text-start bg-card p-6 rounded-[2rem] border border-white/5 shadow-xl">
                      <PriceTag amount={isHall ? hall!.price_per_night : service!.price} className="text-5xl text-foreground" />
                      <span className="text-[11px] font-black text-primary uppercase tracking-[0.3em] block mt-2 ps-1">{isHall ? 'Per Event Night' : 'Service Fee'}</span>
                   </div>
                </div>

                <div className="flex gap-12 border-b border-white/5 overflow-x-auto no-scrollbar">
                   {['overview', 'amenities', 'reviews'].map((tab) => (
                     <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-6 text-[11px] font-black uppercase tracking-[0.4em] transition-all relative ${activeTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                        {tab === 'overview' ? 'التفاصيل' : tab === 'amenities' ? 'المميزات' : 'المراجعات'}
                        {activeTab === tab && <div className="absolute bottom-0 inset-x-0 h-1 bg-primary rounded-full" />}
                     </button>
                   ))}
                </div>

                <div className="pt-6">
                   {activeTab === 'overview' && (
                     <div className="space-y-10">
                        <p className="text-xl text-muted-foreground leading-relaxed font-bold">{item.description || "نقدم لكم تجربة استثنائية في عالم المناسبات الفاخرة، حيث تجتمع الدقة في التنفيذ مع روعة التصميم لخلق ذكريات لا تُنسى. تتميز القاعة بأنظمة إضاءة وصوت متطورة وفريق عمل متفاني في خدمتك."}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                           {[
                             { icon: Timer, label: 'توفر 24/7', val: 'متاح دائماً' },
                             { icon: ShieldCheck, label: 'حماية وأمان', val: 'بأعلى المعايير' },
                             { icon: Building2, label: 'سعة كبرى', val: 'حتى 1000+' },
                             { icon: Compass, label: 'موقع مميز', val: 'سهولة الوصول' }
                           ].map((feat, i) => (
                             <div key={i} className="bg-card border border-white/5 p-5 rounded-2xl flex flex-col items-center gap-3 text-center shadow-lg hover:border-primary/20 transition-all">
                                <feat.icon className="w-6 h-6 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{feat.label}</span>
                                <p className="text-xs font-black">{feat.val}</p>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 relative">
               <div className="sticky top-32 space-y-8">
                  <div className="p-10 bg-card border border-white/10 rounded-[3rem] shadow-2xl space-y-10 ring-1 ring-white/5">
                     <div className="space-y-6 text-start">
                        <div className="flex justify-between items-center border-b border-white/5 pb-6">
                           <div className="space-y-2">
                              <PriceTag amount={total} className="text-4xl text-foreground" />
                              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">إجمالي التقدير الأولي</p>
                           </div>
                           <div className="bg-primary/20 text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border border-primary/20">متاح الآن</div>
                        </div>
                        <div className="space-y-4 text-xs font-bold text-muted-foreground">
                           <div className="flex justify-between"><span>القيمة الصافية</span> <PriceTag amount={subtotal} className="text-foreground" iconSize={14} /></div>
                           <div className="flex justify-between"><span>الضريبة (15%)</span> <PriceTag amount={vat} className="text-foreground" iconSize={14} /></div>
                        </div>
                     </div>
                     
                     <div className="space-y-4">
                        <Button onClick={() => setIsBookingModalOpen(true)} className="w-full h-16 rounded-2xl font-black text-xl shadow-2xl shadow-primary/40 group">تأكيد طلب الحجز <Zap className="w-5 h-5 ms-3 fill-current" /></Button>
                        <p className="text-[10px] text-center text-muted-foreground/60 font-black px-4 uppercase leading-relaxed tracking-wider">لا يلزم الدفع الفوري. سيقوم فريق الكونسيرج بالتواصل معك خلال ساعتين لتأكيد التفاصيل.</p>
                     </div>

                     <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl space-y-3">
                        <div className="flex items-center gap-3 flex-row-reverse text-right">
                           <ShieldCheck className="w-5 h-5 text-primary" />
                           <h5 className="text-xs font-black text-primary">ضمان الرفاهية الملكية</h5>
                        </div>
                        <p className="text-[10px] font-bold text-primary/60 text-right">نضمن لك أفضل جودة وخدمة فندقية متكاملة لمناسبتك الخاصة.</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[300] bg-background/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
           <div className="w-full max-w-xl bg-card rounded-[3rem] shadow-2xl relative border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 ring-1 ring-white/5">
              <button onClick={() => setIsBookingModalOpen(false)} className="absolute top-10 end-10 p-4 bg-muted hover:bg-primary hover:text-white rounded-2xl transition-all z-50"><X className="w-6 h-6" /></button>
              <div className="p-16 space-y-12 text-start">
                 <div className="space-y-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary border border-primary/20">
                       <Calendar className="w-10 h-10" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-black text-foreground tracking-tighter uppercase leading-none">تفاصيل الحجز</h2>
                      <p className="text-muted-foreground font-bold text-base mt-2">أكمل بياناتك لنقوم بتخصيص التجربة المثالية لمناسبتك.</p>
                    </div>
                 </div>
                 <div className="space-y-8">
                    <div className="space-y-3">
                       <label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-3 ps-1">التاريخ المستهدف لليلة العمر <Sparkles className="w-4 h-4 text-primary" /></label>
                       <input type="date" className="w-full h-16 bg-muted/20 border border-white/10 rounded-2xl px-8 outline-none font-black text-2xl text-foreground text-start focus:ring-4 focus:ring-primary/10 transition-all" value={bookingDate} onChange={e => setBookingDate(e.target.value)} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                       <Input placeholder="الاسم الكامل" className="h-16 rounded-2xl bg-muted/20 border border-white/10 text-foreground font-black text-lg px-8 text-start focus:ring-4 focus:ring-primary/10" value={guestName} onChange={e => setGuestName(e.target.value)} />
                       <Input placeholder="رقم الجوال" className="h-16 rounded-2xl bg-muted/20 border border-white/10 text-foreground font-black text-lg px-8 text-start focus:ring-4 focus:ring-primary/10" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
                    </div>
                    <Button onClick={handleBooking} disabled={isChecking || isBooking} className="w-full h-20 rounded-[2rem] font-black text-2xl shadow-2xl shadow-primary/40">
                      {isBooking ? <Loader2 className="w-8 h-8 animate-spin" /> : 'تأكيد الحجز الملكي'}
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
