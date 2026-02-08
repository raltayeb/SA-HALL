
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
// Added POSItem to imports from types.ts
import { Hall, UserProfile, Service, VAT_RATE, HALL_AMENITIES, Coupon, BookingItem, Booking, POSItem } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  MapPin, CheckCircle2, Loader2, Sparkles, 
  Briefcase, ArrowLeft, X, User, Phone, Wallet,
  Package, Ticket, MessageCircle, CreditCard, Flame, Share2, Heart, ArrowRight, Star,
// Added Mail to imports from lucide-react
  ShieldCheck, Calendar, Info, ChevronRight, ChevronLeft, ShoppingBag, Mail
} from 'lucide-react';
import { Calendar as InlineCalendar } from '../components/ui/Calendar';
import { useToast } from '../context/ToastContext';
import { format, isSameDay, isBefore, startOfDay } from 'date-fns';

interface HallDetailsProps {
  item: (Hall | Service) & { vendor?: UserProfile };
  type: 'hall' | 'service' | 'chalet';
  user: UserProfile | null;
  onBack: () => void;
}

export const HallDetails: React.FC<HallDetailsProps> = ({ item, type, user, onBack }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [vendorServices, setVendorServices] = useState<Service[]>([]);
  const [storeItems, setStoreItems] = useState<POSItem[]>([]);
  
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('23:00');
  const [guestData, setGuestData] = useState({ name: user?.full_name || '', phone: user?.phone_number || '', email: user?.email || '' });
  
  const [paymentMethod, setPaymentMethod] = useState<'pay_later' | 'credit_card'>('credit_card');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStoreItems, setSelectedStoreItems] = useState<{item: POSItem, qty: number}[]>([]);

  const { toast } = useToast();
  const isHall = type === 'hall' || type === 'chalet';
  const hall = isHall ? (item as Hall) : null;
  const service = !isHall ? (item as Service) : null;
  
  const allImages = useMemo(() => {
    const imgs = (item as any).images && (item as any).images.length > 0 
      ? (item as any).images : [(item as any).image_url].filter(Boolean);
    return imgs.length > 0 ? imgs : ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'];
  }, [item]);

  const fetchData = useCallback(async () => {
    if (isHall) {
      const { data: bookingsData } = await supabase.from('bookings').select('booking_date').eq('hall_id', item.id).neq('status', 'cancelled');
      if (bookingsData) setBlockedDates(bookingsData.map(b => new Date(b.booking_date)));

      const { data: vServices } = await supabase.from('services').select('*').eq('vendor_id', item.vendor_id).eq('is_active', true).neq('id', item.id);
      setVendorServices(vServices || []);

      const { data: pItems } = await supabase.from('pos_items').select('*').eq('vendor_id', item.vendor_id).gt('stock', 0);
      setStoreItems(pItems || []);
    }
  }, [item.id, item.vendor_id, isHall]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const subTotal = useMemo(() => {
    let sum = isHall ? Number(hall!.price_per_night) : Number(service!.price);
    sum += selectedServices.reduce((s, i) => s + Number(i.price), 0);
    sum += selectedStoreItems.reduce((s, i) => s + (Number(i.item.price) * i.qty), 0);
    return sum;
  }, [selectedServices, selectedStoreItems, isHall, hall, service]);

  const vat = subTotal * VAT_RATE;
  const total = subTotal + vat;

  const handleBookingSubmission = async () => {
    if (!bookingDate || !guestData.name || !guestData.phone) return;
    setIsBooking(true);
    try {
      const payload = {
        hall_id: isHall ? hall!.id : null,
        vendor_id: item.vendor_id,
        booking_date: format(bookingDate, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        total_amount: total,
        vat_amount: vat,
        guest_name: guestData.name,
        guest_phone: guestData.phone,
        items: [...selectedServices.map(s => ({id: s.id, name: s.name, price: s.price, qty: 1, type: 'service'})), 
                ...selectedStoreItems.map(si => ({id: si.item.id, name: si.item.name, price: si.item.price, qty: si.qty, type: 'product'}))],
        status: 'pending',
      };

      const { data, error } = await supabase.from('bookings').insert([payload]).select().single();
      if (error) throw error;
      setCompletedBooking(data as any);
      setShowInvoice(true);
      setIsWizardOpen(false);
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { setIsBooking(false); }
  };

  return (
    <div className="bg-white min-h-screen text-right" dir="rtl">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:text-primary"><ArrowRight className="w-5 h-5" /></button>
          <h1 className="text-lg font-black text-gray-900">{item.name}</h1>
          <div className="flex gap-2"><Button variant="outline" size="icon" className="rounded-xl"><Share2 className="w-4 h-4" /></Button></div>
        </div>
      </nav>

      <div className="pt-24 max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 pb-32">
        <div className="lg:col-span-8 space-y-12">
           <div className="aspect-video rounded-[3rem] overflow-hidden border border-gray-100"><img src={allImages[0]} className="w-full h-full object-cover" /></div>
           <div className="space-y-4">
              <h2 className="text-4xl font-black text-gray-900">{item.name}</h2>
              <div className="flex items-center gap-2 text-gray-500 font-bold"><MapPin className="w-4 h-4 text-primary" /> {isHall ? hall?.city : 'متوفر'}</div>
           </div>
           <div className="border-t border-gray-100 pt-8 space-y-4">
              <h3 className="text-2xl font-black">الوصف</h3>
              <p className="text-gray-600 leading-loose text-lg font-medium">{item.description}</p>
           </div>
        </div>

        <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
           <div className="bg-white border border-gray-100 rounded-[3rem] p-10 space-y-8">
              <div className="flex justify-between items-end border-b border-gray-50 pb-6 flex-row-reverse">
                 <PriceTag amount={isHall ? Number(hall!.price_per_night) : Number(service!.price)} className="text-4xl font-black text-primary" />
                 <span className="text-xs font-bold text-gray-400">/ {isHall ? 'الليلة' : 'الخدمة'}</span>
              </div>
              
              <div className="space-y-4">
                 <p className="text-sm font-black text-gray-900">اختر التاريخ المتوفر</p>
                 <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                    <InlineCalendar 
                        mode="single" 
                        selected={bookingDate} 
                        onSelect={setBookingDate} 
                        disabled={(date) => isBefore(date, startOfDay(new Date())) || blockedDates.some(d => isSameDay(d, date))}
                        className="mx-auto"
                    />
                 </div>
              </div>

              <Button onClick={() => setIsWizardOpen(true)} className="w-full h-16 rounded-[2rem] text-xl font-black bg-primary text-white">إتمام الحجز</Button>
           </div>
        </div>
      </div>

      {isWizardOpen && (
          <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-xl rounded-[2.5rem] flex flex-col max-h-[90vh] overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-xl font-black">تأكيد الحجز والخدمات</h3>
                    <button onClick={() => setIsWizardOpen(false)} className="p-2 hover:bg-red-50 rounded-xl"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-8 overflow-y-auto space-y-10 custom-scrollbar">
                   {step === 1 && (
                      <div className="space-y-8 animate-in fade-in">
                         <div className="text-center space-y-2"><h3 className="text-2xl font-black text-gray-900">بيانات التواصل</h3><p className="text-sm text-gray-400 font-bold">أدخل بياناتك وسيصلك رمز دخول لمتابعة حجزك</p></div>
                         <div className="space-y-4">
                            <Input label="الاسم الكامل" value={guestData.name} onChange={e => setGuestData({...guestData, name: e.target.value})} className="h-14 rounded-2xl font-black" icon={<User className="w-5 h-5 text-gray-300" />} />
                            <Input label="رقم الجوال" value={guestData.phone} onChange={e => setGuestData({...guestData, phone: e.target.value})} className="h-14 rounded-2xl font-black" icon={<Phone className="w-5 h-5 text-gray-300" />} />
                            <Input label="البريد الإلكتروني" value={guestData.email} onChange={e => setGuestData({...guestData, email: e.target.value})} className="h-14 rounded-2xl font-black" icon={<Mail className="w-5 h-5 text-gray-300" />} />
                         </div>
                         <Button onClick={() => setStep(2)} className="w-full h-16 rounded-2xl font-black">التالي</Button>
                      </div>
                   )}
                   {step === 2 && (
                      <div className="space-y-8 animate-in fade-in">
                         <div className="text-center"><h3 className="text-2xl font-black">إضافات وتجهيزات</h3></div>
                         <div className="space-y-6">
                            {vendorServices.length > 0 && (
                                <div className="space-y-3">
                                   <p className="text-xs font-black text-primary">خدمات إضافية</p>
                                   {vendorServices.map(s => (
                                      <button key={s.id} onClick={() => setSelectedServices(prev => prev.find(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s])} className={`w-full p-4 rounded-2xl border flex justify-between items-center transition-all ${selectedServices.find(x => x.id === s.id) ? 'bg-primary text-white border-primary' : 'bg-gray-50 border-gray-100'}`}>
                                         <span className="font-bold">{s.name}</span>
                                         <PriceTag amount={s.price} className={selectedServices.find(x => x.id === s.id) ? 'text-white' : 'text-primary'} />
                                      </button>
                                   ))}
                                </div>
                            )}
                            {storeItems.length > 0 && (
                                <div className="space-y-3">
                                   <p className="text-xs font-black text-primary">تجهيزات المتجر</p>
                                   {storeItems.map(item => (
                                      <div key={item.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex justify-between items-center">
                                         <div className="text-right"><p className="font-bold text-sm">{item.name}</p><PriceTag amount={item.price} className="text-xs text-gray-500" /></div>
                                         <div className="flex items-center gap-3">
                                            <button onClick={() => setSelectedStoreItems(prev => {
                                               const ex = prev.find(x => x.item.id === item.id);
                                               if (ex) return prev.map(x => x.item.id === item.id ? { ...x, qty: Math.max(0, x.qty - 1) } : x).filter(x => x.qty > 0);
                                               return prev;
                                            })} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">-</button>
                                            <span className="font-black">{selectedStoreItems.find(x => x.item.id === item.id)?.qty || 0}</span>
                                            <button onClick={() => setSelectedStoreItems(prev => {
                                               const ex = prev.find(x => x.item.id === item.id);
                                               if (ex) return prev.map(x => x.item.id === item.id ? { ...x, qty: x.qty + 1 } : x);
                                               return [...prev, { item, qty: 1 }];
                                            })} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">+</button>
                                         </div>
                                      </div>
                                   ))}
                                </div>
                            )}
                         </div>
                         <div className="flex gap-4"><Button variant="outline" onClick={() => setStep(1)} className="h-14 rounded-2xl px-6">رجوع</Button><Button onClick={() => setStep(3)} className="flex-1 h-14 rounded-2xl font-black">مراجعة الفاتورة</Button></div>
                      </div>
                   )}
                   {step === 3 && (
                       <div className="space-y-8 animate-in fade-in">
                          <div className="bg-gray-900 text-white p-8 rounded-[2rem] space-y-4">
                             <div className="flex justify-between border-b border-white/10 pb-4"><span>قيمة الحجز</span><PriceTag amount={subTotal} className="text-white" /></div>
                             <div className="flex justify-between"><span>الضريبة (15%)</span><PriceTag amount={vat} className="text-white" /></div>
                             <div className="flex justify-between text-3xl font-black pt-4"><span>الإجمالي</span><PriceTag amount={total} className="text-white" /></div>
                          </div>
                          <Button onClick={handleBookingSubmission} disabled={isBooking} className="w-full h-16 rounded-[2rem] text-xl font-black">تأكيد وإرسال الطلب</Button>
                       </div>
                   )}
                </div>
             </div>
          </div>
      )}

      {showInvoice && completedBooking && <InvoiceModal isOpen={showInvoice} onClose={() => { setShowInvoice(false); onBack(); }} booking={completedBooking} />}
    </div>
  );
};
