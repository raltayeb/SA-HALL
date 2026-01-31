
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, VAT_RATE, Service } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { Input } from '../components/ui/Input';
import { 
  ImageOff, MapPin, CheckCircle2, Search, Users, Eye, Heart, Sparkles, 
  Calendar as CalendarIcon, Loader2, Info, Star, MessageCircle, 
  Mail, Phone, Building2, Share2, ShieldCheck, ArrowRight, User as UserIcon,
  X, MessageSquare
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
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
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Form State
  const [bookingDate, setBookingDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [clientName, setClientName] = useState(user.full_name || '');
  const [clientPhone, setClientPhone] = useState(user.phone_number || '');
  const [specialNotes, setSpecialNotes] = useState('');

  // Availability State
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const checkAbortController = useRef<AbortController | null>(null);

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
      setActiveImageIndex(0);
      setIsAvailable(null); // Reset availability when opening new hall
    };
    window.addEventListener('openHall', handleOpen);
    return () => window.removeEventListener('openHall', handleOpen);
  }, []);

  // Stabilized availability check to prevent infinite loading
  const performCheck = useCallback(async (hallId: string, date: string) => {
    if (!date || !hallId) return;

    // Reset status and start loading
    setIsAvailable(null);
    setIsCheckingAvailability(true);

    try {
      const [bookings, blocks] = await Promise.all([
        supabase.from('bookings').select('id').eq('hall_id', hallId).eq('booking_date', date).neq('status', 'cancelled').maybeSingle(),
        supabase.from('availability_blocks').select('id').eq('hall_id', hallId).eq('block_date', date).maybeSingle()
      ]);
      
      setIsAvailable(!bookings.data && !blocks.data);
    } catch (err) {
      console.error('Availability check failed:', err);
      setIsAvailable(false);
    } finally {
      setIsCheckingAvailability(false);
    }
  }, []);

  useEffect(() => {
    if (viewingHall?.id && bookingDate) {
      const timer = setTimeout(() => {
        performCheck(viewingHall.id, bookingDate);
      }, 500); // Debounce to prevent rapid hits while typing/selecting
      return () => clearTimeout(timer);
    }
  }, [bookingDate, viewingHall?.id, performCheck]);

  const handleBook = async () => {
    if (!viewingHall || isAvailable !== true) return;
    
    // Validate custom form fields
    if (!clientName.trim() || !clientPhone.trim()) {
      toast({ title: 'تنبيه', description: 'يرجى إكمال بيانات التواصل أولاً.', variant: 'destructive' });
      return;
    }

    const subtotal = (viewingHall.price_per_night || 0) + (selectedService?.price || 0);
    const vat = subtotal * VAT_RATE;

    const bookingPayload: any = {
      hall_id: viewingHall.id,
      user_id: user.id,
      vendor_id: viewingHall.vendor_id,
      booking_date: bookingDate,
      total_amount: subtotal + vat,
      vat_amount: vat,
      status: 'pending',
      notes: specialNotes
    };

    if (selectedService?.id) {
      bookingPayload.service_id = selectedService.id;
    }

    const { error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingPayload])
      .select()
      .single();

    if (!bookingError) {
      await supabase.from('notifications').insert([{
        user_id: viewingHall.vendor_id,
        title: 'طلب حجز جديد',
        message: `حجز قاعة ${viewingHall.name} بتاريخ ${bookingDate} للعميل ${clientName}`,
        type: 'booking_new',
        action_url: 'hall_bookings'
      }]);
      
      toast({ title: 'نجاح', description: 'تم إرسال طلب الحجز، سيقوم البائع بالتواصل معك قريباً.', variant: 'success' });
      setViewingHall(null);
      setSelectedService(null);
      setSpecialNotes('');
    } else {
      toast({ title: 'خطأ', description: bookingError.message, variant: 'destructive' });
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
      <div className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-4">
        <div className="text-right">
          <h2 className="text-4xl font-black text-primary tracking-tighter">قاعات الأفراح</h2>
          <p className="text-muted-foreground mt-1">تصفح القاعات المتاحة واحجز مناسبتك القادمة.</p>
        </div>
        <div className="relative w-full md:w-80 group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="ابحث بالمدينة أو اسم القاعة..."
            className="w-full h-14 bg-card border rounded-2xl pr-12 pl-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm text-right"
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
             
             <div className="aspect-[1.2/1] w-full bg-muted relative cursor-pointer overflow-hidden" onClick={() => { setViewingHall(hall); fetchVendorServices(hall.vendor_id); }}>
              {(hall.images && hall.images[0]) || hall.image_url ? (
                <img src={hall.images?.[0] || hall.image_url} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" alt={hall.name} />
              ) : (
                <div className="flex h-full items-center justify-center opacity-20"><ImageOff className="h-12 w-12" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6 justify-center">
                <span className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                   استعراض القاعة <Eye className="w-4 h-4" />
                </span>
              </div>
             </div>

             <div className="p-8 flex flex-col flex-1 text-right">
                <div className="flex justify-between items-start mb-2 flex-row-reverse">
                  <h3 className="font-black text-2xl tracking-tight leading-none">{hall.name}</h3>
                  <div className="bg-primary/10 px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 text-primary fill-primary" />
                    <span className="text-[10px] font-black text-primary">4.9</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-end gap-2 text-xs font-bold text-muted-foreground mb-6">
                  {hall.capacity} ضيف <Users className="w-4 h-4 text-primary" />
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30 mx-1"></span>
                  {hall.city} <MapPin className="w-4 h-4 text-primary" />
                </div>

                <div className="mt-auto pt-6 border-t flex items-center justify-between flex-row-reverse">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">التكلفة لليلة</span>
                    <PriceTag amount={hall.price_per_night} className="text-primary text-2xl" />
                  </div>
                  <Button 
                    variant="outline"
                    className="rounded-2xl h-12 px-6 font-black border-2"
                    onClick={() => { setViewingHall(hall); fetchVendorServices(hall.vendor_id); }}
                  >
                    عرض التفاصيل
                  </Button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Cinematic Full-Screen Overlay */}
      {viewingHall && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-500">
          <header className="p-6 border-b flex justify-between items-center bg-card/50 backdrop-blur-xl shrink-0">
             <Button variant="ghost" size="icon" className="rounded-full w-12 h-12 hover:bg-muted" onClick={() => { setViewingHall(null); setSelectedService(null); setIsAvailable(null); }}>
               <ArrowRight className="w-6 h-6" />
             </Button>
             <div className="text-center">
                <h3 className="font-black text-xl">{viewingHall.name}</h3>
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">{viewingHall.city} • {viewingHall.capacity} ضيف</p>
             </div>
             <div className="flex items-center gap-2">
               <Button variant="outline" size="icon" className="rounded-full w-12 h-12 shadow-sm"><Share2 className="w-5 h-5" /></Button>
               <Button 
                 variant="outline" 
                 size="icon" 
                 className={`rounded-full w-12 h-12 shadow-sm ${favorites.includes(viewingHall.id) ? 'text-destructive fill-destructive border-destructive/30' : ''}`} 
                 onClick={(e) => toggleFavorite(e, viewingHall.id)}
               >
                 <Heart className="w-5 h-5" />
               </Button>
             </div>
          </header>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="max-w-7xl mx-auto p-6 lg:p-12 space-y-12">
              <div className="grid lg:grid-cols-5 gap-12">
                
                {/* Visuals & Details */}
                <div className="lg:col-span-3 space-y-10 text-right">
                  <div className="relative aspect-video rounded-[3rem] overflow-hidden shadow-2xl group bg-muted border">
                    <img 
                      src={allImages[activeImageIndex]} 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                      alt="Hall Preview" 
                    />
                    {allImages.length > 1 && (
                      <div className="absolute inset-x-0 bottom-8 flex justify-center gap-2 px-8">
                        {allImages.map((_, i) => (
                          <button 
                            key={i} 
                            onClick={() => setActiveImageIndex(i)}
                            className={`h-1.5 transition-all rounded-full ${activeImageIndex === i ? 'w-12 bg-white shadow-xl' : 'w-2 bg-white/40 hover:bg-white/60'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    {viewingHall.amenities?.map((am, i) => (
                      <span key={i} className="px-5 py-2.5 rounded-2xl bg-primary/5 border border-primary/10 text-[11px] font-black text-primary flex items-center gap-2">
                         {am} <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-3xl font-black text-right">وصف القاعة ومزاياها</h4>
                    <p className="text-muted-foreground leading-loose text-lg opacity-80 text-right">{viewingHall.description || "تتميز هذه القاعة بتصميم عصري وفريد يجمع بين الرقي والفخامة، مما يجعلها المكان المثالي لمناسباتكم الخاصة."}</p>
                  </div>

                  {/* Vendor Contact Quick Icons */}
                  <div className="p-8 bg-card border rounded-[3rem] shadow-xl flex flex-col md:flex-row-reverse justify-between items-center gap-8">
                     <div className="flex items-center flex-row-reverse gap-6">
                        <div className="w-24 h-24 rounded-[1.5rem] bg-muted border flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                           {viewingHall.vendor?.custom_logo_url ? <img src={viewingHall.vendor.custom_logo_url} className="w-full h-full object-contain p-2" /> : <Building2 className="w-12 h-12 text-primary" />}
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">المزود المعتمد</p>
                           <h4 className="text-2xl font-black">{viewingHall.vendor?.business_name || viewingHall.vendor?.full_name}</h4>
                           <p className="text-sm text-muted-foreground mt-1">تواصل مباشرة مع إدارة القاعة لأي استفسار خاص.</p>
                        </div>
                     </div>
                     <div className="flex gap-4">
                        {viewingHall.vendor?.whatsapp_number && (
                          <a 
                            href={`https://wa.me/${viewingHall.vendor.whatsapp_number}`} 
                            target="_blank" 
                            className="bg-green-500 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
                            title="WhatsApp"
                          >
                            <MessageSquare className="w-6 h-6" />
                          </a>
                        )}
                        {viewingHall.vendor?.phone_number && (
                          <a 
                            href={`tel:${viewingHall.vendor.phone_number}`} 
                            className="bg-primary text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
                            title="Call Now"
                          >
                            <Phone className="w-6 h-6" />
                          </a>
                        )}
                        {viewingHall.vendor?.business_email && (
                          <a 
                            href={`mailto:${viewingHall.vendor.business_email}`} 
                            className="bg-muted text-foreground w-14 h-14 rounded-full shadow-xl border flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
                            title="Email"
                          >
                            <Mail className="w-6 h-6" />
                          </a>
                        )}
                     </div>
                  </div>
                </div>

                {/* Booking Form Card */}
                <div className="lg:col-span-2">
                  <div className="sticky top-12 space-y-6 text-right">
                    <div className="bg-card border rounded-[3.5rem] p-10 shadow-2xl space-y-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mt-16 blur-3xl"></div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center flex-row-reverse">
                          <h4 className="text-xl font-black">طلب حجز القاعة</h4>
                          <ShieldCheck className="w-6 h-6 text-green-600 opacity-50" />
                        </div>
                        <PriceTag amount={(viewingHall.price_per_night || 0) + (selectedService?.price || 0)} className="text-5xl text-primary" iconSize={36} />
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">شامل الرسوم والضرائب التقديرية</p>
                      </div>

                      <div className="space-y-6">
                        {/* 1. Date Selection */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center justify-end gap-2">
                            تاريخ الموعد <CalendarIcon className="w-3.5 h-3.5" />
                          </label>
                          <input 
                            type="date" 
                            className="w-full h-16 bg-muted/30 border rounded-2xl px-6 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-black text-lg text-right" 
                            value={bookingDate} 
                            onChange={e => setBookingDate(e.target.value)} 
                            min={format(new Date(), 'yyyy-MM-dd')} 
                          />
                          {isCheckingAvailability ? (
                            <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground mt-1 font-black animate-pulse">جاري التحقق من التوفر... <Loader2 className="w-3 h-3 animate-spin" /></div>
                          ) : isAvailable === true ? (
                            <div className="flex items-center justify-end gap-1.5 text-[11px] text-green-600 font-black mt-1"><CheckCircle2 className="w-4 h-4" /> التاريخ متاح للحجز</div>
                          ) : isAvailable === false ? (
                            <div className="flex items-center justify-end gap-1.5 text-[11px] text-destructive font-black mt-1"><X className="w-4 h-4" /> التاريخ غير متاح</div>
                          ) : null}
                        </div>

                        {/* 2. Client Details (NEW) */}
                        <div className="space-y-4 pt-4 border-t border-dashed">
                           <h5 className="text-xs font-black uppercase text-primary tracking-widest">بيانات التواصل والطلب</h5>
                           <div className="space-y-3">
                              <Input 
                                label="اسم العميل"
                                placeholder="ادخل اسمك الكامل"
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                                className="h-12 rounded-2xl text-right font-bold"
                              />
                              <Input 
                                label="رقم الجوال"
                                placeholder="05xxxxxxxx"
                                value={clientPhone}
                                onChange={e => setClientPhone(e.target.value)}
                                className="h-12 rounded-2xl text-right font-bold"
                              />
                              <div className="space-y-1.5">
                                 <label className="text-[11px] font-black mr-1 text-muted-foreground">ملاحظات إضافية (اختياري)</label>
                                 <textarea 
                                   className="w-full h-24 bg-muted/30 border rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all text-right resize-none"
                                   placeholder="أي تفاصيل خاصة ترغب بإضافتها..."
                                   value={specialNotes}
                                   onChange={e => setSpecialNotes(e.target.value)}
                                 />
                              </div>
                           </div>
                        </div>

                        {/* 3. Services Selection */}
                        {vendorServices.length > 0 && (
                          <div className="space-y-3 pt-4 border-t border-dashed">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center justify-end gap-2">
                               الخدمات الإضافية <Sparkles className="w-3.5 h-3.5 text-primary" />
                            </label>
                            <div className="space-y-2">
                              {vendorServices.map(service => (
                                <button 
                                  key={service.id}
                                  onClick={() => setSelectedService(selectedService?.id === service.id ? null : service)}
                                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedService?.id === service.id ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10' : 'bg-card border-border hover:bg-muted/30'}`}
                                >
                                  <span className="text-xs font-black text-primary">{formatCurrency(service.price)}</span>
                                  <div className="text-right">
                                    <p className="text-xs font-black">{service.name}</p>
                                    <p className="text-[9px] text-muted-foreground font-bold">{service.category}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <Button 
                        className="w-full rounded-[2rem] h-16 font-black text-xl shadow-2xl shadow-primary/30 active:scale-95 transition-all" 
                        disabled={!isAvailable || isCheckingAvailability || !bookingDate || !clientName || !clientPhone} 
                        onClick={handleBook}
                      >
                        {isCheckingAvailability ? 'بانتظار التحقق...' : 'إرسال طلب الحجز'}
                      </Button>
                      
                      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-bold italic opacity-60">
                         <ShieldCheck className="w-4 h-4" /> جميع العمليات مشفرة وآمنة
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
