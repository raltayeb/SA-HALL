
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, VAT_RATE, Booking, HallAddon } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  MapPin, CheckCircle2, Loader2, Share2, Heart, ArrowRight, Star,
  AlertCircle, Palmtree, Users, Calendar, Plus, Minus, CreditCard, Lock, Clock, Mail
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { format, differenceInCalendarDays, addDays, isSameDay } from 'date-fns';
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from '../components/ui/DatePickerWithRange';
import { Modal } from '../components/ui/Modal'; 
import { normalizeNumbers } from '../utils/helpers';

interface ChaletDetailsProps {
  item: Hall & { vendor?: UserProfile };
  user: UserProfile | null;
  onBack: () => void;
}

export const ChaletDetails: React.FC<ChaletDetailsProps> = ({ item, user, onBack }) => {
  const [isBooking, setIsBooking] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  
  const [guestData, setGuestData] = useState({ name: user?.full_name || '', phone: user?.phone_number || '', email: user?.email || '' });
  const [selectedAddons, setSelectedAddons] = useState<HallAddon[]>([]);
  
  const [paymentMethod, setPaymentMethod] = useState<'full' | 'hold'>('full');

  const { toast } = useToast();

  const allImages = useMemo(() => {
    return item.images && item.images.length > 0 ? item.images : [item.image_url].filter(Boolean);
  }, [item]);

  useEffect(() => {
    const fetchAvailability = async () => {
      const { data } = await supabase.from('bookings').select('booking_date, check_out_date').eq('hall_id', item.id).neq('status', 'cancelled');
      if (data) {
          const dates: Date[] = [];
          data.forEach(b => {
              if (b.booking_date) {
                  let current = new Date(b.booking_date);
                  const end = b.check_out_date ? new Date(b.check_out_date) : current;
                  while (current <= end) { dates.push(new Date(current)); current = addDays(current, 1); }
              }
          });
          setBlockedDates(dates);
      }
    };
    fetchAvailability();
  }, [item.id]);

  const nights = useMemo(() => dateRange?.from && dateRange?.to ? Math.max(1, differenceInCalendarDays(dateRange.to, dateRange.from)) : 1, [dateRange]);
  
  const accommodationCostPerNight = useMemo(() => {
      const adultCost = adults * (item.price_per_adult || item.price_per_night || 0); 
      const childCost = children * (item.price_per_child || 0);
      return adultCost + childCost;
  }, [adults, children, item]);

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + Number(a.price), 0);
  
  const subTotal = (accommodationCostPerNight * nights) + addonsTotal;
  const vatAmount = subTotal * VAT_RATE;
  const grandTotal = subTotal + vatAmount;

  const checkAvailability = () => {
      if (!dateRange?.from || !dateRange?.to) return false;
      let curr = dateRange.from;
      while (curr <= dateRange.to) {
          if (blockedDates.some(d => isSameDay(d, curr))) return false;
          curr = addDays(curr, 1);
      }
      return true;
  };

  const initiateBooking = () => {
    if (!dateRange?.from || !dateRange?.to) { toast({ title: 'تنبيه', description: 'حدد تاريخ الوصول والمغادرة', variant: 'destructive' }); return; }
    if (!checkAvailability()) { toast({ title: 'نعتذر', description: 'بعض الأيام المختارة غير متاحة', variant: 'destructive' }); return; }
    if (!guestData.name || !guestData.phone || !guestData.email) { toast({ title: 'تنبيه', description: 'أكمل بيانات التواصل والبريد الإلكتروني', variant: 'destructive' }); return; }
    
    if (paymentMethod === 'hold') {
        handleBookingSubmission('hold');
    } else {
        setShowPaymentModal(true);
    }
  };

  const handleBookingSubmission = async (method: 'full' | 'hold') => {
    setIsBooking(true);
    try {
      const normalizedPhone = normalizeNumbers(guestData.phone);
      const status = method === 'hold' ? 'on_hold' : 'confirmed';
      const payStatus = method === 'hold' ? 'unpaid' : 'paid';
      
      const payload = {
        hall_id: item.id,
        vendor_id: item.vendor_id,
        booking_date: format(dateRange!.from!, 'yyyy-MM-dd'),
        check_out_date: format(dateRange!.to!, 'yyyy-MM-dd'),
        total_amount: grandTotal,
        vat_amount: vatAmount,
        paid_amount: method === 'full' ? grandTotal : 0, 
        payment_status: payStatus,
        status: status,
        booking_method: method,
        guest_name: guestData.name,
        guest_phone: normalizedPhone,
        guest_email: guestData.email,
        guests_adults: adults,
        guests_children: children,
        user_id: user?.id || null, 
        items: selectedAddons.map(addon => ({ name: addon.name, price: addon.price, qty: 1, type: 'addon' }))
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
      setShowPaymentModal(false);
      setShowInvoice(true);
      
      if (method === 'hold') {
          toast({ title: 'تم الحجز المبدئي', description: 'تم حجز الشاليه لمدة 48 ساعة.', variant: 'success' });
      } else {
          toast({ title: 'تم الحجز بنجاح', description: 'تم إصدار الفاتورة وإرسال تفاصيل الدخول.', variant: 'success' });
      }

    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { setIsBooking(false); }
  };

  const toggleAddon = (addon: HallAddon) => {
      setSelectedAddons(prev => {
          const exists = prev.find(a => a.name === addon.name);
          if (exists) return prev.filter(a => a.name !== addon.name);
          return [...prev, addon];
      });
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
                {/* Hero */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
                    <div className="h-[400px] rounded-[2rem] overflow-hidden mb-6 relative group">
                        <img src={allImages[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full font-black text-xs flex items-center gap-1">
                            <Palmtree className="w-4 h-4 text-blue-500" /> منتجع
                        </div>
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900">{item.name}</h1>
                            <p className="text-gray-500 font-bold flex items-center gap-2 mt-2"><MapPin className="w-4 h-4" /> {item.city}</p>
                        </div>
                    </div>
                </div>

                {/* Description & Amenities */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-6">
                    <h3 className="text-xl font-black text-gray-900">مميزات الشاليه</h3>
                    <p className="text-gray-600 leading-loose">{item.description}</p>
                    <div className="flex flex-wrap gap-3">
                        {item.amenities?.map((am, i) => (
                            <div key={i} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl text-xs font-bold border border-blue-100">
                                <CheckCircle2 className="w-4 h-4" /> {am}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add-ons */}
                {item.addons && item.addons.length > 0 && (
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-6">
                        <h3 className="text-xl font-black text-gray-900">خدمات إضافية</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {item.addons.map((addon, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => toggleAddon(addon)}
                                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${selectedAddons.find(a => a.name === addon.name) ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedAddons.find(a => a.name === addon.name) ? 'bg-primary border-primary text-white' : 'border-gray-300'}`}>
                                            {selectedAddons.find(a => a.name === addon.name) && <CheckCircle2 className="w-3 h-3" />}
                                        </div>
                                        <span className="font-bold text-gray-800">{addon.name}</span>
                                    </div>
                                    <PriceTag amount={addon.price} className="text-primary font-black" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Policies */}
                {item.policies && (
                    <div className="bg-orange-50 border border-orange-100 p-6 rounded-[2rem] space-y-3">
                        <h3 className="text-orange-800 font-black flex items-center gap-2"><AlertCircle className="w-5 h-5" /> شروط وسياسات المضيف</h3>
                        <p className="text-sm font-bold text-orange-700 whitespace-pre-wrap leading-relaxed">{item.policies}</p>
                    </div>
                )}
            </div>

            {/* Sidebar Calculator */}
            <div className="relative">
                <div className="sticky top-28 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-xl space-y-6">
                    <div className="space-y-4">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">تاريخ الحجز</label>
                        {/* Unified Flat Calendar Container */}
                        <div className="bg-gray-50 p-2 rounded-[2rem] border border-gray-100">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-full" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 block mb-2">البالغين ({item.price_per_adult} ر.س)</span>
                            <div className="flex justify-between items-center">
                                <button onClick={() => setAdults(Math.max(1, adults-1))} className="w-6 h-6 bg-white rounded-full shadow-sm font-bold text-gray-600 hover:text-primary">-</button>
                                <span className="font-black text-lg">{adults}</span>
                                <button onClick={() => setAdults(adults+1)} className="w-6 h-6 bg-white rounded-full shadow-sm font-bold text-gray-600 hover:text-primary">+</button>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 block mb-2">الأطفال ({item.price_per_child} ر.س)</span>
                            <div className="flex justify-between items-center">
                                <button onClick={() => setChildren(Math.max(0, children-1))} className="w-6 h-6 bg-white rounded-full shadow-sm font-bold text-gray-600 hover:text-primary">-</button>
                                <span className="font-black text-lg">{children}</span>
                                <button onClick={() => setChildren(children+1)} className="w-6 h-6 bg-white rounded-full shadow-sm font-bold text-gray-600 hover:text-primary">+</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Input placeholder="الاسم" value={guestData.name} onChange={e => setGuestData({...guestData, name: e.target.value})} className="h-12 rounded-xl bg-gray-50" />
                        <Input placeholder="الجوال (للدخول لاحقاً)" value={guestData.phone} onChange={e => setGuestData({...guestData, phone: normalizeNumbers(e.target.value)})} className="h-12 rounded-xl bg-gray-50" />
                        <div className="relative">
                            <Input placeholder="البريد الإلكتروني (للفاتورة)" type="email" value={guestData.email} onChange={e => setGuestData({...guestData, email: e.target.value})} className="h-12 rounded-xl bg-gray-50 pr-10" />
                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                        <p className="text-[9px] text-gray-400 pr-1">* البريد الإلكتروني ضروري لاستلام الفاتورة</p>
                    </div>

                    <div className="pt-6 border-t border-gray-100 space-y-3">
                        <div className="flex justify-between text-sm font-bold text-gray-600">
                            <span>السكن ({nights} ليالي)</span>
                            <PriceTag amount={accommodationCostPerNight * nights} />
                        </div>
                        {addonsTotal > 0 && (
                            <div className="flex justify-between text-sm font-bold text-gray-600">
                                <span>خدمات إضافية</span>
                                <PriceTag amount={addonsTotal} />
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-bold text-gray-600">
                            <span>الضريبة (15%)</span>
                            <PriceTag amount={vatAmount} />
                        </div>
                        <div className="flex justify-between text-xl font-black text-blue-600 pt-2 border-t border-dashed border-gray-200">
                            <span>الإجمالي النهائي</span>
                            <PriceTag amount={grandTotal} />
                        </div>
                    </div>

                    {/* Payment Toggles */}
                    <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-xl">
                            <button onClick={() => setPaymentMethod('full')} className={`py-2 rounded-lg text-[10px] font-black transition-all ${paymentMethod === 'full' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>دفع كامل</button>
                            <button onClick={() => setPaymentMethod('hold')} className={`py-2 rounded-lg text-[10px] font-black transition-all ${paymentMethod === 'hold' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>حجز 48 ساعة</button>
                        </div>
                    </div>

                    <Button onClick={initiateBooking} disabled={isBooking} className="w-full h-14 rounded-2xl font-black text-lg bg-gray-900 text-white shadow-xl hover:bg-black transition-all">
                        {isBooking ? <Loader2 className="animate-spin" /> : (paymentMethod === 'hold' ? 'تأكيد الحجز المبدئي' : 'الانتقال للدفع')}
                    </Button>
                </div>
            </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="إتمام الدفع الآمن" className="max-w-md">
          <div className="space-y-6 text-center">
              <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex flex-col items-center">
                  <span className="text-sm font-bold text-blue-600 mb-2">المبلغ المستحق للدفع</span>
                  <PriceTag amount={grandTotal} className="text-4xl font-black text-blue-800" />
              </div>
              
              <div className="space-y-3 text-right">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">بيانات البطاقة</label>
                  <div className="space-y-3">
                      <Input placeholder="رقم البطاقة" icon={<CreditCard className="w-4 h-4" />} className="h-12 font-mono" />
                      <div className="grid grid-cols-2 gap-3">
                          <Input placeholder="MM/YY" className="h-12 font-mono text-center" />
                          <Input placeholder="CVC" type="password" icon={<Lock className="w-4 h-4" />} className="h-12 font-mono text-center" />
                      </div>
                      <Input placeholder="الاسم على البطاقة" className="h-12" />
                  </div>
              </div>

              <Button onClick={() => handleBookingSubmission('full')} disabled={isBooking} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 bg-green-600 hover:bg-green-700 text-white">
                  {isBooking ? <Loader2 className="animate-spin" /> : `دفع ${grandTotal.toLocaleString()} ر.س`}
              </Button>
          </div>
      </Modal>

      {showInvoice && completedBooking && <InvoiceModal isOpen={showInvoice} onClose={() => { setShowInvoice(false); onBack(); }} booking={completedBooking} />}
    </div>
  );
};
