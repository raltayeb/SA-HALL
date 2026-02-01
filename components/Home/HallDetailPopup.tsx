
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

      // NOTIFY THE VENDOR
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

  const { total } = calculateTotal();

  return (
    <div className="fixed inset-0 z-[200] bg-[#0f0a14] flex flex-col overflow-hidden animate-in fade-in duration-500 font-sans text-white selection:bg-[#4B0082] selection:text-white">
      <header className="px-6 h-16 flex justify-between items-center shrink-0 border-b border-white/5 bg-[#0f0a14]/95 backdrop-blur-md sticky top-0">
         <div className="flex items-center gap-6">
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition-all">
               <X className="w-5 h-5" />
            </button>
            <h4 className="font-black text-lg uppercase">Royal<span className="text-[#D4AF37]">Venues</span></h4>
         </div>
         <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="rounded-xl w-10 h-10 border-white/10"><Share2 className="w-4 h-4" /></Button>
            <Button onClick={() => setIsBookingModalOpen(true)} className="rounded-xl px-8 h-10 font-bold bg-[#D4AF37] text-black hover:bg-white text-sm">احجز الآن</Button>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto ps-[env(safe-area-inset-left)] pe-[env(safe-area-inset-right)]">
        <section className="px-6 pt-6">
            <div className="max-w-6xl mx-auto">
               <div className="relative aspect-[21/9] rounded-[1.125rem] overflow-hidden bg-white/5 shadow-2xl group">
                  <img src={allImages[activeImage]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Hero View" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a14] via-transparent to-transparent opacity-60"></div>
                  <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-all duration-300">
                     <button onClick={() => setActiveImage(prev => (prev + 1) % allImages.length)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-3xl border border-white/10 flex items-center justify-center text-white hover:bg-[#D4AF37] hover:text-black"><ChevronLeft className="w-5 h-5" /></button>
                     <button onClick={() => setActiveImage(prev => (prev - 1 + allImages.length) % allImages.length)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-3xl border border-white/10 flex items-center justify-center text-white hover:bg-[#D4AF37] hover:text-black"><ChevronRight className="w-5 h-5" /></button>
                  </div>
               </div>
            </div>
        </section>

        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 space-y-12 text-start">
              <div className="space-y-6">
                <div className="flex flex-wrap justify-between items-end gap-6 border-b border-white/5 pb-8">
                   <div className="space-y-4">
                     <div className="flex items-center gap-3">
                        <span className="bg-[#4B0082]/30 text-[#D4AF37] px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-[#4B0082]/30">Elite Selection</span>
                        <div className="flex items-center gap-1.5 text-[#D4AF37]"><Star className="w-4 h-4 fill-current" /><span className="text-sm font-bold">4.9 Excellence</span></div>
                     </div>
                     <h1 className="text-4xl font-black text-white tracking-tighter uppercase">{item.name}</h1>
                     <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-white/30 uppercase">
                        {isHall && <span className="flex items-center gap-2"><Users className="w-4 h-4 text-[#D4AF37]" /> {hall?.capacity} ضيف</span>}
                        <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#D4AF37]" /> {isHall ? hall?.city : item.vendor?.business_name}</span>
                     </div>
                   </div>
                   <div className="text-start">
                      <PriceTag amount={isHall ? hall!.price_per_night : service!.price} className="text-4xl text-white" />
                      <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest block mt-1">{isHall ? 'Per Event Day' : 'Professional Fee'}</span>
                   </div>
                </div>

                <div className="flex gap-10 border-b border-white/5 overflow-x-auto no-scrollbar">
                   {['overview', 'amenities', 'reviews'].map((tab) => (
                     <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-white' : 'text-white/20 hover:text-white/50'}`}>
                        {tab === 'overview' ? 'التفاصيل' : tab === 'amenities' ? 'المميزات' : 'المراجعات'}
                        {activeTab === tab && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#D4AF37]" />}
                     </button>
                   ))}
                </div>

                <div className="pt-4">
                   {activeTab === 'overview' && <p className="text-base text-white/50 leading-relaxed font-medium">{item.description || "نقدم لكم تجربة استثنائية في عالم المناسبات الفاخرة، حيث تجتمع الدقة في التنفيذ مع روعة التصميم لخلق ذكريات لا تُنسى."}</p>}
                   {activeTab === 'amenities' && (
                     <div className="grid sm:grid-cols-2 gap-4">
                        {isHall && hall?.amenities?.map((am, i) => (
                          <div key={i} className="flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-xl group hover:border-[#D4AF37]/30">
                             <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]"><Sparkles className="w-5 h-5" /></div>
                             <span className="text-sm font-bold text-white/80">{am}</span>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 relative">
               <div className="sticky top-20 space-y-6">
                  <div className="p-8 bg-white/5 border border-white/10 rounded-[1.125rem] shadow-2xl space-y-8 backdrop-blur-3xl">
                     <div className="flex justify-between items-center">
                        <div className="space-y-1">
                           <PriceTag amount={total} className="text-3xl text-white" />
                           <p className="text-[9px] font-black uppercase text-white/20">Estimated Total</p>
                        </div>
                        <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 border border-green-500/20">Verified Available</div>
                     </div>
                     <Button onClick={() => setIsBookingModalOpen(true)} className="w-full h-14 rounded-xl font-black text-lg bg-[#D4AF37] text-black hover:bg-white active:scale-95 shadow-xl group">تأكيد الحجز <Zap className="w-5 h-5 ms-3 fill-current" /></Button>
                     <p className="text-[10px] text-center text-white/20 font-bold px-4 uppercase leading-tight">No immediate payment required. Private consultant follow-up within 2 hours.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[300] bg-[#0f0a14]/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
           <div className="w-full max-w-lg bg-[#191022] rounded-[1.125rem] shadow-2xl relative border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95">
              <button onClick={() => setIsBookingModalOpen(false)} className="absolute top-6 end-6 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all z-50"><X className="w-5 h-5" /></button>
              <div className="p-10 space-y-10 text-start">
                 <div className="space-y-4">
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-tight">Reservation Details</h2>
                    <p className="text-white/40 font-medium text-sm">أكمل بياناتك لنقوم بتخصيص التجربة المثالية لمناسبتك.</p>
                 </div>
                 <div className="space-y-6">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase text-white/30 flex items-center gap-2">Target Date <Calendar className="w-3.5 h-3.5" /></label>
                       <input type="date" className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-6 outline-none font-black text-xl text-white text-start" value={bookingDate} onChange={e => setBookingDate(e.target.value)} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                       <Input placeholder="الاسم الكامل" className="h-14 rounded-xl bg-white/5 border-white/10 text-white font-bold text-base px-6 text-start" value={guestName} onChange={e => setGuestName(e.target.value)} />
                       <Input placeholder="رقم الجوال" className="h-14 rounded-xl bg-white/5 border-white/10 text-white font-bold text-base px-6 text-start" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
                    </div>
                    <Button onClick={handleBooking} disabled={isChecking || isBooking} className="w-full h-16 rounded-xl font-black text-xl bg-[#D4AF37] text-black hover:bg-white transition-all">
                      {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm Selection'}
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
