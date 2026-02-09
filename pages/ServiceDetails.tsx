
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Service, UserProfile, VAT_RATE } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { Input } from '../components/ui/Input';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { ArrowRight, Sparkles, User, MessageCircle, Share2, Heart, CheckCircle2, Calendar as CalendarIcon, Phone, Loader2, Image as ImageIcon, Mail, Clock } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Calendar } from '../components/ui/Calendar';
import { format, isBefore, startOfDay, isSameDay, parse } from 'date-fns';
import { normalizeNumbers } from '../utils/helpers';

interface ServiceDetailsProps {
  item: Service & { vendor?: UserProfile };
  user: UserProfile | null;
  onBack: () => void;
}

export const ServiceDetails: React.FC<ServiceDetailsProps> = ({ item, user, onBack }) => {
  const [isBooking, setIsBooking] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<any>(null);
  
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  
  const [guestData, setGuestData] = useState({ name: user?.full_name || '', phone: user?.phone_number || '', email: user?.email || '', notes: '' });
  
  // Payment methods: 'full', 'deposit', 'hold'
  const [paymentMethod, setPaymentMethod] = useState<'full' | 'deposit' | 'hold'>('deposit');

  const { toast } = useToast();

  const allImages = useMemo(() => {
    // Combine main image and portfolio images
    const main = item.image_url ? [item.image_url] : [];
    const portfolio = item.images || [];
    return [...main, ...portfolio];
  }, [item]);

  const basePrice = Number(item.price);
  const vat = basePrice * VAT_RATE;
  const grandTotal = basePrice + vat;
  const depositAmount = grandTotal * 0.30; 

  useEffect(() => {
    const fetchAvailability = async () => {
      const { data: bookingsData } = await supabase.from('bookings').select('booking_date').eq('service_id', item.id).neq('status', 'cancelled');
      if (bookingsData) {
          const dates = bookingsData.map(b => parse(b.booking_date, 'yyyy-MM-dd', new Date()));
          setBlockedDates(dates);
      }
    };
    fetchAvailability();
  }, [item.id]);

  const handleBooking = async () => {
    if (!bookingDate) { toast({ title: 'تنبيه', description: 'يرجى اختيار تاريخ المناسبة', variant: 'destructive' }); return; }
    if (!guestData.name || !guestData.phone || !guestData.email) { toast({ title: 'تنبيه', description: 'يرجى إكمال بيانات التواصل والبريد الإلكتروني', variant: 'destructive' }); return; }

    setIsBooking(true);
    try {
      const normalizedPhone = normalizeNumbers(guestData.phone);
      const status = paymentMethod === 'hold' ? 'on_hold' : 'pending';
      const paymentStatus = paymentMethod === 'full' ? 'paid' : paymentMethod === 'deposit' ? 'partial' : 'unpaid';
      const paidAmount = paymentMethod === 'full' ? grandTotal : paymentMethod === 'deposit' ? depositAmount : 0;
      
      const payload = {
        service_id: item.id,
        vendor_id: item.vendor_id,
        booking_date: format(bookingDate, 'yyyy-MM-dd'),
        total_amount: grandTotal,
        vat_amount: vat,
        paid_amount: paidAmount,
        payment_status: paymentStatus,
        status: status,
        booking_method: paymentMethod,
        guest_name: guestData.name,
        guest_phone: normalizedPhone,
        guest_email: guestData.email,
        user_id: user?.id || null,
        notes: guestData.notes,
        booking_type: 'booking'
      };

      const { data, error } = await supabase.from('bookings').insert([payload]).select().single();
      if (error) throw error;
      
      if (!user) {
          // Sync guest to CRM
          await supabase.from('vendor_clients').insert([{
              vendor_id: item.vendor_id,
              full_name: guestData.name,
              phone_number: normalizedPhone,
              email: guestData.email
          }]);
      }

      setCompletedBooking(data);
      setShowInvoice(true);
      
      if (paymentMethod === 'hold') {
          toast({ title: 'تم الحجز المبدئي', description: 'تم حجز الخدمة مؤقتاً.', variant: 'success' });
      } else {
          toast({ title: 'تم الطلب بنجاح', description: 'تم إصدار الفاتورة وإرسال التفاصيل لبريدك الإلكتروني.', variant: 'success' });
      }

    } catch (e: any) { 
        toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
        setIsBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-20 font-tajawal text-right" dir="rtl">
        
        {/* Navbar */}
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 py-4 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-900 font-bold hover:bg-gray-100 px-4 py-2 rounded-full transition-all">
                <ArrowRight className="w-5 h-5" /> خدمات
            </button>
            <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="rounded-full bg-white"><Share2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="rounded-full bg-white"><Heart className="w-4 h-4" /></Button>
            </div>
            </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid lg:grid-cols-3 gap-8">
                
                {/* --- RIGHT COLUMN (Content) --- */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* 1. Hero Card */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100">
                        <div className="h-[400px] rounded-[2rem] overflow-hidden mb-6 relative bg-gray-100 group">
                            {allImages.length > 0 ? (
                                <img src={allImages[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={item.name} />
                            ) : (
                                <div className="flex h-full items-center justify-center text-gray-300">
                                    <Sparkles className="w-20 h-20" />
                                </div>
                            )}
                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full font-black text-xs flex items-center gap-1 text-orange-600">
                                <Sparkles className="w-4 h-4" /> {item.category}
                            </div>
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900">{item.name}</h1>
                                <p className="text-gray-500 font-bold mt-2 text-sm">مقدم الخدمة: {item.vendor?.business_name || 'شريك معتمد'}</p>
                            </div>
                            <div className="text-left">
                                <span className="text-[10px] font-bold text-gray-400 block mb-1">السعر المبدئي</span>
                                <PriceTag amount={item.price} className="text-2xl font-black text-orange-600" />
                            </div>
                        </div>
                    </div>

                    {/* 2. Description Card */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                        <h3 className="text-xl font-black text-gray-900">تفاصيل الخدمة</h3>
                        <p className="text-gray-600 leading-loose font-medium text-base">{item.description}</p>
                        
                        <div className="flex flex-wrap gap-3 pt-4">
                            <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-orange-100">
                                <CheckCircle2 className="w-4 h-4" /> خدمة موثقة
                            </div>
                            <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-orange-100">
                                <CheckCircle2 className="w-4 h-4" /> التزام بالمواعيد
                            </div>
                        </div>
                    </div>

                    {/* 3. Portfolio (Real Images) */}
                    {allImages.length > 1 && (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-gray-400" /> معرض الأعمال
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {allImages.slice(1).map((img, i) => (
                                    <div key={i} className="aspect-square bg-gray-100 rounded-2xl overflow-hidden group cursor-pointer border border-gray-100">
                                        <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={`Portfolio ${i}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- LEFT COLUMN (Sticky Sidebar) --- */}
                <div className="relative">
                    <div className="sticky top-28 bg-white border border-gray-100 rounded-[2.5rem] p-6 space-y-6">
                        <div className="text-center pb-2 border-b border-gray-50">
                            <h3 className="text-xl font-black text-gray-900">طلب الخدمة</h3>
                            <p className="text-sm text-gray-400 mt-1 font-bold">حدد موعدك واحجز الآن</p>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">تاريخ المناسبة</label>
                            <div className="bg-gray-50 p-2 rounded-[2rem] border border-gray-100">
                                <Calendar 
                                    mode="single" selected={bookingDate} onSelect={setBookingDate}
                                    disabled={(date) => isBefore(date, startOfDay(new Date())) || blockedDates.some(d => isSameDay(d, date))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Input placeholder="الاسم الكريم" value={guestData.name} onChange={e => setGuestData({...guestData, name: e.target.value})} className="h-12 rounded-xl bg-white border-gray-200" />
                            <Input placeholder="رقم الجوال (05xxxxxxxx)" value={guestData.phone} onChange={e => setGuestData({...guestData, phone: normalizeNumbers(e.target.value)})} className="h-12 rounded-xl bg-white border-gray-200" />
                            <div className="relative">
                                <Input 
                                    placeholder="البريد الإلكتروني (للفاتورة)" 
                                    type="email"
                                    value={guestData.email} 
                                    onChange={e => setGuestData({...guestData, email: e.target.value})} 
                                    className="h-12 rounded-xl bg-white border-gray-200 pr-10" 
                                />
                                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            </div>
                            <div className="space-y-2">
                                <textarea 
                                    className="w-full h-20 border border-gray-200 rounded-xl p-3 bg-white outline-none resize-none font-bold text-sm"
                                    placeholder="ملاحظات إضافية..."
                                    value={guestData.notes}
                                    onChange={e => setGuestData({...guestData, notes: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="pt-6 border-t border-gray-100 space-y-3">
                            <div className="flex justify-between text-sm font-bold text-gray-500">
                                <span>سعر الخدمة</span>
                                <PriceTag amount={basePrice} />
                            </div>
                            <div className="flex justify-between text-sm font-bold text-gray-500">
                                <span>الضريبة (15%)</span>
                                <PriceTag amount={vat} />
                            </div>
                            <div className="flex justify-between text-xl font-black text-orange-600 pt-2 border-t border-dashed border-gray-200">
                                <span>الإجمالي</span>
                                <PriceTag amount={grandTotal} />
                            </div>
                        </div>

                        {/* Payment Toggle */}
                        <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-xl">
                                <button onClick={() => setPaymentMethod('deposit')} className={`py-2 rounded-lg text-[10px] font-black transition-all ${paymentMethod === 'deposit' ? 'bg-white shadow text-purple-600' : 'text-gray-400'}`}>عربون (30%)</button>
                                <button onClick={() => setPaymentMethod('full')} className={`py-2 rounded-lg text-[10px] font-black transition-all ${paymentMethod === 'full' ? 'bg-white shadow text-purple-600' : 'text-gray-400'}`}>دفع كامل</button>
                            </div>
                            <button 
                                onClick={() => setPaymentMethod('hold')} 
                                className={`w-full py-2.5 rounded-xl text-[10px] font-black border-2 transition-all flex items-center justify-center gap-2 ${paymentMethod === 'hold' ? 'border-purple-600 text-purple-600 bg-purple-50' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                            >
                                <Clock className="w-3 h-3" /> حجز مبدئي (48 ساعة)
                            </button>
                        </div>

                        <Button onClick={handleBooking} disabled={isBooking} className="w-full h-14 rounded-2xl font-black text-lg bg-gray-900 text-white shadow hover:bg-black transition-all active:scale-95">
                            {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : 
                                (paymentMethod === 'deposit' ? `دفع العربون (${depositAmount.toLocaleString()} ر.س)` : 
                                paymentMethod === 'hold' ? 'تأكيد الحجز المبدئي' : 
                                'دفع وتأكيد الطلب')
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
