
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Chalet, UserProfile, VAT_RATE, CHALET_AMENITIES, Booking, HallAddon } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  MapPin, CheckCircle2, Loader2, Share2, Heart, ArrowRight, Star,
  Calendar as CalendarIcon, Info, Sparkles, Check, Users, Clock, Mail, Palmtree
} from 'lucide-react';
import { Calendar } from '../components/ui/Calendar';
import { useToast } from '../context/ToastContext';
import { format, isBefore, startOfDay, parse, isSameDay } from 'date-fns';
import { normalizeNumbers } from '../utils/helpers';

interface ChaletDetailsProps {
  item: Chalet & { vendor?: UserProfile };
  user: UserProfile | null;
  onBack: () => void;
}

export const ChaletDetails: React.FC<ChaletDetailsProps> = ({ item, user, onBack }) => {
  const [isBooking, setIsBooking] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [guestData, setGuestData] = useState({ name: user?.full_name || '', phone: user?.phone_number || '', email: user?.email || '' });
  
  const [selectedAddons, setSelectedAddons] = useState<HallAddon[]>([]);
  
  const [paymentMethod, setPaymentMethod] = useState<'full' | 'deposit' | 'hold'>('deposit');

  const { toast } = useToast();

  const allImages = useMemo(() => {
    const imgs = item.images && item.images.length > 0 ? item.images : [item.image_url].filter(Boolean);
    return imgs.length > 0 ? imgs : ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'];
  }, [item]);

  const basePrice = Number(item.price_per_night);
  
  const subTotal = useMemo(() => {
    let sum = basePrice;
    sum += selectedAddons.reduce((s, a) => s + Number(a.price), 0);
    return sum;
  }, [selectedAddons, basePrice]);

  const vat = subTotal * VAT_RATE;
  const grandTotal = subTotal + vat;
  const depositAmount = grandTotal * 0.30; 
  
  useEffect(() => {
    const fetchAvailability = async () => {
      const { data: bookingsData } = await supabase.from('bookings').select('booking_date').eq('chalet_id', item.id).neq('status', 'cancelled');
      if (bookingsData) {
          const dates = bookingsData.map(b => parse(b.booking_date, 'yyyy-MM-dd', new Date()));
          setBlockedDates(dates);
      }
    };
    fetchAvailability();
  }, [item.id]);

  const toggleAddon = (addon: HallAddon) => {
      setSelectedAddons(prev => prev.some(a => a.name === addon.name) ? prev.filter(a => a.name !== addon.name) : [...prev, addon]);
  };

  const handleBooking = async () => {
    if (!bookingDate) { toast({ title: 'تنبيه', description: 'الرجاء اختيار تاريخ الحجز', variant: 'destructive' }); return; }
    if (!guestData.name || !guestData.phone || !guestData.email) { toast({ title: 'تنبيه', description: 'الرجاء إكمال كافة بيانات التواصل بما فيها البريد الإلكتروني لاستلام الفاتورة.', variant: 'destructive' }); return; }

    setIsBooking(true);
    try {
      const normalizedPhone = normalizeNumbers(guestData.phone);
      const status = paymentMethod === 'hold' ? 'on_hold' : 'pending';
      const paymentStatus = paymentMethod === 'full' ? 'paid' : paymentMethod === 'deposit' ? 'partial' : 'unpaid';
      const paidAmount = paymentMethod === 'full' ? grandTotal : paymentMethod === 'deposit' ? depositAmount : 0;

      const payload = {
        chalet_id: item.id,
        hall_id: null,
        service_id: null,
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
        items: [
            ...selectedAddons.map(addon => ({ name: addon.name, price: addon.price, qty: 1, type: 'addon' as const }))
        ]
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
      if (paymentMethod === 'hold') {
          toast({ title: 'تم الحجز المبدئي', description: 'تم حجز الموعد لمدة 48 ساعة. يرجى الدفع للتأكيد.', variant: 'success' });
      } else {
          toast({ title: 'تم الطلب بنجاح', description: 'تم إصدار الفاتورة وإرسال التفاصيل لبريدك الإلكتروني.', variant: 'success' });
      }

    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { setIsBooking(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-20 font-tajawal text-right" dir="rtl">
      
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-900 font-bold hover:bg-gray-100 px-4 py-2 rounded-full transition-all">
            <ArrowRight className="w-5 h-5" /> الشاليهات
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-full bg-white"><Share2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="rounded-full bg-white"><Heart className="w-4 h-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="h-[400px] rounded-[2rem] overflow-hidden mb-6 relative group">
                        <img src={allImages[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={item.name} />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full font-black text-xs flex items-center gap-1 text-blue-600">
                            <Palmtree className="w-4 h-4" /> شاليه / منتجع
                        </div>
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900">{item.name}</h1>
                            <div className="flex items-center gap-4 mt-2">
                                <p className="text-gray-500 font-bold flex items-center gap-2 text-sm"><MapPin className="w-4 h-4" /> {item.city}</p>
                                <span className="flex items-center gap-1 text-yellow-500 text-xs font-black bg-yellow-50 px-2 py-1 rounded-lg"><Star className="w-3 h-3 fill-current" /> 4.9</span>
                            </div>
                        </div>
                        <div className="text-left">
                            <span className="text-[10px] font-bold text-gray-400 block mb-1">سعر الليلة</span>
                            <PriceTag amount={item.price_per_night} className="text-2xl font-black text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><Info className="w-5 h-5 text-gray-400" /> تفاصيل المكان</h3>
                    <p className="text-gray-600 leading-loose font-medium text-base">{item.description}</p>
                    
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-50">
                        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                            <Users className="w-4 h-4" /> السعة: {item.capacity || '-'}
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
                    <h3 className="text-xl font-black text-gray-900">المرافق والخدمات</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {(item.amenities?.length ? item.amenities : CHALET_AMENITIES).map((amenity, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/50 border border-gray-100 text-sm font-bold text-gray-700">
                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> {amenity}
                            </div>
                        ))}
                    </div>
                </div>

                {item.addons && item.addons.length > 0 && (
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" /> خدمات إضافية
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {item.addons.map((addon, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => toggleAddon(addon)}
                                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${selectedAddons.some(a => a.name === addon.name) ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedAddons.some(a => a.name === addon.name) ? 'bg-primary border-primary text-white' : 'border-gray-300 bg-white'}`}>
                                            {selectedAddons.some(a => a.name === addon.name) && <Check className="w-3 h-3" />}
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
            </div>

            <div className="relative">
                <div className="sticky top-28 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-xl space-y-6">
                    <div className="text-center pb-2 border-b border-gray-50">
                        <h3 className="text-xl font-black text-gray-900">إتمام الحجز</h3>
                        <p className="text-sm text-gray-400 mt-1 font-bold">احجز موعد استمتاعك الآن</p>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">اختر التاريخ</label>
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
                            <span>السعر الأساسي</span>
                            <PriceTag amount={basePrice} />
                        </div>
                        {selectedAddons.length > 0 && (
                            <div className="flex justify-between text-sm font-bold text-gray-500">
                                <span>إضافات ({selectedAddons.length})</span>
                                <PriceTag amount={selectedAddons.reduce((s, a) => s + a.price, 0)} />
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-bold text-gray-500">
                            <span>الضريبة (15%)</span>
                            <PriceTag amount={vat} />
                        </div>
                        <div className="flex justify-between text-xl font-black text-blue-600 pt-2 border-t border-dashed border-gray-200">
                            <span>الإجمالي</span>
                            <PriceTag amount={grandTotal} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-xl">
                            <button onClick={() => setPaymentMethod('deposit')} className={`py-2 rounded-lg text-[10px] font-black transition-all ${paymentMethod === 'deposit' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>عربون (30%)</button>
                            <button onClick={() => setPaymentMethod('full')} className={`py-2 rounded-lg text-[10px] font-black transition-all ${paymentMethod === 'full' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>دفع كامل</button>
                        </div>
                        <button 
                            onClick={() => setPaymentMethod('hold')} 
                            className={`w-full py-2.5 rounded-xl text-[10px] font-black border-2 transition-all flex items-center justify-center gap-2 ${paymentMethod === 'hold' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                        >
                            <Clock className="w-3 h-3" /> حجز مبدئي (48 ساعة)
                        </button>
                    </div>

                    <Button onClick={handleBooking} disabled={isBooking} className="w-full h-14 rounded-2xl font-black text-lg bg-gray-900 text-white shadow-xl hover:bg-black transition-all active:scale-95">
                        {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : 
                            (paymentMethod === 'deposit' ? `دفع العربون (${depositAmount.toLocaleString()} ر.س)` : 
                             paymentMethod === 'hold' ? 'تأكيد الحجز المبدئي' : 
                             'دفع وتأكيد الحجز')
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
