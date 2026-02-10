
import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Service, UserProfile, VAT_RATE, Booking } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  MapPin, Loader2, Share2, Heart, ArrowRight, Star,
  Calendar as CalendarIcon, Info, Sparkles, Mail, Check, Tag, Image as ImageIcon, ChevronLeft
} from 'lucide-react';
import { Calendar } from '../components/ui/Calendar';
import { useToast } from '../context/ToastContext';
import { format, isBefore, startOfDay } from 'date-fns';
import { normalizeNumbers } from '../utils/helpers';

interface ServiceDetailsProps {
  item: Service & { vendor?: UserProfile };
  user: UserProfile | null;
  onBack: () => void;
}

export const ServiceDetails: React.FC<ServiceDetailsProps> = ({ item, user, onBack }) => {
  const [isBooking, setIsBooking] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);
  
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [guestData, setGuestData] = useState({ name: user?.full_name || '', phone: user?.phone_number || '', email: user?.email || '' });
  
  const [paymentMethod, setPaymentMethod] = useState<'full' | 'deposit'>('full');

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; amount: number } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const { toast } = useToast();

  const allImages = useMemo(() => {
    // Combine main image and portfolio images
    const main = item.image_url ? [item.image_url] : [];
    const portfolio = item.images || [];
    // Filter duplicates just in case
    return Array.from(new Set([...main, ...portfolio]));
  }, [item]);

  const basePrice = Number(item.price);
  
  const discountAmount = appliedCoupon ? appliedCoupon.amount : 0;
  const taxableAmount = Math.max(0, basePrice - discountAmount);

  const vat = taxableAmount * VAT_RATE;
  const grandTotal = taxableAmount + vat;
  const depositAmount = grandTotal * 0.30; 

  const handleApplyCoupon = async () => {
      if (!couponCode) return;
      setValidatingCoupon(true);
      try {
          const { data, error } = await supabase.from('coupons')
            .select('*')
            .eq('code', couponCode.toUpperCase())
            .eq('vendor_id', item.vendor_id)
            .eq('is_active', true)
            .maybeSingle();
          
          if (error || !data) {
              toast({ title: 'كود غير صالح', description: 'تأكد من صحة الكود.', variant: 'destructive' });
              setAppliedCoupon(null);
              return;
          }

          const today = new Date().toISOString().split('T')[0];
          if (data.start_date > today || data.end_date < today) {
              toast({ title: 'منتهي الصلاحية', description: 'هذا الكوبون غير ساري حالياً.', variant: 'destructive' });
              setAppliedCoupon(null);
              return;
          }

          if (data.target_ids && data.target_ids.length > 0 && !data.target_ids.includes(item.id)) {
              toast({ title: 'غير مخصص', description: 'هذا الكوبون لا يشمل هذه الخدمة.', variant: 'destructive' });
              setAppliedCoupon(null);
              return;
          }

          let discountVal = 0;
          if (data.discount_type === 'percentage') {
              discountVal = basePrice * (data.discount_value / 100);
          } else {
              discountVal = data.discount_value;
          }
          discountVal = Math.min(discountVal, basePrice);

          setAppliedCoupon({ code: data.code, amount: discountVal });
          toast({ title: 'تم تطبيق الخصم', description: `تم خصم ${discountVal} ر.س بنجاح.`, variant: 'success' });

      } catch (err) {
          console.error(err);
          toast({ title: 'خطأ', description: 'حدث خطأ أثناء التحقق.', variant: 'destructive' });
      } finally {
          setValidatingCoupon(false);
      }
  };

  const handleBooking = async () => {
    if (!bookingDate) { toast({ title: 'تنبيه', description: 'الرجاء اختيار تاريخ المناسبة', variant: 'destructive' }); return; }
    if (!guestData.name || !guestData.phone || !guestData.email) { toast({ title: 'تنبيه', description: 'الرجاء إكمال كافة بيانات التواصل.', variant: 'destructive' }); return; }

    setIsBooking(true);
    try {
      const normalizedPhone = normalizeNumbers(guestData.phone);
      const paymentStatus = paymentMethod === 'full' ? 'paid' : 'partial';
      const paidAmount = paymentMethod === 'full' ? grandTotal : depositAmount;

      const payload = {
        service_id: item.id,
        hall_id: null,
        chalet_id: null,
        vendor_id: item.vendor_id,
        booking_date: format(bookingDate, 'yyyy-MM-dd'),
        total_amount: grandTotal,
        vat_amount: vat,
        paid_amount: paidAmount,
        discount_amount: discountAmount,
        applied_coupon: appliedCoupon?.code,
        payment_status: paymentStatus,
        status: 'pending',
        booking_method: paymentMethod,
        guest_name: guestData.name,
        guest_phone: normalizedPhone,
        guest_email: guestData.email,
        user_id: user?.id || null,
        items: [{ name: item.name, price: item.price, qty: 1, type: 'service' as const }]
      };

      const { data, error } = await supabase.from('bookings').insert([payload]).select().single();
      if (error) throw error;
      
      if (!user) {
          await supabase.from('vendor_clients').insert([{
              vendor_id: item.vendor_id,
              full_name: guestData.name,
              phone_number: normalizedPhone,
              email: guestData.email
          }]);
      }

      setCompletedBooking(data as any);
      setShowInvoice(true);
      toast({ title: 'تم الطلب بنجاح', description: 'تم إصدار الفاتورة وإرسال التفاصيل لبريدك الإلكتروني.', variant: 'success' });

    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { setIsBooking(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-20 font-tajawal text-right" dir="rtl">
      
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 py-4 shadow-sm">
        <div className="w-full max-w-[1920px] mx-auto px-6 lg:px-12 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold hover:bg-gray-100 px-4 py-2 rounded-full transition-all">
               <ArrowRight className="w-5 h-5" /> رجوع
             </button>
             {/* Breadcrumbs */}
             <nav className="hidden md:flex text-xs font-bold text-gray-400 items-center">
                <span>الرئيسية</span>
                <ChevronLeft className="w-4 h-4 mx-1" />
                <span>الخدمات</span>
                <ChevronLeft className="w-4 h-4 mx-1" />
                <span className="text-orange-600">{item.name}</span>
             </nav>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-full bg-white"><Share2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="rounded-full bg-white"><Heart className="w-4 h-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 space-y-8">
                {/* Hero Card */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100">
                    <div className="h-[400px] md:h-[500px] rounded-[2rem] overflow-hidden mb-6 relative group">
                        <img src={allImages[0] || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={item.name} />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full font-black text-xs flex items-center gap-1 text-orange-600">
                            <Sparkles className="w-4 h-4" /> خدمة مناسبات
                        </div>
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900">{item.name}</h1>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="text-gray-500 font-bold text-sm bg-gray-50 px-3 py-1 rounded-lg">{item.category}</span>
                                <span className="flex items-center gap-1 text-yellow-500 text-xs font-black bg-yellow-50 px-2 py-1 rounded-lg"><Star className="w-3 h-3 fill-current" /> 4.9</span>
                            </div>
                        </div>
                        <div className="text-left">
                            <span className="text-[10px] font-bold text-gray-400 block mb-1">يبدأ من</span>
                            <PriceTag amount={item.price} className="text-2xl font-black text-orange-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><Info className="w-5 h-5 text-gray-400" /> تفاصيل الخدمة</h3>
                    <p className="text-gray-600 leading-loose font-medium text-base">{item.description}</p>
                    
                    {item.service_areas && item.service_areas.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                            <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> مناطق الخدمة:</span>
                            {item.service_areas.map((area, i) => (
                                <span key={i} className="text-[10px] bg-gray-50 px-2 py-1 rounded-lg font-bold text-gray-600">{area}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Portfolio / Previous Work Gallery */}
                {allImages.length > 1 && (
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-primary" /> معرض الأعمال
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {allImages.slice(1).map((img, i) => (
                                <div key={i} className="aspect-square rounded-2xl overflow-hidden group cursor-pointer border border-gray-100 relative">
                                    <img 
                                        src={img} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                        alt={`Portfolio ${i}`} 
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Sidebar */}
            <div className="relative">
                <div className="sticky top-28 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-xl space-y-6">
                    <div className="text-center pb-2 border-b border-gray-50">
                        <h3 className="text-xl font-black text-gray-900">طلب الخدمة</h3>
                        <p className="text-sm text-gray-400 mt-1 font-bold">احجز موعد التنفيذ الآن</p>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">تاريخ المناسبة</label>
                        <div className="bg-gray-50 p-4 rounded-[2rem] border border-gray-100">
                            <Calendar 
                                mode="single" selected={bookingDate} onSelect={setBookingDate}
                                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Input placeholder="الاسم الكريم" value={guestData.name} onChange={e => setGuestData({...guestData, name: e.target.value})} className="h-12 rounded-xl bg-white border-gray-200" />
                        <Input placeholder="رقم الجوال" value={guestData.phone} onChange={e => setGuestData({...guestData, phone: normalizeNumbers(e.target.value)})} className="h-12 rounded-xl bg-white border-gray-200" />
                        <div className="relative">
                            <Input 
                                placeholder="البريد الإلكتروني" 
                                type="email"
                                value={guestData.email} 
                                onChange={e => setGuestData({...guestData, email: e.target.value})} 
                                className="h-12 rounded-xl bg-white border-gray-200 pr-10" 
                            />
                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 space-y-3">
                        <div className="flex justify-between text-sm font-bold text-gray-500">
                            <span>السعر</span>
                            <PriceTag amount={basePrice} />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <div className="relative flex-1">
                                <input 
                                    className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-bold focus:bg-white transition-colors"
                                    placeholder="كود الخصم"
                                    value={couponCode}
                                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                    disabled={!!appliedCoupon}
                                />
                                <Tag className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                            {appliedCoupon ? (
                                <Button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} variant="destructive" className="h-10 rounded-xl px-3 text-xs font-bold">إزالة</Button>
                            ) : (
                                <Button onClick={handleApplyCoupon} disabled={!couponCode || validatingCoupon} className="h-10 rounded-xl px-3 text-xs font-bold bg-gray-900 text-white shadow-none">
                                    {validatingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : 'تطبيق'}
                                </Button>
                            )}
                        </div>
                        {appliedCoupon && (
                            <div className="flex justify-between text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                <span>خصم كوبون ({appliedCoupon.code})</span>
                                <span>- {appliedCoupon.amount} ر.س</span>
                            </div>
                        )}

                        <div className="flex justify-between text-sm font-bold text-gray-500">
                            <span>الضريبة (15%)</span>
                            <PriceTag amount={vat} />
                        </div>
                        <div className="flex justify-between text-xl font-black text-orange-600 pt-2 border-t border-dashed border-gray-200">
                            <span>الإجمالي</span>
                            <PriceTag amount={grandTotal} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-xl">
                            <button onClick={() => setPaymentMethod('deposit')} className={`py-2 rounded-lg text-[10px] font-black transition-all ${paymentMethod === 'deposit' ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`}>عربون (30%)</button>
                            <button onClick={() => setPaymentMethod('full')} className={`py-2 rounded-lg text-[10px] font-black transition-all ${paymentMethod === 'full' ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`}>دفع كامل</button>
                        </div>
                    </div>

                    <Button onClick={handleBooking} disabled={isBooking} className="w-full h-14 rounded-2xl font-black text-lg bg-gray-900 text-white shadow-xl hover:bg-black transition-all active:scale-95">
                        {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : 
                            (paymentMethod === 'deposit' ? `دفع العربون (${depositAmount.toLocaleString()} ر.س)` : 'دفع وتأكيد الطلب')
                        }
                    </Button>
                </div>
            </div>

        </div>
      </div>
      {showInvoice && completedBooking && <InvoiceModal isOpen={showInvoice} onClose={() => { setShowInvoice(false); onBack(); }} booking={completedBooking} />}
    </div>
  );
};
