
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Hall, UserProfile, Service, VAT_RATE } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PriceTag } from '../ui/PriceTag';
import { 
  X, MapPin, Users, Star, Building2, Share2, 
  Heart, Calendar, CheckCircle2, MessageSquare, 
  Mail, Phone, Info, Loader2, ArrowRight,
  Sparkles, Check, ChevronRight, ChevronLeft,
  Plus, Camera, Coffee, Utensils, Music, ShieldCheck,
  Compass
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';

interface HallDetailPopupProps {
  hall: Hall & { vendor?: UserProfile };
  user: UserProfile | null;
  onClose: () => void;
}

export const HallDetailPopup: React.FC<HallDetailPopupProps> = ({ hall, user, onClose }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [vendorServices, setVendorServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [bookingDate, setBookingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [guestName, setGuestName] = useState(user?.full_name || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone_number || '');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const { toast } = useToast();
  const allImages = hall.images && hall.images.length > 0 ? hall.images : [hall.image_url].filter(Boolean);

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*').eq('vendor_id', hall.vendor_id).eq('is_active', true);
    setVendorServices(data || []);
  };

  const checkAvailability = useCallback(async () => {
    if (!bookingDate) return;
    setIsChecking(true);
    try {
      const [bookings, blocks] = await Promise.all([
        supabase.from('bookings').select('id').eq('hall_id', hall.id).eq('booking_date', bookingDate).neq('status', 'cancelled').maybeSingle(),
        supabase.from('availability_blocks').select('id').eq('hall_id', hall.id).eq('block_date', bookingDate).maybeSingle()
      ]);
      setIsAvailable(!bookings.data && !blocks.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsChecking(false);
    }
  }, [hall.id, bookingDate]);

  useEffect(() => {
    fetchServices();
  }, [hall.vendor_id]);

  useEffect(() => {
    if (isBookingModalOpen) {
        const timer = setTimeout(checkAvailability, 500);
        return () => clearTimeout(timer);
    }
  }, [bookingDate, checkAvailability, isBookingModalOpen]);

  const toggleService = (id: string) => {
    setSelectedServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const calculateTotal = () => {
    const servicesPrice = vendorServices
      .filter(s => selectedServices.includes(s.id))
      .reduce((sum, s) => sum + Number(s.price), 0);
    const subtotal = Number(hall.price_per_night) + servicesPrice;
    const vat = subtotal * VAT_RATE;
    return { subtotal, vat, total: subtotal + vat };
  };

  const handleBooking = async () => {
    if (!guestName || !guestPhone) {
      toast({ title: 'تنبيه', description: 'يرجى إدخال الاسم ورقم الهاتف للمتابعة.', variant: 'destructive' });
      return;
    }

    setIsBooking(true);
    const { total, vat } = calculateTotal();
    
    try {
      const { data: bookingData, error } = await supabase.from('bookings').insert([{
        hall_id: hall.id,
        user_id: user?.id || '00000000-0000-0000-0000-000000000000',
        vendor_id: hall.vendor_id,
        booking_date: bookingDate,
        total_amount: total,
        vat_amount: vat,
        status: 'pending',
        notes: `حجز خارجي | العميل: ${guestName} | هاتف: ${guestPhone}`
      }]).select().single();

      if (error) throw error;

      await supabase.from('notifications').insert([{
        user_id: hall.vendor_id,
        title: 'طلب حجز من الموقع العام',
        message: `طلب جديد لقاعة ${hall.name} بتاريخ ${bookingDate} من ${guestName}`,
        type: 'booking_new',
        action_url: 'hall_bookings'
      }]);

      toast({ title: 'تم إرسال الطلب', description: 'تم تسجيل حجزك المبدئي. سيقوم البائع بالتواصل معك.', variant: 'success' });
      
      const waMsg = `مرحباً، أود تأكيد رغبتي في حجز قاعة "${hall.name}" بتاريخ ${bookingDate}.\nالاسم: ${guestName}\nالجوال: ${guestPhone}`;
      const waLink = `https://wa.me/${hall.vendor?.whatsapp_number || ''}?text=${encodeURIComponent(waMsg)}`;
      if (hall.vendor?.whatsapp_number) {
        window.open(waLink, '_blank');
      }

      setIsBookingModalOpen(false);
      onClose();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setIsBooking(false);
    }
  };

  const { subtotal, vat, total } = calculateTotal();

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in fade-in duration-700 selection:bg-primary selection:text-white">
      {/* Luxury Minimal Header */}
      <header className="px-12 h-24 flex justify-between items-center shrink-0 z-30 flex-row-reverse border-b border-black/5 bg-white/50 backdrop-blur-3xl sticky top-0">
         <div className="flex items-center gap-8 flex-row-reverse">
            <Button variant="ghost" size="icon" className="rounded-full w-14 h-14 bg-black text-white hover:bg-primary transition-all" onClick={onClose}>
               <ArrowRight className="w-6 h-6" />
            </Button>
            <div className="text-right">
               <h4 className="font-black text-2xl text-black">{hall.name}</h4>
               <p className="text-[10px] text-black/40 font-black tracking-[0.2em] uppercase">{hall.city} • قاعة ملكية</p>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="rounded-full w-14 h-14 border-2 border-black/5"><Share2 className="w-5 h-5" /></Button>
            <Button variant="outline" size="icon" className="rounded-full w-14 h-14 border-2 border-black/5 text-destructive hover:bg-destructive/5"><Heart className="w-5 h-5" /></Button>
            <div className="w-px h-8 bg-black/10 mx-4"></div>
            <Button onClick={() => setIsBookingModalOpen(true)} className="rounded-full px-12 h-14 font-black shadow-soft-primary text-lg">احجز الآن</Button>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Cinematic Gallery */}
        <section className="px-12 py-12">
            <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-8">
               <div className="col-span-12 lg:col-span-9 aspect-[21/9] rounded-[4rem] overflow-hidden bg-black/5 relative shadow-2xl group">
                  <img src={allImages[activeImage]} className="w-full h-full object-cover" alt="Hall Main View" />
                  <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-all duration-500">
                     <Button size="icon" variant="secondary" className="rounded-full w-16 h-16 shadow-2xl bg-white/95" onClick={() => setActiveImage(prev => (prev + 1) % allImages.length)}><ChevronRight className="w-8 h-8" /></Button>
                     <Button size="icon" variant="secondary" className="rounded-full w-16 h-16 shadow-2xl bg-white/95" onClick={() => setActiveImage(prev => (prev - 1 + allImages.length) % allImages.length)}><ChevronLeft className="w-8 h-8" /></Button>
                  </div>
               </div>
               <div className="col-span-12 lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-4">
                  {allImages.slice(1, 4).map((img, i) => (
                    <div key={i} onClick={() => setActiveImage(i + 1)} className="aspect-video rounded-[2rem] overflow-hidden border-2 border-transparent hover:border-primary cursor-pointer transition-all">
                       <img src={img} className="w-full h-full object-cover" />
                    </div>
                  ))}
               </div>
            </div>
        </section>

        <div className="max-w-7xl mx-auto px-12 py-12 pb-32">
          <div className="grid lg:grid-cols-12 gap-20">
            {/* Detailed Content */}
            <div className="lg:col-span-8 space-y-24 text-right">
              
              {/* Introduction */}
              <div className="space-y-10">
                <div className="flex justify-between items-end flex-row-reverse border-b border-black/5 pb-12">
                   <div className="space-y-4">
                     <h2 className="text-6xl font-black text-black tracking-tighter leading-none">{hall.name}</h2>
                     <div className="flex items-center justify-end gap-6 text-sm font-bold text-black/40">
                        <span className="flex items-center gap-2 flex-row-reverse"><Users className="w-5 h-5 text-primary" /> {hall.capacity} ضيف</span>
                        <span className="w-1.5 h-1.5 bg-black/10 rounded-full"></span>
                        <span className="flex items-center gap-2 flex-row-reverse"><MapPin className="w-5 h-5 text-primary" /> {hall.city}</span>
                        <span className="w-1.5 h-1.5 bg-black/10 rounded-full"></span>
                        <span className="flex items-center gap-2 flex-row-reverse text-yellow-600"><Star className="w-5 h-5 fill-yellow-600" /> 4.9 (ممتاز)</span>
                     </div>
                   </div>
                   <div className="text-right">
                      <span className="text-[10px] font-black text-black/40 uppercase tracking-[0.3em] mb-2 block">يبدأ من</span>
                      <PriceTag amount={hall.price_per_night} className="text-5xl text-black" iconSize={32} />
                   </div>
                </div>

                <div className="space-y-6">
                   <h3 className="text-3xl font-black text-black tracking-tight">التجربة والوصف</h3>
                   <p className="text-2xl text-black/60 leading-relaxed font-medium">
                     {hall.description || "استمتع بأرقى خدمات الضيافة في قاعتنا المصممة خصيصاً لتناسب تطلعاتكم، حيث تلتقي الفخامة بالراحة في قلب المملكة."}
                   </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {hall.amenities?.map((am, i) => (
                    <div key={i} className="flex flex-col items-end gap-4 p-8 bg-black/[0.02] border border-black/5 rounded-[2.5rem] hover:bg-black/5 transition-all">
                       <ShieldCheck className="w-8 h-8 text-primary" />
                       <span className="text-sm font-black text-black">{am}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Curated Services */}
              <div className="space-y-10">
                 <div className="flex items-center justify-end gap-4 flex-row-reverse">
                    <h3 className="text-3xl font-black text-black tracking-tight">خدمات منتقاة بعناية</h3>
                    <div className="h-px flex-1 bg-black/5"></div>
                 </div>
                 <div className="grid sm:grid-cols-2 gap-6">
                    {vendorServices.map(service => (
                      <div 
                        key={service.id} 
                        onClick={() => toggleService(service.id)}
                        className={`p-8 border-2 rounded-[3rem] transition-all cursor-pointer flex flex-row-reverse items-center justify-between group ${selectedServices.includes(service.id) ? 'border-primary bg-primary/5 shadow-soft-primary' : 'border-black/5 hover:border-black/20 bg-white shadow-soft'}`}
                      >
                         <div className="flex items-center gap-6 flex-row-reverse text-right">
                            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all ${selectedServices.includes(service.id) ? 'bg-primary text-white' : 'bg-black/5 text-black group-hover:bg-black group-hover:text-white'}`}>
                               {selectedServices.includes(service.id) ? <Check className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
                            </div>
                            <div>
                               <p className="font-black text-lg text-black">{service.name}</p>
                               <p className="text-[10px] text-black/40 font-black tracking-widest uppercase">{service.category}</p>
                            </div>
                         </div>
                         <PriceTag amount={service.price} className="text-primary text-xl" />
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            {/* Sticky Floating CTA */}
            <div className="lg:col-span-4 relative hidden lg:block">
               <div className="sticky top-32 space-y-8">
                  <div className="p-10 bg-white border border-black/5 rounded-[3.5rem] shadow-2xl space-y-8 text-right overflow-hidden group">
                     <div className="space-y-2">
                        <h4 className="text-xl font-black text-black">هل أنت جاهز للخطوة التالية؟</h4>
                        <p className="text-xs text-black/40 font-bold leading-relaxed">حدد تاريخ مناسبتك ودعنا نهتم بكافة التفاصيل الأخرى.</p>
                     </div>
                     <PriceTag amount={total} className="text-5xl text-black block text-right" iconSize={36} />
                     <Button onClick={() => setIsBookingModalOpen(true)} className="w-full h-20 rounded-[2.5rem] font-black text-xl shadow-soft-primary group-hover:scale-[1.02] transition-transform">بدء عملية الحجز</Button>
                  </div>
                  
                  <div className="flex items-center justify-end gap-6 p-8 bg-black/5 rounded-[3rem] border border-black/5 flex-row-reverse">
                     <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl text-primary"><Compass className="w-8 h-8" /></div>
                     <div className="text-right flex-1">
                        <p className="text-sm font-black text-black">تحتاج استشارة خاصة؟</p>
                        <p className="text-[10px] text-black/40 font-bold">فريقنا متاح لمساعدتك في اختيار القاعة الأنسب.</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Dedicated Booking Modal Popup */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500">
           <div className="w-full max-w-2xl bg-white rounded-[4rem] shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
              <button onClick={() => setIsBookingModalOpen(false)} className="absolute top-10 left-10 p-4 hover:bg-black/5 rounded-full transition-colors z-10"><X className="w-6 h-6" /></button>
              
              <div className="p-12 space-y-10 text-right">
                 <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">نموذج الحجز الملكي</div>
                    <h2 className="text-4xl font-black text-black">أكمل تفاصيل مناسبتك</h2>
                    <p className="text-black/40 font-bold text-lg">يرجى تحديد التاريخ وإدخال بيانات التواصل الخاصة بك.</p>
                 </div>

                 <div className="space-y-8">
                    <div className="space-y-3">
                       <label className="text-xs font-black uppercase tracking-[0.2em] text-black/30 flex items-center justify-end gap-2 text-right">تاريخ المناسبة <Calendar className="w-4 h-4 text-primary" /></label>
                       <input 
                        type="date" 
                        className="w-full h-16 bg-black/[0.03] border-2 border-transparent focus:border-primary/20 rounded-[1.5rem] px-8 outline-none font-black text-2xl text-right text-black transition-all" 
                        value={bookingDate}
                        onChange={e => setBookingDate(e.target.value)}
                       />
                       {isChecking ? (
                         <div className="flex items-center justify-end gap-2 text-black/40 text-[10px] font-black animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> جاري مراجعة التوفر</div>
                       ) : isAvailable === true ? (
                         <div className="text-[11px] text-green-600 font-black">القاعة متاحة في هذا الموعد ✓</div>
                       ) : isAvailable === false ? (
                         <div className="text-[11px] text-destructive font-black">عذراً، التاريخ محجوز مسبقاً</div>
                       ) : null}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-3 text-right">
                          <label className="text-xs font-black uppercase tracking-[0.2em] text-black/30">الاسم الكامل</label>
                          <Input 
                            placeholder="اسم العميل" 
                            className="h-16 rounded-[1.5rem] bg-black/[0.03] border-none font-black text-lg text-right" 
                            value={guestName}
                            onChange={e => setGuestName(e.target.value)}
                          />
                       </div>
                       <div className="space-y-3 text-right">
                          <label className="text-xs font-black uppercase tracking-[0.2em] text-black/30">رقم الواتساب</label>
                          <Input 
                            placeholder="9665xxxxxxxx" 
                            className="h-16 rounded-[1.5rem] bg-black/[0.03] border-none font-black text-lg text-right" 
                            value={guestPhone}
                            onChange={e => setGuestPhone(e.target.value)}
                          />
                       </div>
                    </div>

                    <div className="p-8 bg-black/5 rounded-[2.5rem] border border-black/5 space-y-4">
                       <div className="flex justify-between items-center flex-row-reverse text-sm font-bold">
                          <span className="text-black/40">تكلفة القاعة والخدمات</span>
                          <PriceTag amount={subtotal} className="text-black" />
                       </div>
                       <div className="flex justify-between items-center flex-row-reverse text-xs font-bold">
                          <span className="text-black/40">الضريبة المضافة ({VAT_RATE * 100}%)</span>
                          <PriceTag amount={vat} className="text-black/40" />
                       </div>
                       <div className="pt-4 border-t border-black/5 flex justify-between items-center flex-row-reverse">
                          <span className="text-xl font-black text-black">الإجمالي التقريبي</span>
                          <PriceTag amount={total} className="text-3xl text-primary" iconSize={24} />
                       </div>
                    </div>

                    <Button 
                      onClick={handleBooking} 
                      disabled={!isAvailable || isChecking || isBooking || !guestName || !guestPhone}
                      className="w-full h-20 rounded-[2rem] font-black text-2xl shadow-soft-primary"
                    >
                      {isBooking ? <Loader2 className="animate-spin" /> : 'تأكيد الحجز المبدئي'}
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

