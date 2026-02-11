
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, VAT_RATE, HallPackage, BookingConfig } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  MapPin, CheckCircle2, Loader2, Share2, Heart, ArrowRight, Star,
  Calendar as CalendarIcon, Package, Info, Sparkles, Check, Users, Clock, Mail, Tag, FileText, Lock
} from 'lucide-react';
import { Calendar } from '../components/ui/Calendar';
import { useToast } from '../context/ToastContext';
import { format, isBefore, startOfDay, parseISO, isSameDay } from 'date-fns';
import { normalizeNumbers } from '../utils/helpers';

interface HallDetailsProps {
  item: Hall & { vendor?: UserProfile };
  user: UserProfile | null;
  onBack: () => void;
  onPay?: (amount: number, context: 'booking', refId: string, customerData: any) => Promise<void>;
}

export const HallDetails: React.FC<HallDetailsProps> = ({ item, user, onBack, onPay }) => {
  const [activeTab, setActiveTab] = useState<'packages' | 'policies'>('packages');
  const [selectedPackage, setSelectedPackage] = useState<HallPackage | null>(null);
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [bookingConfig, setBookingConfig] = useState<BookingConfig | null>(null);
  
  const [guestData, setGuestData] = useState({ name: user?.full_name || '', phone: user?.phone_number || '', email: user?.email || '' });
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'hold_48h' | 'consultation' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple' | 'stc' | null>(null); // For UI selection

  const { toast } = useToast();

  useEffect(() => {
    // 1. Set Default Package
    if (item.packages && item.packages.length > 0) {
        const def = item.packages.find(p => p.is_default) || item.packages[0];
        setSelectedPackage(def);
    }

    // 2. Fetch Availability
    const fetchAvailability = async () => {
      const { data: bookingsData } = await supabase.from('bookings').select('booking_date').eq('hall_id', item.id).neq('status', 'cancelled');
      if (bookingsData) {
          const dates = bookingsData.map(b => parseISO(b.booking_date));
          setBlockedDates(dates);
      }
    };
    fetchAvailability();

    // 3. Fetch Booking Config (Deposit rules, etc.)
    const fetchConfig = async () => {
        const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
        if (data?.value?.booking_config) {
            setBookingConfig(data.value.booking_config);
        }
    };
    fetchConfig();
  }, [item.id, item.packages]);

  // Pricing Logic
  const priceDetails = useMemo(() => {
      if (!selectedPackage) return { base: 0, increase: 0, total: 0 };
      
      let base = selectedPackage.price;
      let increase = 0;

      // Check Seasonality
      if (bookingDate) {
          const dateStr = format(bookingDate, 'yyyy-MM-dd');
          const season = item.seasonal_prices?.find(s => dateStr >= s.start_date && dateStr <= s.end_date);
          if (season) {
              increase = base * (season.increase_percentage / 100);
          }
      }
      return { base, increase, total: base + increase };
  }, [selectedPackage, bookingDate, item.seasonal_prices]);

  // Payment Amounts
  const paymentAmounts = useMemo(() => {
      if (!bookingConfig) return { deposit: 0, hold: 0, consultation: 0 };
      const deposit = bookingConfig.deposit_fixed + (priceDetails.total * (bookingConfig.deposit_percent / 100));
      return {
          deposit,
          hold: bookingConfig.hold_price,
          consultation: bookingConfig.consultation_price
      };
  }, [bookingConfig, priceDetails.total]);

  const handleBooking = async () => {
      if (!bookingDate || !paymentOption || !guestData.name || !guestData.phone || !paymentMethod) {
          toast({ title: 'ناقص البيانات', description: 'يرجى اختيار التاريخ، نوع الحجز، وسيلة الدفع، وإكمال بياناتك.', variant: 'destructive' });
          return;
      }

      setIsProcessing(true);
      try {
          // Determine amount to pay now
          let payAmount = 0;
          if (paymentOption === 'deposit') payAmount = paymentAmounts.deposit;
          else if (paymentOption === 'hold_48h') payAmount = paymentAmounts.hold;
          else if (paymentOption === 'consultation') payAmount = paymentAmounts.consultation;

          // 1. Create Booking Record (Pending Payment)
          const { data, error } = await supabase.from('bookings').insert([{
              hall_id: item.id,
              vendor_id: item.vendor_id,
              booking_date: format(bookingDate, 'yyyy-MM-dd'),
              total_amount: priceDetails.total,
              paid_amount: 0, // Will update after payment callback
              booking_option: paymentOption,
              package_details: selectedPackage,
              guest_name: guestData.name,
              guest_phone: normalizeNumbers(guestData.phone),
              guest_email: guestData.email,
              user_id: user?.id || null,
              status: 'pending',
              payment_status: 'unpaid'
          }]).select().single();

          if (error) throw error;

          // 2. Redirect to HyperPay
          if (onPay) {
              await onPay(payAmount, 'booking', data.id, {
                  email: guestData.email,
                  givenName: guestData.name,
                  surname: 'Customer',
                  city: item.city
              });
          }

      } catch (err: any) {
          toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
      } finally {
          setIsProcessing(false);
      }
  };

  const allImages = useMemo(() => item.images && item.images.length > 0 ? item.images : [item.image_url].filter(Boolean), [item]);

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-20 font-tajawal text-right" dir="rtl">
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 py-4 shadow-sm">
            <div className="max-w-[1600px] mx-auto px-6 flex justify-between items-center">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold hover:bg-gray-100 px-4 py-2 rounded-full transition-all">
                    <ArrowRight className="w-5 h-5" /> رجوع
                </button>
                <h1 className="font-black text-lg text-gray-900">{item.name}</h1>
            </div>
        </nav>

        <div className="max-w-[1600px] mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* Images */}
                <div className="h-[400px] rounded-[2.5rem] overflow-hidden relative">
                    <img src={allImages[0]} className="w-full h-full object-cover" />
                    <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur px-4 py-2 rounded-2xl font-black text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" /> {item.city}
                    </div>
                </div>

                {/* Packages Selection */}
                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                        <Package className="w-6 h-6 text-primary" /> اختر الباقة المناسبة
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        {item.packages?.map((pkg, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => setSelectedPackage(pkg)}
                                className={`cursor-pointer border-2 rounded-[2rem] p-6 transition-all relative overflow-hidden ${selectedPackage?.name === pkg.name ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="font-black text-lg">{pkg.name}</h4>
                                    {selectedPackage?.name === pkg.name && <CheckCircle2 className="w-6 h-6 text-primary" />}
                                </div>
                                <div className="space-y-2 text-xs font-bold text-gray-500 mb-4">
                                    <div className="flex justify-between bg-white p-2 rounded-lg border border-gray-100">
                                        <span>رجال</span>
                                        <span>{pkg.min_men} - {pkg.max_men}</span>
                                    </div>
                                    <div className="flex justify-between bg-white p-2 rounded-lg border border-gray-100">
                                        <span>نساء</span>
                                        <span>{pkg.min_women} - {pkg.max_women}</span>
                                    </div>
                                </div>
                                <PriceTag amount={pkg.price} className="text-xl font-black text-primary block text-left" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Policies */}
                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-gray-400" /> الشروط والأحكام
                    </h3>
                    <div className="text-sm font-medium text-gray-600 leading-loose bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        {item.policies || 'لا توجد شروط خاصة محددة من قبل القاعة.'}
                    </div>
                </div>
            </div>

            {/* Booking Sidebar */}
            <div className="relative">
                <div className="sticky top-28 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-xl space-y-6">
                    <div className="text-center border-b border-gray-50 pb-4">
                        <p className="text-xs font-bold text-gray-400 mb-1">إجمالي الباقة المختارة</p>
                        <PriceTag amount={priceDetails.total} className="text-3xl font-black text-primary justify-center" />
                        {priceDetails.increase > 0 && <span className="text-[10px] text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded-lg mt-2 inline-block">سعر موسمي (+{priceDetails.increase})</span>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">تاريخ الحجز</label>
                        <div className="bg-gray-50 p-4 rounded-[2rem] border border-gray-100">
                            <Calendar mode="single" selected={bookingDate} onSelect={setBookingDate} disabled={(date) => isBefore(date, startOfDay(new Date())) || blockedDates.some(d => isSameDay(d, date))} className="w-full" />
                        </div>
                    </div>

                    {/* Booking Options Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        <button 
                            onClick={() => setPaymentOption('deposit')} 
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${paymentOption === 'deposit' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                        >
                            <span className="text-[10px] font-black mb-1">دفع عربون</span>
                            <span className="font-black text-xs">{paymentAmounts.deposit} ر.س</span>
                        </button>
                        <button 
                            onClick={() => setPaymentOption('hold_48h')} 
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${paymentOption === 'hold_48h' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                        >
                            <span className="text-[10px] font-black mb-1">حجز يومين</span>
                            <span className="font-black text-xs">{paymentAmounts.hold} ر.س</span>
                        </button>
                        <button 
                            onClick={() => setPaymentOption('consultation')} 
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${paymentOption === 'consultation' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                        >
                            <span className="text-[10px] font-black mb-1">استشارة</span>
                            <span className="font-black text-xs">{paymentAmounts.consultation} ر.س</span>
                        </button>
                    </div>

                    <div className="space-y-3 pt-2">
                        <Input placeholder="الاسم" value={guestData.name} onChange={e => setGuestData({...guestData, name: e.target.value})} className="h-11 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary" />
                        <Input placeholder="الجوال" value={guestData.phone} onChange={e => setGuestData({...guestData, phone: e.target.value})} className="h-11 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary" />
                        <Input placeholder="البريد" value={guestData.email} onChange={e => setGuestData({...guestData, email: e.target.value})} className="h-11 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary" />
                    </div>

                    {/* Payment Methods */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">وسيلة الدفع</label>
                        <div className="flex gap-2 justify-center">
                            <button onClick={() => setPaymentMethod('apple')} className={`h-12 flex-1 rounded-xl border flex items-center justify-center transition-all ${paymentMethod === 'apple' ? 'border-black bg-black text-white' : 'border-gray-200 hover:bg-gray-50'}`}>Apple Pay</button>
                            <button onClick={() => setPaymentMethod('stc')} className={`h-12 flex-1 rounded-xl border flex items-center justify-center transition-all ${paymentMethod === 'stc' ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-200 hover:bg-gray-50'}`}>STC Pay</button>
                            <button onClick={() => setPaymentMethod('card')} className={`h-12 flex-1 rounded-xl border flex items-center justify-center transition-all ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 hover:bg-gray-50'}`}>Card</button>
                        </div>
                    </div>

                    <Button onClick={handleBooking} disabled={isProcessing} className="w-full h-14 rounded-2xl font-black text-lg bg-gray-900 text-white shadow-xl hover:scale-[1.02] transition-transform">
                        {isProcessing ? <Loader2 className="animate-spin" /> : 'تأكيد ودفع'}
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );
};
