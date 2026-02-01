
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, VAT_RATE, Service } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { Input } from '../components/ui/Input';
import { 
  ImageOff, MapPin, CheckCircle2, Search, Users, Eye, Heart, Sparkles, 
  Calendar as CalendarIcon, Loader2, Star, MessageCircle, 
  Mail, Phone, Building2, Share2, ArrowRight,
  MessageSquare, Facebook, Instagram, Twitter
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';

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

  const [bookingDate, setBookingDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [clientName, setClientName] = useState(user.full_name || '');
  const [clientPhone, setClientPhone] = useState(user.phone_number || '');
  const [specialNotes, setSpecialNotes] = useState('');

  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const { toast } = useToast();

  const fetchHalls = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch halls and join with vendor profile
      const { data, error } = await supabase
        .from('halls')
        .select('*, vendor:vendor_id(*)')
        .eq('is_active', true);
      
      if (error) throw error;
      setHalls(data as any[] || []);
    } catch (err: any) {
      console.error('Error fetching halls:', err);
      toast({ title: 'خطأ', description: 'فشل في تحميل القاعات المتاحة.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchFavorites = useCallback(async () => {
    try {
      const { data } = await supabase.from('user_favorites').select('hall_id').eq('user_id', user.id);
      if (data) setFavorites(data.map(f => f.hall_id));
    } catch (e) { console.error(e); }
  }, [user.id]);

  const fetchVendorServices = async (vendorId: string) => {
    const { data } = await supabase.from('services').select('*').eq('vendor_id', vendorId).eq('is_active', true);
    setVendorServices(data || []);
  };

  useEffect(() => { 
    fetchHalls(); 
    fetchFavorites();
    
    const handleOpen = (e: any) => {
      setViewingHall(e.detail);
      if (e.detail?.vendor_id) {
        fetchVendorServices(e.detail.vendor_id);
      }
      setActiveImageIndex(0);
      setIsAvailable(null);
    };
    window.addEventListener('openHall', handleOpen);
    return () => window.removeEventListener('openHall', handleOpen);
  }, [fetchHalls, fetchFavorites]);

  const performCheck = useCallback(async (hallId: string, date: string) => {
    if (!date || !hallId) return;
    setIsAvailable(null);
    setIsCheckingAvailability(true);
    try {
      const [bookingsRes, blocksRes] = await Promise.all([
        supabase.from('bookings').select('id').eq('hall_id', hallId).eq('booking_date', date).neq('status', 'cancelled').maybeSingle(),
        supabase.from('availability_blocks').select('id').eq('hall_id', hallId).eq('block_date', date).maybeSingle()
      ]);
      setIsAvailable(!bookingsRes.data && !blocksRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingAvailability(false);
    }
  }, []);

  useEffect(() => {
    if (viewingHall?.id && bookingDate) {
      const timer = setTimeout(() => {
        performCheck(viewingHall.id, bookingDate);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [bookingDate, viewingHall?.id, performCheck]);

  const handleBook = async () => {
    if (!viewingHall || isAvailable !== true) return;
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

    try {
      const { error: bookingError } = await supabase.from('bookings').insert([bookingPayload]).select().single();

      if (bookingError) throw bookingError;

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
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, hallId: string) => {
    e.stopPropagation();
    const isFav = favorites.includes(hallId);
    try {
      if (isFav) {
        await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('hall_id', hallId);
        setFavorites(prev => prev.filter(id => id !== hallId));
      } else {
        await supabase.from('user_favorites').insert([{ user_id: user.id, hall_id: hallId }]);
        setFavorites(prev => [...prev, hallId]);
      }
    } catch (e) { console.error(e); }
  };

  const allImages = viewingHall ? (viewingHall.images && viewingHall.images.length > 0 ? viewingHall.images : [viewingHall.image_url].filter(Boolean)) : [];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-4">
        <div className="text-right">
          <h2 className="text-4xl font-black text-primary tracking-tighter">قاعات الأفراح</h2>
          <p className="text-muted-foreground mt-1 text-right">تصفح القاعات المتاحة واحجز مناسبتك القادمة.</p>
        </div>
        <div className="relative w-full md:w-80 group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="ابحث بالمدينة أو اسم القاعة..."
            className="w-full h-14 bg-card border rounded-2xl pr-12 pl-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm text-right font-bold"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="font-bold text-muted-foreground animate-pulse text-right">جاري استكشاف القاعات المتاحة...</p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {halls.length === 0 ? (
            <div className="col-span-full py-32 text-center border-2 border-dashed rounded-[3rem] opacity-50">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="font-black text-xl text-muted-foreground">لا توجد قاعات متاحة في منطقتك حالياً.</p>
            </div>
          ) : (
            halls.map(hall => (
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
            ))
          )}
        </div>
      )}

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
                <div className="lg:col-span-3 space-y-10 text-right">
                  <div className="relative aspect-video rounded-[3rem] overflow-hidden shadow-2xl group bg-muted border">
                    <img src={allImages[activeImageIndex]} className="w-full h-full object-cover" alt="Hall" />
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    {viewingHall.amenities?.map((am, i) => (
                      <span key={i} className="px-5 py-2.5 rounded-2xl bg-primary/5 border border-primary/10 text-[11px] font-black text-primary flex items-center gap-2">
                         {am} <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-3xl font-black">وصف القاعة ومزاياها</h4>
                    <p className="text-muted-foreground leading-loose text-lg opacity-80">{viewingHall.description || "تتميز هذه القاعة بتصميم عصري وفريد يجمع بين الرقي والفخامة."}</p>
                  </div>

                  {/* Vendor Info */}
                  <div className="p-8 bg-card border rounded-[3rem] shadow-xl flex flex-col md:flex-row-reverse justify-between items-center gap-8">
                     <div className="flex items-center flex-row-reverse gap-6">
                        <div className="w-24 h-24 rounded-[1.5rem] bg-muted border flex items-center justify-center overflow-hidden shrink-0">
                           {viewingHall.vendor?.custom_logo_url ? <img src={viewingHall.vendor.custom_logo_url} className="w-full h-full object-contain p-2" /> : <Building2 className="w-12 h-12 text-primary" />}
                        </div>
                        <div className="text-right">
                           <h4 className="text-2xl font-black">{viewingHall.vendor?.business_name || viewingHall.vendor?.full_name}</h4>
                           <p className="text-sm text-muted-foreground mt-1">تواصل مباشرة مع إدارة القاعة.</p>
                           
                           <div className="flex justify-end gap-3 mt-4">
                             {viewingHall.vendor?.facebook_url && (
                               <a href={viewingHall.vendor.facebook_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-muted/50 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-all">
                                 <Facebook className="w-5 h-5" />
                               </a>
                             )}
                             {viewingHall.vendor?.instagram_url && (
                               <a href={viewingHall.vendor.instagram_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-muted/50 rounded-lg hover:bg-pink-100 hover:text-pink-600 transition-all">
                                 <Instagram className="w-5 h-5" />
                               </a>
                             )}
                             {viewingHall.vendor?.twitter_url && (
                               <a href={viewingHall.vendor.twitter_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-muted/50 rounded-lg hover:bg-blue-50 hover:text-black transition-all">
                                 <Twitter className="w-5 h-5" />
                               </a>
                             )}
                           </div>
                        </div>
                     </div>
                     <div className="flex gap-4">
                        {viewingHall.vendor?.whatsapp_number && (
                          <a href={`https://wa.me/${viewingHall.vendor.whatsapp_number}`} target="_blank" className="w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center hover:scale-110 transition-all shadow-lg"><MessageSquare className="w-6 h-6" /></a>
                        )}
                        {viewingHall.vendor?.phone_number && (
                          <a href={`tel:${viewingHall.vendor.phone_number}`} className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center hover:scale-110 transition-all shadow-lg"><Phone className="w-6 h-6" /></a>
                        )}
                        {viewingHall.vendor?.business_email && (
                          <a href={`mailto:${viewingHall.vendor.business_email}`} className="w-14 h-14 rounded-full bg-card border flex items-center justify-center hover:scale-110 transition-all shadow-lg"><Mail className="w-6 h-6" /></a>
                        )}
                     </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="sticky top-12 space-y-6 text-right">
                    <div className="bg-card border rounded-[3.5rem] p-10 shadow-2xl space-y-8 relative overflow-hidden">
                      <div className="space-y-2">
                        <h4 className="text-xl font-black text-right">طلب حجز القاعة</h4>
                        <PriceTag amount={(viewingHall.price_per_night || 0) + (selectedService?.price || 0)} className="text-5xl text-primary" iconSize={36} />
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest text-right">شامل الرسوم التقديرية</p>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center justify-end gap-2 text-right">تاريخ الموعد <CalendarIcon className="w-3.5 h-3.5" /></label>
                          <input type="date" className="w-full h-16 bg-muted/30 border rounded-2xl px-6 outline-none font-black text-lg text-right" value={bookingDate} onChange={e => setBookingDate(e.target.value)} />
                          {isCheckingAvailability ? (
                            <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-end gap-2 animate-pulse text-right">جاري التحقق... <Loader2 className="w-3 h-3 animate-spin" /></div>
                          ) : isAvailable === true ? (
                            <div className="text-[11px] text-green-600 font-black mt-1 text-right">التاريخ متاح للحجز ✓</div>
                          ) : isAvailable === false ? (
                            <div className="text-[11px] text-destructive font-black mt-1 text-right">عذراً، التاريخ غير متاح</div>
                          ) : null}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-dashed">
                           <Input label="اسم العميل" placeholder="ادخل اسمك الكامل" value={clientName} onChange={e => setClientName(e.target.value)} className="h-12 rounded-2xl text-right font-bold" />
                           <Input label="رقم الجوال" placeholder="05xxxxxxxx" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="h-12 rounded-2xl text-right font-bold" />
                           <textarea className="w-full h-24 bg-muted/30 border rounded-2xl p-4 text-xs font-bold outline-none text-right resize-none" placeholder="ملاحظات إضافية..." value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} />
                        </div>
                      </div>

                      <Button className="w-full rounded-[2rem] h-16 font-black text-xl shadow-2xl shadow-primary/30" disabled={!isAvailable || isCheckingAvailability || !clientName || !clientPhone} onClick={handleBook}>
                        {isCheckingAvailability ? 'بانتظار التحقق...' : 'إرسال طلب الحجز'}
                      </Button>
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
