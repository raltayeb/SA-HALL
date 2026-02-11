
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, VAT_RATE, HallPackage, BookingConfig, HallAddon } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  MapPin, CheckCircle2, Loader2, Share2, Heart, ArrowRight, Star,
  Calendar as CalendarIcon, Package, Info, Sparkles, Check, Users, Clock, Mail, Tag, FileText, Lock, Plus, Minus
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
  const [selectedPackage, setSelectedPackage] = useState<HallPackage | null>(null);
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [bookingConfig, setBookingConfig] = useState<BookingConfig | null>(null);
  
  // Guest Counts
  const [guestCounts, setGuestCounts] = useState({ men: 0, women: 0 });
  
  const [guestData, setGuestData] = useState({ name: user?.full_name || '', phone: user?.phone_number || '', email: user?.email || '' });
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'hold_48h' | 'consultation' | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<HallAddon[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    // 1. Set Default Package & Counts
    if (item.packages && item.packages.length > 0) {
        const def = item.packages.find(p => p.is_default) || item.packages[0];
        setSelectedPackage(def);
        setGuestCounts({ men: def.min_men || 0, women: def.min_women || 0 });
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

    // 3. Fetch Booking Config
    const fetchConfig = async () => {
        const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
        if (data?.value?.booking_config) {
            setBookingConfig(data.value.booking_config);
        }
    };
    fetchConfig();
  }, [item.id, item.packages]);

  // Pricing Logic (Per Person)
  const priceDetails = useMemo(() => {
      if (!selectedPackage) return { packageTotal: 0, addonsTotal: 0, seasonalIncrease: 0, total: 0, personPrice: 0 };
      
      const personPrice = selectedPackage.price;
      const totalGuests = guestCounts.men + guestCounts.women;
      const basePackageCost = totalGuests * personPrice;
      
      let seasonalMultiplier = 1;
      let seasonalIncrease = 0;

      // Check Seasonality
      if (bookingDate) {
          const dateStr = format(bookingDate, 'yyyy-MM-dd');
          const season = item.seasonal_prices?.find(s => dateStr >= s.start_date && dateStr <= s.end_date);
          if (season) {
              seasonalMultiplier = 1 + (season.increase_percentage / 100);
              seasonalIncrease = (basePackageCost * seasonalMultiplier) - basePackageCost;
          }
      }

      const adjustedPackageCost = basePackageCost * seasonalMultiplier;
      const addonsTotal = selectedAddons.reduce((sum, a) => sum + Number(a.price), 0);
      
      return { 
          personPrice,
          packageTotal: adjustedPackageCost, 
          seasonalIncrease,
          addonsTotal,
          total: adjustedPackageCost + addonsTotal 
      };
  }, [selectedPackage, bookingDate, guestCounts, item.seasonal_prices, selectedAddons]);

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

  const toggleAddon = (addon: HallAddon) => {
      setSelectedAddons(prev => prev.some(a => a.name === addon.name) ? prev.filter(a => a.name !== addon.name) : [...prev, addon]);
  };

  const handlePaymentClick = async (method: 'card' | 'apple' | 'stc') => {
      if (!bookingDate || !paymentOption || !guestData.name || !guestData.phone) {
          toast({ title: 'ناقص البيانات', description: 'يرجى استكمال التاريخ، نوع الحجز، وبياناتك.', variant: 'destructive' });
          return;
      }

      // Validation
      if(selectedPackage) {
          if (guestCounts.men < selectedPackage.min_men || guestCounts.men > selectedPackage.max_men) {
              toast({ title: 'خطأ في العدد', description: `عدد الرجال يجب أن يكون بين ${selectedPackage.min_men} و ${selectedPackage.max_men}`, variant: 'destructive' });
              return;
          }
          if (guestCounts.women < selectedPackage.min_women || guestCounts.women > selectedPackage.max_women) {
              toast({ title: 'خطأ في العدد', description: `عدد النساء يجب أن يكون بين ${selectedPackage.min_women} و ${selectedPackage.max_women}`, variant: 'destructive' });
              return;
          }
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
              paid_amount: 0, 
              booking_option: paymentOption,
              package_details: selectedPackage,
              guest_name: guestData.name,
              guest_phone: normalizeNumbers(guestData.phone),
              guest_email: guestData.email,
              user_id: user?.id || null,
              status: 'pending',
              payment_status: 'unpaid',
              guests_adults: guestCounts.men, // Using this for Men
              guests_children: guestCounts.women, // Using this for Women (schema reuse)
              items: [
                  ...(selectedPackage ? [{ name: `باقة: ${selectedPackage.name}`, price: selectedPackage.price, qty: (guestCounts.men + guestCounts.women), type: 'package' }] : []),
                  ...selectedAddons.map(addon => ({ name: addon.name, price: addon.price, qty: 1, type: 'addon' }))
              ]
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

                {/* Amenities Section */}
                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-primary" /> مميزات القاعة
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {item.amenities?.map((amenity, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                <Check className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-bold text-gray-700">{amenity}</span>
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

            {/* Booking Sidebar - New Order */}
            <div className="relative">
                <div className="sticky top-28 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-xl space-y-6">
                    
                    {/* 1. Calendar */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">تاريخ الحجز</label>
                        <div className="bg-gray-50 p-4 rounded-[2rem] border border-gray-100">
                            <Calendar mode="single" selected={bookingDate} onSelect={setBookingDate} disabled={(date) => isBefore(date, startOfDay(new Date())) || blockedDates.some(d => isSameDay(d, date))} className="w-full" />
                        </div>
                    </div>

                    {/* 2. Package & Guests */}
                    <div className="space-y-4 border-t border-gray-50 pt-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">اختيار الباقة</label>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            {item.packages?.map((pkg, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => { setSelectedPackage(pkg); setGuestCounts({ men: pkg.min_men, women: pkg.min_women }); }}
                                    className={`flex-1 min-w-[140px] p-3 rounded-2xl border-2 text-right transition-all ${selectedPackage?.name === pkg.name ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                                >
                                    <div className="font-bold text-xs mb-1">{pkg.name}</div>
                                    <PriceTag amount={pkg.price} className="text-primary font-black" />
                                    <div className="text-[9px] text-gray-400 mt-1">سعر الفرد</div>
                                </button>
                            ))}
                        </div>

                        {selectedPackage && (
                            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                <div>
                                    <label className="text-[9px] font-bold text-gray-400 mb-1 block">رجال ({selectedPackage.min_men}-{selectedPackage.max_men})</label>
                                    <div className="flex items-center gap-2 bg-white rounded-xl px-2 py-1 border border-gray-200">
                                        <button onClick={() => setGuestCounts(prev => ({...prev, men: Math.max(selectedPackage.min_men, prev.men - 10)}))} className="p-1 hover:bg-gray-100 rounded"><Minus className="w-3 h-3" /></button>
                                        <span className="flex-1 text-center font-black text-sm">{guestCounts.men}</span>
                                        <button onClick={() => setGuestCounts(prev => ({...prev, men: Math.min(selectedPackage.max_men, prev.men + 10)}))} className="p-1 hover:bg-gray-100 rounded"><Plus className="w-3 h-3" /></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-gray-400 mb-1 block">نساء ({selectedPackage.min_women}-{selectedPackage.max_women})</label>
                                    <div className="flex items-center gap-2 bg-white rounded-xl px-2 py-1 border border-gray-200">
                                        <button onClick={() => setGuestCounts(prev => ({...prev, women: Math.max(selectedPackage.min_women, prev.women - 10)}))} className="p-1 hover:bg-gray-100 rounded"><Minus className="w-3 h-3" /></button>
                                        <span className="flex-1 text-center font-black text-sm">{guestCounts.women}</span>
                                        <button onClick={() => setGuestCounts(prev => ({...prev, women: Math.min(selectedPackage.max_women, prev.women + 10)}))} className="p-1 hover:bg-gray-100 rounded"><Plus className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Addons */}
                    {item.addons && item.addons.length > 0 && (
                        <div className="space-y-2 border-t border-gray-50 pt-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">خدمات إضافية</label>
                            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                                {item.addons.map((addon, i) => (
                                    <div key={i} onClick={() => toggleAddon(addon)} className={`flex justify-between items-center p-2 rounded-xl border cursor-pointer ${selectedAddons.some(a => a.name === addon.name) ? 'bg-primary/5 border-primary' : 'bg-white border-gray-100'}`}>
                                        <div className="flex items-center gap-2">
                                            {selectedAddons.some(a => a.name === addon.name) && <CheckCircle2 className="w-3 h-3 text-primary" />}
                                            <span className="text-xs font-bold">{addon.name}</span>
                                        </div>
                                        <span className="text-xs font-black text-gray-600">{addon.price} ر.س</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 4. Financials */}
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2 text-xs font-bold text-gray-500">
                        <div className="flex justify-between">
                            <span>سعر الباقة ({guestCounts.men + guestCounts.women} فرد)</span>
                            <span>{(guestCounts.men + guestCounts.women) * priceDetails.personPrice} ر.س</span>
                        </div>
                        {priceDetails.seasonalIncrease > 0 && (
                            <div className="flex justify-between text-orange-600">
                                <span>زيادة موسمية</span>
                                <span>+{priceDetails.seasonalIncrease.toFixed(0)} ر.س</span>
                            </div>
                        )}
                        {priceDetails.addonsTotal > 0 && (
                            <div className="flex justify-between text-primary">
                                <span>خدمات إضافية</span>
                                <span>+{priceDetails.addonsTotal} ر.س</span>
                            </div>
                        )}
                        <div className="flex justify-between text-gray-400 pt-2 border-t border-gray-200 mt-2">
                            <span>ضريبة (15%)</span>
                            <span>{(priceDetails.total * 0.15).toFixed(0)} ر.س</span>
                        </div>
                    </div>

                    {/* 5. Total */}
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-400 mb-1">الإجمالي شامل الضريبة</p>
                        <PriceTag amount={priceDetails.total * 1.15} className="text-3xl font-black text-primary justify-center" />
                    </div>

                    {/* 6. Guest Data */}
                    <div className="space-y-3 pt-2 border-t border-gray-50">
                        <Input placeholder="الاسم" value={guestData.name} onChange={e => setGuestData({...guestData, name: e.target.value})} className="h-11 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary" />
                        <Input placeholder="الجوال" value={guestData.phone} onChange={e => setGuestData({...guestData, phone: e.target.value})} className="h-11 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary" />
                        <Input placeholder="البريد" value={guestData.email} onChange={e => setGuestData({...guestData, email: e.target.value})} className="h-11 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary" />
                    </div>

                    {/* 7. Booking Option */}
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setPaymentOption('deposit')} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${paymentOption === 'deposit' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                            <span className="text-[10px] font-black mb-1">عربون</span>
                            <span className="font-black text-[10px]">{paymentAmounts.deposit.toFixed(0)} ر.س</span>
                        </button>
                        <button onClick={() => setPaymentOption('hold_48h')} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${paymentOption === 'hold_48h' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                            <span className="text-[10px] font-black mb-1">حجز 48س</span>
                            <span className="font-black text-[10px]">{paymentAmounts.hold} ر.س</span>
                        </button>
                        <button onClick={() => setPaymentOption('consultation')} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${paymentOption === 'consultation' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                            <span className="text-[10px] font-black mb-1">استشارة</span>
                            <span className="font-black text-[10px]">{paymentAmounts.consultation} ر.س</span>
                        </button>
                    </div>

                    {/* 8. Payment Methods (Direct Trigger) */}
                    {isProcessing ? (
                        <div className="w-full h-14 bg-gray-100 rounded-2xl flex items-center justify-center gap-2 text-gray-500 font-bold">
                            <Loader2 className="animate-spin" /> جاري التوجيه...
                        </div>
                    ) : (
                        <div className="space-y-2 pt-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">اضغط للدفع والتأكيد</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => handlePaymentClick('apple')} className="h-12 rounded-xl bg-black text-white flex items-center justify-center hover:opacity-80 transition-opacity font-bold text-sm">Apple Pay</button>
                                <button onClick={() => handlePaymentClick('stc')} className="h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center hover:opacity-80 transition-opacity font-bold text-sm">STC Pay</button>
                                <button onClick={() => handlePaymentClick('card')} className="h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:opacity-80 transition-opacity font-bold text-sm">Visa/Master</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
