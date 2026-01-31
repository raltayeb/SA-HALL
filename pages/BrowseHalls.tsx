
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, VAT_RATE, SAUDI_CITIES, Service } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  ImageOff, MapPin, CheckCircle2, Search, Users, Eye, X, Heart, Sparkles, 
  Calendar as CalendarIcon, Loader2, ChevronRight, ChevronLeft, Info, Star,
  MessageCircle, Mail, Phone
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/currency';

interface BrowseHallsProps {
  user: UserProfile;
}

export const BrowseHalls: React.FC<BrowseHallsProps> = ({ user }) => {
  const [halls, setHalls] = useState<(Hall & { vendor?: UserProfile })[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingHall, setViewingHall] = useState<(Hall & { vendor?: UserProfile }) | null>(null);
  const [vendorServices, setVendorServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { toast } = useToast();

  const fetchHalls = async () => {
    setLoading(true);
    const { data } = await supabase.from('halls').select('*, vendor:vendor_id(*)').eq('is_active', true);
    if (data) setHalls(data as any);
    setLoading(false);
  };

  const fetchFavorites = async () => {
    const { data } = await supabase.from('user_favorites').select('hall_id').eq('user_id', user.id);
    if (data) setFavorites(data.map(f => f.hall_id));
  };

  const fetchVendorServices = async (vendorId: string) => {
    const { data } = await supabase.from('services').select('*').eq('vendor_id', vendorId).eq('is_active', true);
    setVendorServices(data || []);
  };

  useEffect(() => { 
    fetchHalls(); 
    fetchFavorites();
    const handleOpen = (e: any) => {
      setViewingHall(e.detail);
      fetchVendorServices(e.detail.vendor_id);
    };
    window.addEventListener('openHall', handleOpen);
    return () => window.removeEventListener('openHall', handleOpen);
  }, []);

  const checkAvailability = async (hallId: string, date: string) => {
    if (!date) return;
    setIsCheckingAvailability(true);
    const [bookings, blocks] = await Promise.all([
      supabase.from('bookings').select('id').eq('hall_id', hallId).eq('booking_date', date).neq('status', 'cancelled').maybeSingle(),
      supabase.from('availability_blocks').select('id').eq('hall_id', hallId).eq('block_date', date).maybeSingle()
    ]);
    setIsAvailable(!bookings.data && !blocks.data);
    setIsCheckingAvailability(false);
  };

  useEffect(() => {
    if (viewingHall && bookingDate) {
      checkAvailability(viewingHall.id, bookingDate);
    }
  }, [bookingDate, viewingHall?.id]);

  const handleBook = async () => {
    if (!viewingHall || !isAvailable) return;
    
    const subtotal = viewingHall.price_per_night + (selectedService?.price || 0);
    const vat = subtotal * VAT_RATE;

    const { error } = await supabase.from('bookings').insert([{
      hall_id: viewingHall.id,
      service_id: selectedService?.id || null,
      user_id: user.id,
      vendor_id: viewingHall.vendor_id,
      booking_date: bookingDate,
      total_amount: subtotal + vat,
      vat_amount: vat,
      status: 'pending'
    }]);

    if (!error) {
      await supabase.from('notifications').insert([{
        user_id: viewingHall.vendor_id,
        title: 'طلب حجز جديد',
        message: `قام ${user.full_name} بطلب حجز قاعة ${viewingHall.name}${selectedService ? ` مع خدمة ${selectedService.name}` : ''}`,
        type: 'booking_new',
        action_url: 'hall_bookings'
      }]);
      toast({ title: 'نجاح', description: 'تم إرسال طلب الحجز بنجاح.', variant: 'success' });
      setViewingHall(null);
      setSelectedService(null);
    } else {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, hallId: string) => {
    e.stopPropagation();
    const isFav = favorites.includes(hallId);
    if (isFav) {
      await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('hall_id', hallId);
      setFavorites(prev => prev.filter(id => id !== hallId));
    } else {
      await supabase.from('user_favorites').insert([{ user_id: user.id, hall_id: hallId }]);
      setFavorites(prev => [...prev, hallId]);
    }
  };

  const allImages = viewingHall ? (viewingHall.images && viewingHall.images.length > 0 ? viewingHall.images : [viewingHall.image_url].filter(Boolean)) : [];

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="font-bold text-muted-foreground animate-pulse">جاري استكشاف القاعات المتاحة...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-primary tracking-tighter">استكشف قاعات المناسبات</h2>
          <p className="text-muted-foreground mt-1">تصفح أجمل القاعات في المملكة واحجز موعدك بضغطة زر.</p>
        </div>
        <div className="relative w-full md:w-80 group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="ابحث عن قاعة أو مدينة..."
            className="w-full h-12 bg-card border rounded-2xl pr-12 pl-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {halls.map(hall => (
          <div key={hall.id} className="group rounded-[2.5rem] border bg-card shadow-sm hover:shadow-2xl transition-all flex flex-col relative overflow-hidden h-full">
             <button 
               onClick={(e) => toggleFavorite(e, hall.id)} 
               className="absolute top-5 left-5 z-20 bg-white/95 backdrop-blur-md p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform active:scale-95"
             >
                <Heart className={`w-5 h-5 ${favorites.includes(hall.id) ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
             </button>
             
             <div className="aspect-[1.1/1] w-full bg-muted relative cursor-pointer overflow-hidden" onClick={() => { setViewingHall(hall); fetchVendorServices(hall.vendor_id); }}>
              {(hall.images && hall.images[0]) || hall.image_url ? (
                <img src={hall.images?.[0] || hall.image_url} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" alt={hall.name} />
              ) : (
                <div className="flex h-full items-center justify-center opacity-20"><ImageOff className="h-12 w-12" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                <span className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Eye className="w-4 h-4" /> عرض التفاصيل الكاملة
                </span>
              </div>
              <div className="absolute bottom-4 right-4 flex gap-1">
                {hall.amenities?.slice(0, 2).map((am, i) => (
                  <span key={i} className="bg-white/90 backdrop-blur-sm text-[8px] font-black px-2 py-1 rounded-full uppercase text-primary shadow-sm">{am}</span>
                ))}
              </div>
             </div>

             <div className="p-8 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-black text-2xl tracking-tight leading-tight">{hall.name}</h3>
                  <div className="bg-primary/10 px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 text-primary fill-primary" />
                    <span className="text-[10px] font-black text-primary">4.9</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-6">
                  <MapPin className="w-4 h-4 text-primary" /> {hall.city}
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30 mx-1"></span>
                  <Users className="w-4 h-4 text-primary" /> {hall.capacity} شخص
                </div>

                <div className="mt-auto pt-6 border-t flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">السعر الليلة</span>
                    <PriceTag amount={hall.price_per_night} className="text-primary text-2xl" />
                  </div>
                  <Button 
                    className="rounded-2xl h-12 px-6 font-black shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                    onClick={() => { setViewingHall(hall); fetchVendorServices(hall.vendor_id); }}
                  >
                    عرض واحجز
                  </Button>
                </div>
             </div>
          </div>
        ))}
        {halls.length === 0 && (
          <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 border-2 border-dashed rounded-[3rem] bg-muted/5">
            <Search className="w-12 h-12 text-muted-foreground opacity-20" />
            <p className="font-black text-lg text-muted-foreground">عذراً، لم نجد قاعات تناسب بحثك حالياً.</p>
          </div>
        )}
      </div>

      <Modal isOpen={!!viewingHall} onClose={() => { setViewingHall(null); setSelectedService(null); }} title={viewingHall?.name || 'تفاصيل القاعة'}>
        <div className="space-y-6 max-h-[85vh] overflow-y-auto no-scrollbar pr-1 pb-4">
          {/* Gallery Section */}
          {allImages.length > 0 && (
            <div className="space-y-3">
              <div className="aspect-video relative rounded-3xl overflow-hidden bg-muted group shadow-2xl">
                <img 
                  src={allImages[activeImageIndex]} 
                  className="w-full h-full object-cover" 
                  alt="Hall Preview" 
                />
                {allImages.length > 1 && (
                  <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setActiveImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1))}
                      className="bg-white/90 p-2 rounded-full shadow-lg hover:bg-white"
                    >
                      <ChevronRight className="w-5 h-5 text-primary" />
                    </button>
                    <button 
                      onClick={() => setActiveImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0))}
                      className="bg-white/90 p-2 rounded-full shadow-lg hover:bg-white"
                    >
                      <ChevronLeft className="w-5 h-5 text-primary" />
                    </button>
                  </div>
                )}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white">
                  {activeImageIndex + 1} / {allImages.length}
                </div>
              </div>
              
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {allImages.map((img, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-20 aspect-square shrink-0 rounded-xl overflow-hidden border-2 transition-all ${activeImageIndex === idx ? 'border-primary' : 'border-transparent opacity-50 hover:opacity-100'}`}
                    >
                      <img src={img} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vendor Brand & Contact Info */}
          <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-4 text-center md:text-right">
                <div className="w-16 h-16 rounded-2xl bg-card border flex items-center justify-center overflow-hidden shrink-0">
                   {viewingHall?.vendor?.custom_logo_url ? <img src={viewingHall.vendor.custom_logo_url} className="w-full h-full object-contain" /> : <Building2 className="w-8 h-8 text-primary" />}
                </div>
                <div>
                   <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-0.5">مقدّم الخدمة</p>
                   <h4 className="text-xl font-black">{viewingHall?.vendor?.business_name || viewingHall?.vendor?.full_name}</h4>
                </div>
             </div>
             <div className="flex gap-2">
                {viewingHall?.vendor?.whatsapp_number && (
                  <a href={`https://wa.me/${viewingHall.vendor.whatsapp_number}`} target="_blank" className="bg-green-500 text-white p-3 rounded-2xl shadow-lg hover:scale-110 transition-transform active:scale-95">
                    <MessageCircle className="w-5 h-5" />
                  </a>
                )}
                {viewingHall?.vendor?.business_email && (
                  <a href={`mailto:${viewingHall.vendor.business_email}`} className="bg-primary text-white p-3 rounded-2xl shadow-lg hover:scale-110 transition-transform active:scale-95">
                    <Mail className="w-5 h-5" />
                  </a>
                )}
                {viewingHall?.vendor?.phone_number && (
                  <a href={`tel:${viewingHall.vendor.phone_number}`} className="bg-card border p-3 rounded-2xl shadow-lg hover:scale-110 transition-transform active:scale-95">
                    <Phone className="w-5 h-5 text-primary" />
                  </a>
                )}
             </div>
          </div>

          {/* Hall Info Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <h3 className="text-2xl font-black">{viewingHall?.name}</h3>
               <PriceTag amount={viewingHall?.price_per_night || 0} className="text-xl text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{viewingHall?.description || "لا يوجد وصف متاح لهذه القاعة حالياً."}</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 p-4 rounded-2xl flex items-center gap-3">
                 <Users className="w-5 h-5 text-primary" />
                 <div>
                   <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">السعة القصوى</p>
                   <p className="text-sm font-black">{viewingHall?.capacity} شخص</p>
                 </div>
              </div>
              <div className="bg-muted/30 p-4 rounded-2xl flex items-center gap-3">
                 <MapPin className="w-5 h-5 text-primary" />
                 <div>
                   <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">الموقع</p>
                   <p className="text-sm font-black">{viewingHall?.city}</p>
                 </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {viewingHall?.amenities?.map((am, i) => (
                <span key={i} className="bg-primary/5 text-primary text-[10px] font-bold px-3 py-1.5 rounded-xl border border-primary/10">
                  {am}
                </span>
              ))}
            </div>
          </div>

          <hr className="opacity-50" />

          {/* Booking Flow */}
          <div className="space-y-6 bg-muted/10 p-6 rounded-[2rem] border border-border/50 shadow-inner">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5" /> اختر تاريخ المناسبة
              </label>
              <input 
                type="date" 
                className="w-full h-12 bg-card border rounded-2xl px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" 
                value={bookingDate} 
                onChange={e => setBookingDate(e.target.value)} 
                min={format(new Date(), 'yyyy-MM-dd')} 
              />
              {isCheckingAvailability ? (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1"><Loader2 className="w-3 h-3 animate-spin" /> جاري فحص التوفر...</div>
              ) : isAvailable === true ? (
                <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-bold mt-1"><CheckCircle2 className="w-3.5 h-3.5" /> التاريخ متاح للحجز</div>
              ) : isAvailable === false ? (
                <div className="flex items-center gap-1.5 text-[10px] text-destructive font-bold mt-1"><X className="w-3.5 h-3.5" /> عذراً، هذا الموعد محجوز مسبقاً</div>
              ) : null}
            </div>

            {vendorServices.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> خدمات إضافية (اختياري)
                </label>
                <div className="grid gap-2">
                  {vendorServices.map(service => (
                    <button 
                      key={service.id}
                      onClick={() => setSelectedService(selectedService?.id === service.id ? null : service)}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedService?.id === service.id ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'bg-card hover:bg-muted/50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                          {service.image_url ? <img src={service.image_url} className="w-full h-full object-cover" /> : <Sparkles className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black">{service.name}</p>
                          <p className="text-[10px] text-muted-foreground">{service.category}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-primary">{formatCurrency(service.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-primary/5 p-5 rounded-2xl space-y-3 shadow-inner">
               <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                 <span>المجموع الفرعي</span>
                 <span>{formatCurrency((viewingHall?.price_per_night || 0) + (selectedService?.price || 0))}</span>
               </div>
               <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                 <span>ضريبة القيمة المضافة (15%)</span>
                 <span>{formatCurrency(((viewingHall?.price_per_night || 0) + (selectedService?.price || 0)) * VAT_RATE)}</span>
               </div>
               <div className="flex justify-between items-center pt-3 border-t border-primary/10">
                 <span className="text-sm font-black text-primary">الإجمالي النهائي</span>
                 <PriceTag amount={((viewingHall?.price_per_night || 0) + (selectedService?.price || 0)) * (1 + VAT_RATE)} className="text-xl text-primary" />
               </div>
            </div>

            <Button 
              className="w-full rounded-[1.5rem] h-14 font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.01] transition-transform active:scale-95" 
              disabled={!isAvailable || isCheckingAvailability || !bookingDate} 
              onClick={handleBook}
            >
              إتمام طلب الحجز
            </Button>
            <p className="text-center text-[9px] text-muted-foreground italic">لن يتم سحب أي مبالغ حتى يتم تأكيد الحجز من قبل البائع.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Internal Helper for Building Icon
const Building2 = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
);
