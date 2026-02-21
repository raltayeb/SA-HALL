
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, VAT_RATE, HallPackage, BookingConfig, HallAddon, HALL_AMENITIES, Coupon } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  MapPin, CheckCircle2, Loader2, Share2, Heart, ArrowRight, Star,
  Calendar as CalendarIcon, Package, Info, Sparkles, Check, Users, Clock, Mail, Tag, FileText, Lock, Plus, Minus, CreditCard, ShoppingBag, Phone, User, MessageCircle
} from 'lucide-react';
import { Calendar } from '../components/ui/Calendar';
import { useToast } from '../context/ToastContext';
import { format, isBefore, startOfDay, parseISO, isSameDay } from 'date-fns';
import { normalizeNumbers, isValidSaudiPhone } from '../utils/helpers';

interface HallDetailsProps {
  item: Hall & { vendor?: UserProfile };
  user: UserProfile | null;
  onBack: () => void;
  onPay?: (amount: number, context: 'booking', refId: string, customerData: any) => Promise<void>;
  onNavigate?: (tab: string) => void;
}

export const HallDetails: React.FC<HallDetailsProps> = ({ item, user, onBack, onPay, onNavigate }) => {
  const [selectedPackage, setSelectedPackage] = useState<HallPackage | null>(null);
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [bookingConfig, setBookingConfig] = useState<BookingConfig | null>(null);

  // Booking Type: 'night' or 'package'
  const [bookingType, setBookingType] = useState<'night' | 'package'>(item.price_per_night && item.price_per_night > 0 ? 'night' : 'package');

  // Guest Counts
  const [guestCounts, setGuestCounts] = useState({ men: 0, women: 0 });

  const [guestData, setGuestData] = useState({ name: user?.full_name || '', phone: user?.phone_number || '', email: user?.email || '' });
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'hold_48h' | 'consultation' | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<HallAddon[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    // 1. Set Default based on available options
    if (item.price_per_night && item.price_per_night > 0) {
        setBookingType('night');
        // Set default guest counts based on capacity
        setGuestCounts({ men: item.capacity_men || 50, women: item.capacity_women || 50 });
    } else if (item.packages && item.packages.length > 0) {
        const def = item.packages.find(p => p.is_default) || item.packages[0];
        setSelectedPackage(def);
        setBookingType('package');
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

    // 3. Fetch Config
    const fetchConfig = async () => {
        const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
        if (data?.value?.booking_config) {
            setBookingConfig(data.value.booking_config);
        }
    };
    fetchConfig();
  }, [item.id, item.packages, item.price_per_night, item.capacity_men, item.capacity_women]);

  // Pricing Logic (Night Price OR Package)
  const priceDetails = useMemo(() => {
      let baseCost = 0;
      let personPrice = 0;

      if (bookingType === 'night') {
          // Night price - fixed cost regardless of guest count
          baseCost = item.price_per_night || 0;
      } else if (selectedPackage) {
          // Package price - per person
          personPrice = selectedPackage.price;
          const totalGuests = guestCounts.men + guestCounts.women;
          baseCost = totalGuests * personPrice;
      }

      let seasonalMultiplier = 1;
      let seasonalIncrease = 0;

      // Check Seasonality (only for packages)
      if (bookingType === 'package' && bookingDate) {
          const dateStr = format(bookingDate, 'yyyy-MM-dd');
          const season = item.seasonal_prices?.find(s => dateStr >= s.start_date && dateStr <= s.end_date);
          if (season) {
              seasonalMultiplier = 1 + (season.increase_percentage / 100);
              seasonalIncrease = (baseCost * seasonalMultiplier) - baseCost;
          }
          baseCost = baseCost * seasonalMultiplier;
      }

      const addonsTotal = selectedAddons.reduce((sum, a) => sum + Number(a.price), 0);
      const subTotal = baseCost + addonsTotal;

      // Coupon Calculation
      let discountAmount = 0;
      if (appliedCoupon) {
          if (appliedCoupon.discount_type === 'percentage') {
              discountAmount = subTotal * (appliedCoupon.discount_value / 100);
          } else {
              discountAmount = appliedCoupon.discount_value;
          }
          discountAmount = Math.min(discountAmount, subTotal);
      }

      const taxableAmount = subTotal - discountAmount;
      const vatAmount = taxableAmount * 0.15; // 15% VAT
      const grandTotal = taxableAmount + vatAmount;

      return {
          personPrice,
          packageTotal: bookingType === 'package' ? baseCost : 0,
          nightPrice: bookingType === 'night' ? baseCost : 0,
          seasonalIncrease,
          addonsTotal,
          subTotal,
          discountAmount,
          vatAmount,
          grandTotal,
          total: subTotal
      };
  }, [bookingType, selectedPackage, bookingDate, guestCounts, item.seasonal_prices, item.price_per_night, selectedAddons, appliedCoupon]);

  // Payment Amounts based on Grand Total
  const paymentAmounts = useMemo(() => {
      if (!bookingConfig) return { deposit: 0, hold: 0, consultation: 0 };
      const deposit = bookingConfig.deposit_fixed + (priceDetails.grandTotal * (bookingConfig.deposit_percent / 100));
      return {
          deposit,
          hold: bookingConfig.hold_price,
          consultation: bookingConfig.consultation_price
      };
  }, [bookingConfig, priceDetails.grandTotal]);

  const toggleAddon = (addon: HallAddon) => {
      setSelectedAddons(prev => prev.some(a => a.name === addon.name) ? prev.filter(a => a.name !== addon.name) : [...prev, addon]);
  };

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
              toast({ title: 'غير مخصص', description: 'هذا الكوبون لا يشمل هذه القاعة.', variant: 'destructive' });
              setAppliedCoupon(null);
              return;
          }

          setAppliedCoupon(data);
          toast({ title: 'تم تطبيق الخصم', description: 'تم تفعيل الكوبون بنجاح.', variant: 'success' });

      } catch (err) {
          console.error(err);
          toast({ title: 'خطأ', description: 'حدث خطأ أثناء التحقق.', variant: 'destructive' });
      } finally {
          setValidatingCoupon(false);
      }
  };

  const handlePaymentClick = async () => {
      if (!bookingDate || !paymentOption || !guestData.name || !guestData.phone) {
          toast({ title: 'ناقص البيانات', description: 'يرجى استكمال التاريخ، نوع الحجز، وبياناتك.', variant: 'destructive' });
          return;
      }

      const normalizedPhone = normalizeNumbers(guestData.phone);
      if(!isValidSaudiPhone(normalizedPhone)) {
          toast({ title: 'رقم غير صالح', description: 'يرجى إدخال رقم هاتف سعودي صحيح.', variant: 'destructive' });
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
              total_amount: priceDetails.grandTotal, // Saved as Grand Total
              vat_amount: priceDetails.vatAmount,
              paid_amount: 0, 
              discount_amount: priceDetails.discountAmount,
              applied_coupon: appliedCoupon?.code,
              booking_option: paymentOption,
              package_details: selectedPackage,
              guest_name: guestData.name,
              guest_phone: normalizedPhone,
              guest_email: guestData.email,
              user_id: user?.id || null,
              status: 'pending',
              payment_status: 'unpaid',
              guests_adults: guestCounts.men,
              guests_children: guestCounts.women,
              items: [
                  ...(selectedPackage ? [{ name: `باقة: ${selectedPackage.name}`, price: selectedPackage.price, qty: (guestCounts.men + guestCounts.women), type: 'package' }] : []),
                  ...selectedAddons.map(addon => ({ name: addon.name, price: addon.price, qty: 1, type: 'addon' }))
              ]
          }]).select().single();

          if (error) throw error;

          // Simulate Success directly for UX flow as requested
          setShowSuccess(true);
          toast({ title: 'تم الحجز بنجاح', description: 'تم إرسال الطلب، يرجى التواصل مع القاعة لإكمال الترتيبات.', variant: 'success' });

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
            {/* Right Column: Details */}
            <div className="lg:col-span-2 space-y-8">
                {/* Image Gallery */}
                <div className="h-[400px] rounded-[2.5rem] overflow-hidden relative group">
                    <img src={allImages[0]} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                    <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur px-4 py-2 rounded-2xl font-black text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" /> {item.city}
                    </div>
                    {allImages.length > 1 && (
                        <div className="absolute bottom-6 left-6 flex gap-2">
                            {allImages.slice(1, 4).map((img, i) => (
                                <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-lg cursor-pointer">
                                    <img src={img} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 1. Description */}
                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                        <Info className="w-6 h-6 text-primary" /> وصف القاعة
                    </h3>
                    <div className="text-sm font-medium text-gray-600 leading-loose whitespace-pre-line">
                        {item.description || 'لا يوجد وصف متاح.'}
                    </div>
                </div>

                {/* 2. Packages & Night Price */}
                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                        <Package className="w-6 h-6 text-primary" /> خيارات الحجز
                    </h3>

                    {/* Booking Type Toggle */}
                    <div className="flex gap-3 mb-6">
                        {item.price_per_night && item.price_per_night > 0 && (
                            <button
                                onClick={() => setBookingType('night')}
                                className={`flex-1 p-4 rounded-2xl border-2 transition-all ${bookingType === 'night' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <CalendarIcon className={`w-5 h-5 ${bookingType === 'night' ? 'text-primary' : 'text-gray-400'}`} />
                                    {bookingType === 'night' && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                </div>
                                <p className="font-black text-sm text-gray-900">سعر الليلة</p>
                                <PriceTag amount={item.price_per_night} className="text-lg font-black text-primary mt-1" />
                            </button>
                        )}
                        {item.packages && item.packages.length > 0 && (
                            <button
                                onClick={() => { setBookingType('package'); if (!selectedPackage) { const def = item.packages?.find(p => p.is_default) || item.packages?.[0]; setSelectedPackage(def); setGuestCounts({ men: def?.min_men || 0, women: def?.min_women || 0 }); }}}
                                className={`flex-1 p-4 rounded-2xl border-2 transition-all ${bookingType === 'package' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <Package className={`w-5 h-5 ${bookingType === 'package' ? 'text-primary' : 'text-gray-400'}`} />
                                    {bookingType === 'package' && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                </div>
                                <p className="font-black text-sm text-gray-900">باقات الأفراد</p>
                                <p className="text-xs text-gray-500 font-bold mt-1">تبدأ من {item.packages[0].price} ر.س</p>
                            </button>
                        )}
                    </div>

                    {/* Night Price Details */}
                    {bookingType === 'night' && item.price_per_night && item.price_per_night > 0 && (
                        <div className="p-6 bg-gradient-to-l from-primary/10 to-primary/5 rounded-[2rem] border border-primary/20 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center">
                                        <CalendarIcon className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-lg text-gray-900">سعر الليلة الكاملة</h4>
                                        <p className="text-xs text-gray-500 font-bold mt-1">مناسب للأعراس والمناسبات الكبيرة</p>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <PriceTag amount={item.price_per_night} className="text-3xl font-black text-primary block" />
                                    <span className="text-[10px] text-gray-400 font-bold">/ لليلة كاملة</span>
                                </div>
                            </div>
                            
                            {/* Max Capacity for Night */}
                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-primary/10">
                                <div className="bg-white p-3 rounded-xl border border-primary/10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-bold text-gray-500">الحد الأقصى للرجال</span>
                                    </div>
                                    <p className="text-lg font-black text-gray-900">{item.capacity_men || 0} رجل</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-primary/10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-bold text-gray-500">الحد الأقصى للنساء</span>
                                    </div>
                                    <p className="text-lg font-black text-gray-900">{item.capacity_women || 0} امرأة</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Package Selection */}
                    {bookingType === 'package' && item.packages && item.packages.length > 0 && (
                        <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 no-scrollbar">
                            {item.packages.map((pkg, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => { setSelectedPackage(pkg); setGuestCounts({ men: pkg.min_men, women: pkg.min_women }); }}
                                    className={`cursor-pointer border-2 rounded-[2rem] p-6 transition-all relative overflow-hidden min-w-[280px] flex-1 ${selectedPackage?.name === pkg.name ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
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
                                    <div className="flex items-end gap-1">
                                        <PriceTag amount={pkg.price} className="text-xl font-black text-primary block text-left" />
                                        <span className="text-[10px] text-gray-400 font-bold mb-1">/ للفرد</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Addons / Services - MOVED HERE */}
                {item.addons && item.addons.length > 0 && (
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-primary" /> الخدمات الإضافية
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {item.addons.map((addon, i) => {
                                const isSelected = selectedAddons.some(a => a.name === addon.name);
                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => toggleAddon(addon)}
                                        className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300 bg-white'}`}>
                                                {isSelected && <Check className="w-3 h-3" />}
                                            </div>
                                            <span className="font-bold text-gray-900 text-sm">{addon.name}</span>
                                        </div>
                                        <PriceTag amount={addon.price} className="text-primary font-black" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 4. Amenities */}
                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-primary" /> مميزات القاعة
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(item.amenities?.length ? item.amenities : HALL_AMENITIES).map((amenity, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-700 hover:border-primary/30 transition-colors">
                                <Check className="w-5 h-5 text-green-500 shrink-0" /> {amenity}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. Policies */}
                {item.policies && (
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                        <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-6 h-6 text-primary" /> الشروط والأحكام
                        </h3>
                        <p className="text-gray-600 leading-loose font-medium text-sm whitespace-pre-line bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            {item.policies}
                        </p>
                    </div>
                )}

                {/* 6. Store CTA */}
                <div 
                    className="relative rounded-[2.5rem] overflow-hidden min-h-[220px] flex items-center border border-gray-100 group cursor-pointer shadow-sm hover:shadow-lg transition-all"
                    onClick={() => onNavigate && onNavigate('store_page')}
                >
                    <img 
                        src="https://images.unsplash.com/photo-1478147427282-58a87a120781?auto=format&fit=crop&q=80&w=800" 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        alt="Store Background"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
                    <div className="relative z-10 p-10 text-white w-full">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="space-y-3">
                                <div className="inline-flex items-center gap-2 text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20 backdrop-blur-sm w-fit">
                                    <ShoppingBag className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">متجر القاعة</span>
                                </div>
                                <h3 className="text-3xl font-black leading-tight">هل تحتاج المزيد من التجهيزات؟</h3>
                                <p className="text-white/80 font-bold text-sm max-w-md">
                                    تصفح متجرنا لإضافة الكراسي، الطاولات، أجهزة الإضاءة، وضيافة القهوة والشاي.
                                </p>
                            </div>
                            <div className="bg-white text-primary px-6 py-4 rounded-2xl font-black text-sm flex items-center gap-3 shadow-xl group-hover:scale-105 transition-transform">
                                <span>تصفح المتجر</span>
                                <ArrowRight className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Left Column: Booking Form / Success View */}
            <div className="relative">
                <div className="sticky top-28 bg-white border border-gray-200 rounded-[2.5rem] p-6 space-y-6">
                    
                    {showSuccess ? (
                        <div className="animate-in zoom-in duration-300 text-center space-y-6 py-4">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-100">
                                <CheckCircle2 className="w-10 h-10 text-green-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-gray-900">تم الحجز بنجاح!</h3>
                                <p className="text-sm text-gray-500 font-bold">شكراً لك، تم إرسال طلبك للقاعة.</p>
                            </div>
                            
                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 text-right space-y-4">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest text-center mb-2">تواصل مع القاعة للمتابعة</p>
                                
                                {item.vendor?.phone_number && (
                                    <a href={`tel:${item.vendor.phone_number}`} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-primary/30 hover:shadow-md transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Phone className="w-5 h-5" /></div>
                                            <span className="font-bold text-gray-900">اتصال هاتفي</span>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                                    </a>
                                )}
                                
                                {item.vendor?.phone_number && (
                                    <a href={`https://wa.me/${item.vendor.phone_number?.replace('0', '966')}`} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-green-500/30 hover:shadow-md transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center"><MessageCircle className="w-5 h-5" /></div>
                                            <span className="font-bold text-gray-900">واتساب</span>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-green-600 transition-colors" />
                                    </a>
                                )}
                            </div>

                            <Button onClick={onBack} variant="outline" className="w-full h-12 rounded-2xl font-bold border-gray-200">
                                العودة للقائمة
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">تاريخ الحجز</label>
                                <div className="bg-gray-50 p-4 rounded-[2rem] border border-gray-100">
                                    <Calendar mode="single" selected={bookingDate} onSelect={setBookingDate} disabled={(date) => isBefore(date, startOfDay(new Date())) || blockedDates.some(d => isSameDay(d, date))} className="w-full" />
                                </div>
                            </div>

                            {/* Guest Counts & Pricing Logic */}
                            {bookingType === 'night' ? (
                                <div className="space-y-4 border-t border-gray-50 pt-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">نوع الحجز</label>
                                        <span className="text-xs font-black text-primary bg-primary/5 px-2 py-1 rounded-lg">سعر الليلة</span>
                                    </div>
                                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                        <p className="text-xs font-bold text-gray-600">السعر ثابت بغض النظر عن عدد الضيوف</p>
                                    </div>
                                </div>
                            ) : selectedPackage && (
                                <div className="space-y-4 border-t border-gray-50 pt-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الباقة المختارة</label>
                                        <span className="text-xs font-black text-primary bg-primary/5 px-2 py-1 rounded-lg">{selectedPackage.name}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                        <div>
                                            <label className="text-[9px] font-bold text-gray-400 mb-1 block">رجال</label>
                                            <div className="flex items-center gap-2 bg-white rounded-xl px-2 py-1 border border-gray-200">
                                                <button onClick={() => setGuestCounts(prev => ({...prev, men: Math.max(selectedPackage.min_men, prev.men - 10)}))} className="p-1 hover:bg-gray-100 rounded"><Minus className="w-3 h-3" /></button>
                                                <span className="flex-1 text-center font-black text-sm">{guestCounts.men}</span>
                                                <button onClick={() => setGuestCounts(prev => ({...prev, men: Math.min(selectedPackage.max_men, prev.men + 10)}))} className="p-1 hover:bg-gray-100 rounded"><Plus className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-gray-400 mb-1 block">نساء</label>
                                            <div className="flex items-center gap-2 bg-white rounded-xl px-2 py-1 border border-gray-200">
                                                <button onClick={() => setGuestCounts(prev => ({...prev, women: Math.max(selectedPackage.min_women, prev.women - 10)}))} className="p-1 hover:bg-gray-100 rounded"><Minus className="w-3 h-3" /></button>
                                                <span className="flex-1 text-center font-black text-sm">{guestCounts.women}</span>
                                                <button onClick={() => setGuestCounts(prev => ({...prev, women: Math.min(selectedPackage.max_women, prev.women + 10)}))} className="p-1 hover:bg-gray-100 rounded"><Plus className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Coupon Input */}
                            <div className="flex gap-2 pt-4 border-t border-gray-50">
                                <div className="relative flex-1">
                                    <input 
                                        className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 pl-8 text-xs font-bold focus:bg-white transition-colors uppercase outline-none focus:border-primary/50"
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
                            
                            {/* Summary Breakdown */}
                            <div className="text-center py-4 space-y-2 border-b border-gray-50">
                                {/* Base Price */}
                                {bookingType === 'night' ? (
                                    <div className="flex justify-between text-xs font-bold text-gray-700">
                                        <span>سعر الليلة</span>
                                        <span>{Math.round(priceDetails.nightPrice)} ر.س</span>
                                    </div>
                                ) : selectedPackage && (
                                    <div className="flex justify-between text-xs font-bold text-gray-700">
                                        <span>الباقة ({selectedPackage.name})</span>
                                        <span>{Math.round(priceDetails.packageTotal)} ر.س</span>
                                    </div>
                                )}

                                {/* Addons */}
                                {selectedAddons.length > 0 && (
                                    <div className="space-y-1">
                                        {selectedAddons.map((addon, idx) => (
                                            <div key={idx} className="flex justify-between text-xs font-bold text-gray-500 pr-4">
                                                <span>+ {addon.name}</span>
                                                <span>{Math.round(addon.price)} ر.س</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Coupon */}
                                {appliedCoupon && (
                                    <div className="flex justify-between items-center text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                        <span>كوبون خصم ({appliedCoupon.code})</span>
                                        <span>- {Math.round(priceDetails.discountAmount)} ر.س</span>
                                    </div>
                                )}

                                {/* Subtotal */}
                                <div className="flex justify-between text-xs font-bold text-gray-400 pt-2 border-t border-dashed border-gray-100">
                                    <span>المجموع الفرعي</span>
                                    <span>{Math.round(priceDetails.subTotal)} ر.س</span>
                                </div>

                                {/* VAT */}
                                <div className="flex justify-between text-xs font-bold text-gray-400">
                                    <span>الضريبة (15%)</span>
                                    <span>{Math.round(priceDetails.vatAmount)} ر.س</span>
                                </div>

                                {/* Grand Total */}
                                <div className="flex justify-between items-end pt-2 border-t border-dashed border-gray-200">
                                    <span className="text-xs font-bold text-gray-600">الإجمالي النهائي</span>
                                    <PriceTag amount={priceDetails.grandTotal} className="text-3xl font-black text-primary" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Input placeholder="الاسم" value={guestData.name} onChange={e => setGuestData({...guestData, name: e.target.value})} className="h-11 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary" icon={<User className="w-4 h-4" />} />
                                <Input placeholder="الجوال (05xxxxxxxx)" value={guestData.phone} onChange={e => setGuestData({...guestData, phone: normalizeNumbers(e.target.value)})} className="h-11 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary" icon={<Phone className="w-4 h-4" />} />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => setPaymentOption('deposit')} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${paymentOption === 'deposit' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                                    <span className="text-lg font-black text-primary mb-1">عربون</span>
                                    <span className="text-2xl font-black text-primary">{paymentAmounts.deposit.toFixed(0)}</span>
                                </button>
                                <button onClick={() => setPaymentOption('hold_48h')} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${paymentOption === 'hold_48h' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                                    <span className="text-lg font-black text-primary mb-1">حجز 48س</span>
                                    <span className="text-2xl font-black text-primary">{paymentAmounts.hold}</span>
                                </button>
                                <button onClick={() => setPaymentOption('consultation')} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${paymentOption === 'consultation' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                                    <span className="text-lg font-black text-primary mb-1">استشارة</span>
                                    <span className="text-2xl font-black text-primary">{paymentAmounts.consultation}</span>
                                </button>
                            </div>

                            <Button onClick={handlePaymentClick} disabled={isProcessing} className="w-full h-14 rounded-2xl font-black text-lg bg-gray-900 text-white shadow-xl hover:bg-black transition-all active:scale-95 group">
                                {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                    <>
                                        <CreditCard className="w-5 h-5 ml-2 group-hover:text-primary transition-colors" />
                                        تأكيد الحجز والدفع
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
