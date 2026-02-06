
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, VAT_RATE, HALL_AMENITIES, POSItem, Coupon, BookingItem, Booking } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { Badge } from '../components/ui/Badge';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  MapPin, Users, Star, Share2, Heart, ChevronRight, ChevronLeft,
  CheckCircle2, Loader2, Sparkles, 
  ShieldCheck, Clock, CreditCard, ArrowLeft, X, User, Phone, Wallet, Eye,
  Briefcase, ShoppingBag, Plus, Package, Store, Ticket, MessageCircle, AlertCircle, Minus
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
  
  // Invoice State
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

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
    setViewersCount(Math.floor(Math.random() * (380 - 100 + 1)) + 100);
  }, []);

  const fetchDetails = useCallback(async () => {
    if (isHall) {
      const { data: bookingsData } = await supabase.from('bookings').select('booking_date').eq('hall_id', item.id).neq('status', 'cancelled');
      if (bookingsData) setBlockedDates(bookingsData.map(b => parseISO(b.booking_date)));

      const { data: vServices } = await supabase.from('services').select('*').eq('vendor_id', item.vendor_id).eq('is_active', true);
      setVendorServices(vServices || []);

      const { data: vStore } = await supabase.from('pos_items').select('*').eq('vendor_id', item.vendor_id);
      setStoreItems(vStore || []);

      const { data: pServices } = await supabase.from('services').select('*, vendor:vendor_id(business_name)').neq('vendor_id', item.vendor_id).eq('is_active', true).limit(4);
      setPartnerServices(pServices as any || []);
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

  // Calculations
  const basePrice = isHall ? Number(hall!.price_per_night) : Number(service!.price);
  const itemsTotal = useMemo(() => selectedItems.reduce((sum, i) => sum + (i.price * i.qty), 0), [selectedItems]);
  const subTotal = basePrice + itemsTotal;
  
  // Calculate Discount
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

  // Coupon Logic
  const applyCoupon = async () => {
    if (!couponCodeInput) return;
    setIsVerifyingCoupon(true);
    try {
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('vendor_id', item.vendor_id)
            .eq('code', couponCodeInput.toUpperCase())
            .eq('is_active', true)
            .gte('end_date', new Date().toISOString().split('T')[0])
            .maybeSingle();

        if (error || !data) {
            toast({ title: 'كوبون غير صالح', description: 'تأكد من الرمز.', variant: 'destructive' });
            setAppliedCoupon(null);
        } else {
            const targetIds = data.target_ids || [];
            const isApplicableToMain = targetIds.length === 0 || targetIds.includes(item.id);
            if (!isApplicableToMain) {
                toast({ title: 'تنبيه', description: 'الكوبون لا يشمل هذا المنتج.', variant: 'warning' });
                return;
            }
            setAppliedCoupon(data as Coupon);
            toast({ title: 'تم تطبيق الخصم', variant: 'success' });
        }
    } catch (err) { console.error(err); } finally { setIsVerifyingCoupon(false); }
  };

  // Wizard Navigation
  const checkAvailability = () => {
    if (!bookingDate) return false;
    if (isBefore(bookingDate, startOfDay(new Date()))) {
        toast({ title: 'تاريخ غير صالح', variant: 'destructive' });
        return false;
    }
    if (blockedDates.some(d => isSameDay(d, bookingDate))) {
        toast({ title: 'محجوز مسبقاً', variant: 'destructive' });
        return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1) {
        if (!bookingDate) { toast({ title: 'اختر التاريخ', variant: 'destructive' }); return; }
        if (startTime >= endTime) { toast({ title: 'تحقق من الوقت', variant: 'destructive' }); return; }
        if (!checkAvailability()) return;
        setStep(2);
    } else if (step === 2) {
        setStep(3);
    } else if (step === 3) {
        if (!guestName || !guestPhone) { toast({ title: 'أكمل البيانات', variant: 'destructive' }); return; }
        setStep(4);
    }
  };

  const handleBookingSubmission = async () => {
    if (bookingType === 'booking') {
        if (paymentMethod === 'credit_card' && (!cardData.number || !cardData.cvc)) {
            toast({ title: 'بيانات البطاقة ناقصة', variant: 'destructive' });
            return;
        }
        if (paymentMethod === 'cash' && cashType === 'deposit' && depositAmount <= 0) {
            toast({ title: 'أدخل مبلغ المقدم', variant: 'destructive' });
            return;
        }
    }

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
              if (cashType === 'full') {
                  calculatedPaidAmount = total;
                  paymentStatus = 'paid';
              } else {
                  calculatedPaidAmount = depositAmount;
                  paymentStatus = 'partial';
              }
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
        notes: `النوع: ${bookingType === 'consultation' ? 'استشارة' : 'حجز'} - الدفع: ${paymentMethod}`
      };

      const { data, error } = await supabase.from('bookings').insert([payload]).select().single();
      if (error) throw error;

      // Prepare data for invoice modal (Need to augment with hall/vendor details since insert result is lean)
      const fullBookingDetails = {
          ...data,
          halls: isHall ? hall : undefined,
          services: !isHall ? service : undefined,
          vendor: { business_name: item.vendor?.business_name, pos_config: item.vendor?.pos_config }
      };

      setCompletedBooking(fullBookingDetails as any);
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
    <div className="bg-[#F8F9FC] min-h-screen animate-in fade-in duration-500 pt-24 pb-20">
      <main className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
         
         <div className="relative w-full aspect-[16/9] md:h-[500px] md:aspect-auto rounded-[2.5rem] overflow-hidden bg-black group mb-10 shadow-2xl">
            {allImages.map((img, i) => (
               <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === activeSlide ? 'opacity-100' : 'opacity-0'}`}>
                  <img src={img} className="w-full h-full object-cover" alt="Venue" />
               </div>
            ))}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
               {allImages.map((_, i) => <button key={i} onClick={() => setActiveSlide(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeSlide ? 'w-8 bg-white' : 'w-2 bg-white/40'}`} />)}
            </div>
         </div>

         <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 space-y-8">
               <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100 space-y-6">
                  <div className="flex flex-wrap items-center gap-4">
                     <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs gap-1"><Sparkles className="w-3 h-3" /> موصى به</Badge>
                     {isHall && <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{hall?.capacity} ضيف</span>}
                  </div>
                  <h2 className="text-4xl font-black text-gray-900 leading-tight">{item.name}</h2>
                  <p className="text-gray-600 leading-loose text-lg font-medium">{item.description || "استمتع بتجربة فريدة ومميزة."}</p>
                  
                  {isHall && (hall?.address || hall?.city) && (
                      <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-2xl text-sm font-bold text-gray-700">
                          <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <div>
                              <p>{hall.city} {hall.address ? ` - ${hall.address}` : ''}</p>
                              <a href={`https://maps.google.com/?q=${hall.latitude || 24.7136},${hall.longitude || 46.6753}`} target="_blank" className="text-xs text-primary underline mt-1 block">عرض على الخريطة</a>
                          </div>
                      </div>
                  )}
               </div>

               {/* Services/Amenities */}
               {isHall && (
                  <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100 space-y-6">
                     <h3 className="text-xl font-black flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> الخدمات والمرافق</h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(hall?.amenities?.length ? hall.amenities : HALL_AMENITIES).map((amenity, i) => (
                           <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-700">
                              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> {amenity}
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 relative">
               <div className="sticky top-24 space-y-6">
                  <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl shadow-gray-200/50 space-y-6">
                     <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                        <div className="text-right">
                           <p className="text-xs font-bold text-gray-400 mb-1">السعر يبدأ من</p>
                           <PriceTag amount={basePrice} className="text-3xl font-black text-primary" />
                        </div>
                        <span className="text-xs font-bold text-gray-400">/{isHall ? 'الليلة' : 'الخدمة'}</span>
                     </div>
                     <Button onClick={() => { setStep(1); setIsWizardOpen(true); }} className="w-full h-16 rounded-[1.5rem] text-xl font-black shadow-xl shadow-primary/20 bg-primary text-white">
                        احجز موعدك الآن
                     </Button>
                  </div>
               </div>
            </div>
         </div>
      </main>

      {/* Booking Wizard */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
              
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                 <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs">{step}</span>
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                        {step === 1 ? 'الموعد' : step === 2 ? 'المتجر والخدمات' : step === 3 ? 'البيانات' : 'الدفع'}
                    </span>
                 </div>
                 <button onClick={() => setIsWizardOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                 {/* Step 1: Date */}
                 {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <h3 className="text-2xl font-black text-center">متى ستكون مناسبتك؟</h3>
                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                            <label className="block text-xs font-black text-gray-400 uppercase mb-3">تاريخ اليوم</label>
                            <input type="date" value={bookingDate ? format(bookingDate, 'yyyy-MM-dd') : ''} onChange={(e) => setBookingDate(e.target.value ? parseISO(e.target.value) : undefined)} min={new Date().toISOString().split('T')[0]} className="w-full h-14 bg-white border border-gray-200 rounded-2xl px-5 font-black outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="وقت الدخول" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-12 rounded-xl text-center font-bold" />
                            <Input label="وقت الخروج" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-12 rounded-xl text-center font-bold" />
                        </div>
                    </div>
                 )}

                 {/* Step 2: Store & Services */}
                 {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                        <div className="text-center"><h3 className="text-2xl font-black">إضافات مميزة</h3><p className="text-sm text-gray-500 font-bold">أضف منتجات وخدمات لحجزك.</p></div>
                        
                        {/* Services */}
                        {vendorServices.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-gray-400 uppercase">الخدمات المتاحة</h4>
                                {vendorServices.map(s => (
                                    <div key={s.id} onClick={() => toggleService(s)} className={`flex justify-between p-4 rounded-2xl border cursor-pointer ${selectedItems.some(i => i.id === s.id) ? 'bg-primary/5 border-primary' : 'bg-white'}`}>
                                        <div className="flex gap-3 items-center">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedItems.some(i => i.id === s.id) ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                                                {selectedItems.some(i => i.id === s.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            </div>
                                            <span className="font-bold text-sm">{s.name}</span>
                                        </div>
                                        <PriceTag amount={s.price} className="text-sm font-black" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Products Store */}
                        {storeItems.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-gray-400 uppercase flex items-center gap-2"><Store className="w-4 h-4" /> متجر القاعة</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {storeItems.map(p => {
                                        const inCart = selectedItems.find(i => i.id === p.id && i.type === 'product');
                                        return (
                                            <div key={p.id} className="p-3 border rounded-2xl bg-white text-center space-y-2">
                                                <div className="h-20 bg-gray-50 rounded-xl flex items-center justify-center"><Package className="w-8 h-8 text-gray-300" /></div>
                                                <p className="font-bold text-xs truncate">{p.name}</p>
                                                <PriceTag amount={p.price} className="justify-center text-xs font-black" />
                                                {inCart ? (
                                                    <div className="flex justify-center items-center gap-2 bg-gray-100 rounded-lg p-1">
                                                        <button onClick={() => removeFromCart(p.id, 'product')} className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center font-bold">-</button>
                                                        <span className="text-xs font-black">{inCart.qty}</span>
                                                        <button onClick={() => addToCart(p)} className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center font-bold">+</button>
                                                    </div>
                                                ) : (
                                                    <Button size="sm" onClick={() => addToCart(p)} className="w-full h-8 text-xs font-bold bg-gray-900 text-white">إضافة</Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Coupon */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400">كوبون الخصم</label>
                            <div className="flex gap-2">
                                <Input placeholder="CODE" value={couponCodeInput} onChange={e => setCouponCodeInput(e.target.value)} className="h-10 text-center uppercase font-bold" />
                                <Button onClick={applyCoupon} disabled={!couponCodeInput || isVerifyingCoupon} className="h-10 px-4 font-bold">{isVerifyingCoupon ? <Loader2 className="animate-spin" /> : 'تطبيق'}</Button>
                            </div>
                            {appliedCoupon && <div className="text-green-600 text-xs font-bold flex items-center gap-1"><Ticket className="w-3 h-3" /> تم تفعيل الكوبون</div>}
                        </div>
                    </div>
                 )}

                 {/* Step 3: Info */}
                 {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <h3 className="text-2xl font-black text-center">لمن هذا الحجز؟</h3>
                        <div className="space-y-4">
                            <Input label="الاسم الكامل" value={guestName} onChange={e => setGuestName(e.target.value)} className="h-14 rounded-2xl font-black" icon={<User className="w-5 h-5" />} />
                            <Input label="رقم الجوال" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="h-14 rounded-2xl font-black" icon={<Phone className="w-5 h-5" />} />
                        </div>
                    </div>
                 )}

                 {/* Step 4: Pay */}
                 {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <h3 className="text-2xl font-black text-center">إتمام الطلب</h3>
                        
                        {/* Summary Card */}
                        <div className="bg-gray-900 text-white p-6 rounded-[2rem] space-y-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <div className="flex justify-between text-white/70 text-sm font-bold"><span>السعر الأساسي</span><PriceTag amount={subTotal} className="text-white" /></div>
                            {discountAmount > 0 && <div className="flex justify-between text-red-400 text-sm font-bold"><span>الخصم</span><span>-{discountAmount}</span></div>}
                            {bookingType !== 'consultation' && <div className="flex justify-between text-white/70 text-xs border-t border-white/10 pt-2"><span>الضريبة (15%)</span><PriceTag amount={vat} className="text-white" /></div>}
                            <div className="flex justify-between text-2xl font-black pt-2 border-t border-white/20"><span>الإجمالي</span><PriceTag amount={total} className="text-white" /></div>
                        </div>

                        {/* Payment Options */}
                        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                            <button onClick={() => setBookingType('booking')} className={`flex-1 py-3 rounded-lg text-xs font-black transition-all ${bookingType === 'booking' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>حجز مؤكد</button>
                            <button onClick={() => setBookingType('consultation')} className={`flex-1 py-3 rounded-lg text-xs font-black transition-all ${bookingType === 'consultation' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>مجرد استشارة</button>
                        </div>

                        {bookingType === 'booking' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setPaymentMethod('credit_card')} className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${paymentMethod === 'credit_card' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400'}`}>
                                        <CreditCard className="w-6 h-6" /> <span className="text-xs font-black">بطاقة (مدى/فيزا)</span>
                                    </button>
                                    <button onClick={() => setPaymentMethod('cash')} className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400'}`}>
                                        <Wallet className="w-6 h-6" /> <span className="text-xs font-black">نقدي / تحويل</span>
                                    </button>
                                </div>

                                {paymentMethod === 'credit_card' && (
                                    <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <Input placeholder="رقم البطاقة" value={cardData.number} onChange={e => setCardData({...cardData, number: e.target.value})} className="bg-white text-center font-mono h-11" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input placeholder="MM/YY" value={cardData.expiry} onChange={e => setCardData({...cardData, expiry: e.target.value})} className="bg-white text-center font-mono h-11" />
                                            <Input placeholder="CVC" value={cardData.cvc} onChange={e => setCardData({...cardData, cvc: e.target.value})} className="bg-white text-center font-mono h-11" />
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === 'cash' && (
                                    <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex gap-2 mb-3">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="cashType" checked={cashType === 'full'} onChange={() => setCashType('full')} className="accent-primary w-4 h-4" />
                                                <span className="text-xs font-bold">دفع كامل</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="cashType" checked={cashType === 'deposit'} onChange={() => setCashType('deposit')} className="accent-primary w-4 h-4" />
                                                <span className="text-xs font-bold">عربون (مقدم)</span>
                                            </label>
                                        </div>
                                        {cashType === 'deposit' && (
                                            <div>
                                                <Input type="number" placeholder="مبلغ العربون" value={depositAmount || ''} onChange={e => setDepositAmount(Number(e.target.value))} className="bg-white font-bold h-11" />
                                                <p className="text-[10px] text-gray-400 mt-1 font-bold text-left">المتبقي: {Math.max(0, total - depositAmount)} ر.س</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {bookingType === 'consultation' && (
                            <div className="bg-blue-50 text-blue-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border border-blue-100">
                                <MessageCircle className="w-5 h-5" /> سيتم إرسال الطلب للاستفسار، وسيقوم الفريق بالتواصل معك دون دفع أي رسوم حالياً.
                            </div>
                        )}
                    </div>
                 )}
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
                 {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} className="h-14 px-8 rounded-2xl font-black border-2"><ArrowLeft className="w-5 h-5" /></Button>}
                 <Button onClick={step < 4 ? handleNextStep : handleBookingSubmission} disabled={isBooking} className="flex-1 h-14 rounded-2xl font-black text-xl shadow-2xl shadow-primary/20 bg-primary text-white">
                    {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : (step < 4 ? 'متابعة' : (bookingType === 'consultation' ? 'إرسال الاستفسار' : 'تأكيد ودفع'))}
                 </Button>
              </div>
           </div>
        </div>
      )}

      {/* Invoice Modal Triggered after success */}
      {showInvoice && completedBooking && (
          <InvoiceModal isOpen={showInvoice} onClose={() => { setShowInvoice(false); onBack(); }} booking={completedBooking} />
      )}
    </div>
  );
};
