
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, VAT_RATE, Booking } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  MapPin, CheckCircle2, Loader2, Share2, Heart, ArrowRight, Star,
  AlertCircle, Palmtree, Users, Calendar
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { format, differenceInCalendarDays, addDays, isSameDay } from 'date-fns';
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from '../components/ui/DatePickerWithRange';

interface ChaletDetailsProps {
  item: Hall & { vendor?: UserProfile };
  user: UserProfile | null;
  onBack: () => void;
}

export const ChaletDetails: React.FC<ChaletDetailsProps> = ({ item, user, onBack }) => {
  const [isBooking, setIsBooking] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [guestData, setGuestData] = useState({ name: user?.full_name || '', phone: user?.phone_number || '' });

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
  const totalAmount = (Number(item.price_per_night) * nights) * 1.15; // Including VAT

  const checkAvailability = () => {
      if (!dateRange?.from || !dateRange?.to) return false;
      let curr = dateRange.from;
      while (curr <= dateRange.to) {
          if (blockedDates.some(d => isSameDay(d, curr))) return false;
          curr = addDays(curr, 1);
      }
      return true;
  };

  const handleBooking = async () => {
    if (!dateRange?.from || !dateRange?.to) { toast({ title: 'تنبيه', description: 'حدد تاريخ الوصول والمغادرة', variant: 'destructive' }); return; }
    if (!checkAvailability()) { toast({ title: 'نعتذر', description: 'بعض الأيام المختارة غير متاحة', variant: 'destructive' }); return; }
    if (!guestData.name || !guestData.phone) { toast({ title: 'تنبيه', description: 'أكمل بيانات التواصل', variant: 'destructive' }); return; }

    setIsBooking(true);
    try {
      const payload = {
        hall_id: item.id,
        vendor_id: item.vendor_id,
        booking_date: format(dateRange.from, 'yyyy-MM-dd'),
        check_out_date: format(dateRange.to, 'yyyy-MM-dd'),
        total_amount: totalAmount,
        vat_amount: totalAmount - (totalAmount / 1.15),
        paid_amount: 0,
        payment_status: 'unpaid',
        status: 'pending',
        booking_method: 'full',
        guest_name: guestData.name,
        guest_phone: guestData.phone,
        guests_adults: adults,
        guests_children: children,
        user_id: user?.id || null
      };

      const { data, error } = await supabase.from('bookings').insert([payload]).select().single();
      if (error) throw error;
      setCompletedBooking(data as any);
      setShowInvoice(true);
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
                {/* Hero */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
                    <div className="h-[400px] rounded-[2rem] overflow-hidden mb-6 relative">
                        <img src={allImages[0]} className="w-full h-full object-cover" />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full font-black text-xs flex items-center gap-1">
                            <Palmtree className="w-4 h-4 text-blue-500" /> منتجع
                        </div>
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900">{item.name}</h1>
                            <p className="text-gray-500 font-bold flex items-center gap-2 mt-2"><MapPin className="w-4 h-4" /> {item.city}</p>
                        </div>
                        <div className="text-left">
                            <PriceTag amount={item.price_per_night} className="text-2xl font-black text-blue-600" />
                            <span className="text-xs text-gray-400 font-bold">/ ليلة</span>
                        </div>
                    </div>
                </div>

                {/* Description & Amenities */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-6">
                    <h3 className="text-xl font-black text-gray-900">تفاصيل المكان</h3>
                    <p className="text-gray-600 leading-loose">{item.description}</p>
                    <div className="flex flex-wrap gap-3">
                        {item.amenities?.map((am, i) => (
                            <span key={i} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold">{am}</span>
                        ))}
                    </div>
                </div>

                {/* Policies */}
                {item.policies && (
                    <div className="bg-orange-50 border border-orange-100 p-6 rounded-[2rem] space-y-3">
                        <h3 className="text-orange-800 font-black flex items-center gap-2"><AlertCircle className="w-5 h-5" /> شروط وسياسات المضيف</h3>
                        <p className="text-sm font-bold text-orange-700 whitespace-pre-wrap leading-relaxed">{item.policies}</p>
                    </div>
                )}
            </div>

            {/* Sidebar */}
            <div className="relative">
                <div className="sticky top-28 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-xl space-y-6">
                    <div className="space-y-4">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">تاريخ الحجز</label>
                        <div className="bg-gray-50 p-2 rounded-2xl">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-full" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 block mb-2">البالغين</span>
                            <div className="flex justify-between items-center">
                                <button onClick={() => setAdults(Math.max(1, adults-1))} className="w-6 h-6 bg-white rounded-full shadow-sm font-bold">-</button>
                                <span className="font-black">{adults}</span>
                                <button onClick={() => setAdults(adults+1)} className="w-6 h-6 bg-white rounded-full shadow-sm font-bold">+</button>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 block mb-2">الأطفال</span>
                            <div className="flex justify-between items-center">
                                <button onClick={() => setChildren(Math.max(0, children-1))} className="w-6 h-6 bg-white rounded-full shadow-sm font-bold">-</button>
                                <span className="font-black">{children}</span>
                                <button onClick={() => setChildren(children+1)} className="w-6 h-6 bg-white rounded-full shadow-sm font-bold">+</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Input placeholder="الاسم" value={guestData.name} onChange={e => setGuestData({...guestData, name: e.target.value})} className="h-12 rounded-xl" />
                        <Input placeholder="الجوال" value={guestData.phone} onChange={e => setGuestData({...guestData, phone: e.target.value})} className="h-12 rounded-xl" />
                    </div>

                    <div className="pt-4 border-t border-gray-100 space-y-2">
                        <div className="flex justify-between text-sm font-bold text-gray-600">
                            <span>{item.price_per_night} × {nights} ليالي</span>
                            <span>{item.price_per_night * nights} ر.س</span>
                        </div>
                        <div className="flex justify-between text-lg font-black text-blue-600 pt-2">
                            <span>الإجمالي</span>
                            <PriceTag amount={totalAmount} />
                        </div>
                        <p className="text-[10px] text-red-500 font-bold bg-red-50 p-2 rounded-lg text-center">يتطلب دفع كامل المبلغ</p>
                    </div>

                    <Button onClick={handleBooking} disabled={isBooking} className="w-full h-14 rounded-2xl font-black text-lg bg-gray-900 text-white shadow-xl">
                        {isBooking ? <Loader2 className="animate-spin" /> : 'حجز وتأكيد'}
                    </Button>
                </div>
            </div>
        </div>
      </div>
      {showInvoice && completedBooking && <InvoiceModal isOpen={showInvoice} onClose={() => { setShowInvoice(false); onBack(); }} booking={completedBooking} />}
    </div>
  );
};
