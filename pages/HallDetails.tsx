
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, Service, VAT_RATE, HALL_AMENITIES, Booking, HallAddon, HallPackage } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  MapPin, CheckCircle2, Loader2, Sparkles, 
  Share2, Heart, ArrowRight, Star,
  ShieldCheck, Info, Check, Flame, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Package, Wifi, Car, Music, Users, Circle, CircleDot,
  Briefcase
} from 'lucide-react';
import { Calendar } from '../components/ui/Calendar';
import { useToast } from '../context/ToastContext';
import { format, isSameDay, isBefore, startOfDay, parse } from 'date-fns';

interface HallDetailsProps {
  item: (Hall | Service) & { vendor?: UserProfile };
  type: 'hall' | 'service' | 'chalet';
  user: UserProfile | null;
  onBack: () => void;
}

export const HallDetails: React.FC<HallDetailsProps> = ({ item, type, user, onBack }) => {
  // --- State ---
  const [isBooking, setIsBooking] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [hallAddons, setHallAddons] = useState<HallAddon[]>([]);
  const [hallPackages, setHallPackages] = useState<HallPackage[]>([]);
  const [vendorServices, setVendorServices] = useState<Service[]>([]); // New: Vendor Services
  
  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);

  // Booking Form State
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [guestData, setGuestData] = useState({ name: user?.full_name || '', phone: user?.phone_number || '', email: user?.email || '' });
  
  const [selectedAddons, setSelectedAddons] = useState<HallAddon[]>([]);
  const [selectedVendorServices, setSelectedVendorServices] = useState<Service[]>([]); // New: Selected Services
  const [selectedPackage, setSelectedPackage] = useState<HallPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'full' | 'deposit' | 'hold'>('deposit'); // Default to deposit

  const { toast } = useToast();
  const isHall = type === 'hall' || type === 'chalet';
  const hall = isHall ? (item as Hall) : null;
  const service = !isHall ? (item as Service) : null;
  
  // --- Computed ---
  const allImages = useMemo(() => {
    const imgs = (item as any).images && (item as any).images.length > 0 
      ? (item as any).images : [(item as any).image_url].filter(Boolean);
    return imgs.length > 0 ? imgs : ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'];
  }, [item]);

  // Pricing Logic
  const basePrice = useMemo(() => {
      if (selectedPackage) return Number(selectedPackage.price);
      if (isHall && hall?.price_per_night) return Number(hall.price_per_night);
      if (!isHall && service?.price) return Number(service.price);
      return 0;
  }, [selectedPackage, isHall, hall, service]);

  const subTotal = useMemo(() => {
    let sum = basePrice;
    sum += selectedAddons.reduce((s, a) => s + Number(a.price), 0);
    sum += selectedVendorServices.reduce((s, vs) => s + Number(vs.price), 0);
    return isNaN(sum) ? 0 : sum;
  }, [selectedAddons, selectedVendorServices, basePrice]);

  const vat = subTotal * VAT_RATE;
  const grandTotal = subTotal + vat;

  const dueNow = useMemo(() => {
      if (paymentMethod === 'hold') return 0;
      if (paymentMethod === 'deposit') return grandTotal * 0.30; // 30% Deposit
      return grandTotal;
  }, [grandTotal, paymentMethod]);

  // --- Effects ---
  const fetchData = useCallback(async () => {
    if (isHall) {
      const { data: bookingsData } = await supabase.from('bookings').select('booking_date').eq('hall_id', item.id).neq('status', 'cancelled');
      if (bookingsData) {
          const dates = bookingsData
            .map(b => {
                try { return parse(b.booking_date, 'yyyy-MM-dd', new Date()); } catch (e) { return null; }
            })
            .filter((d): d is Date => d !== null);
          setBlockedDates(dates);
      }
      
      const h = item as Hall;
      if (h.addons) setHallAddons(h.addons || []);
      if (h.packages) setHallPackages(h.packages || []);

      // Fetch Vendor Services (Cross-sell)
      const { data: vServices } = await supabase.from('services').select('*').eq('vendor_id', item.vendor_id).eq('is_active', true);
      if (vServices) setVendorServices(vServices);
    }
  }, [item.id, isHall, item]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Handlers ---
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % allImages.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));

  const handleBookingSubmission = async () => {
    if (!bookingDate) {
        toast({ title: 'تنبيه', description: 'يرجى اختيار تاريخ الحجز.', variant: 'destructive' });
        return;
    }
    if (!guestData.name || !guestData.phone) {
        toast({ title: 'تنبيه', description: 'يرجى إدخال اسمك ورقم الجوال.', variant: 'destructive' });
        return;
    }

    setIsBooking(true);
    try {
      const payload = {
        hall_id: isHall ? hall!.id : null,
        vendor_id: item.vendor_id,
        booking_date: format(bookingDate, 'yyyy-MM-dd'),
        total_amount: grandTotal,
        vat_amount: vat,
        paid_amount: paymentMethod === 'hold' ? 0 : dueNow,
        payment_status: paymentMethod === 'full' ? 'paid' : paymentMethod === 'deposit' ? 'partial' : 'unpaid',
        status: paymentMethod === 'hold' ? 'on_hold' : 'pending',
        booking_method: paymentMethod,
        package_name: selectedPackage?.name,
        guest_name: guestData.name,
        guest_phone: guestData.phone,
        items: [
            ...(selectedPackage ? [{ name: `باقة: ${selectedPackage.name}`, price: selectedPackage.price, qty: 1, type: 'package' }] : []),
            ...selectedAddons.map(addon => ({
                name: addon.name,
                price: addon.price,
                qty: 1,
                type: 'addon'
            })),
            ...selectedVendorServices.map(svc => ({
                id: svc.id,
                name: svc.name,
                price: svc.price,
                qty: 1,
                type: 'service'
            }))
        ],
      };

      const { data, error } = await supabase.from('bookings').insert([payload]).select().single();
      if (error) throw error;
      
      setCompletedBooking(data as any);
      setShowInvoice(true);
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally { 
      setIsBooking(false); 
    }
  };

  const toggleAddon = (addon: HallAddon) => {
      setSelectedAddons(prev => {
          const exists = prev.find(a => a.name === addon.name);
          if (exists) return prev.filter(a => a.name !== addon.name);
          return [...prev, addon];
      });
  };

  const toggleVendorService = (svc: Service) => {
      setSelectedVendorServices(prev => {
          const exists = prev.find(s => s.id === svc.id);
          if (exists) return prev.filter(s => s.id !== svc.id);
          return [...prev, svc];
      });
  };

  return (
    <div className="bg-white min-h-screen text-right font-sans pb-20" dir="rtl">
      
      {/* 1. Header */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-800 hover:bg-gray-100 px-4 py-2 rounded-full transition-all font-bold">
            <ArrowRight className="w-4 h-4" />
            <span className="hidden md:inline">العودة</span>
          </button>
          
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="rounded-full text-gray-600 hover:bg-gray-100 gap-2"><Share2 className="w-4 h-4" /> <span className="hidden sm:inline">مشاركة</span></Button>
            <Button variant="ghost" size="sm" className="rounded-full text-gray-600 hover:bg-gray-100 gap-2"><Heart className="w-4 h-4" /> <span className="hidden sm:inline">حفظ</span></Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* 2. Title Section */}
        <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">{item.name}</h1>
            <div className="flex items-center gap-4 text-sm font-bold text-gray-600">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-current text-primary" /> 4.9 (12 تقييم)</span>
                <span>•</span>
                <span className="flex items-center gap-1 underline cursor-pointer hover:text-primary">{isHall ? hall?.city : 'خدمة شاملة'}، المملكة العربية السعودية</span>
                
                {/* Capacity Stats */}
                {isHall && (
                    <>
                        <span>•</span>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-xs"><Users className="w-3 h-3" /> رجال: {hall?.capacity_men || 0}</span>
                            <span className="flex items-center gap-1 bg-pink-50 text-pink-700 px-2 py-0.5 rounded-lg text-xs"><Users className="w-3 h-3" /> نساء: {hall?.capacity_women || 0}</span>
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* 3. Image Carousel */}
        <div className="relative w-full h-[400px] md:h-[550px] rounded-[2.5rem] overflow-hidden group shadow-lg">
            {allImages.map((img, index) => (
                <div 
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    <img src={img} className="w-full h-full object-cover" alt={`Slide ${index}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                </div>
            ))}
            
            <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={prevSlide} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-black flex items-center justify-center transition-all shadow-lg transform translate-x-2 group-hover:translate-x-0">
                    <ChevronRight className="w-6 h-6" />
                </button>
                <button onClick={nextSlide} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-black flex items-center justify-center transition-all shadow-lg transform -translate-x-2 group-hover:translate-x-0">
                    <ChevronLeft className="w-6 h-6" />
                </button>
            </div>

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
                {allImages.map((_, i) => (
                    <button 
                        key={i} 
                        onClick={() => setCurrentSlide(i)}
                        className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                    />
                ))}
            </div>
        </div>

        {/* 4. Content Layout */}
        <div className="grid lg:grid-cols-3 gap-12 relative pt-8">
            
            {/* LEFT COLUMN: Info */}
            <div className="lg:col-span-2 space-y-12">
                
                {/* Overview */}
                <div className="border-b border-gray-100 pb-10 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                            {item.vendor?.avatar_url ? <img src={item.vendor.avatar_url} className="w-full h-full object-cover rounded-2xl" /> : <ShieldCheck className="w-8 h-8 text-primary/40" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">مستضاف بواسطة {item.vendor?.business_name || 'القاعة'}</h2>
                            <p className="text-gray-500 font-bold text-sm">سعة {isHall ? hall?.capacity : 'غير محدودة'} ضيوف • استجابة سريعة</p>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                        <p className="text-gray-700 leading-loose font-medium text-lg">
                            {item.description || "استمتع بتجربة فريدة ومميزة. تم تجهيز هذا المكان لضمان راحتكم في أهم مناسباتكم."}
                        </p>
                    </div>
                </div>

                {/* Section A: Packages */}
                {isHall && hallPackages.length > 0 && (
                    <div className="border-b border-gray-100 pb-10 space-y-6">
                        <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <Package className="w-6 h-6 text-primary" /> باقات الحجز الخاصة
                        </h3>
                        <p className="text-sm text-gray-500 font-bold mb-4">اختر الباقة المناسبة لاحتياجك (تغني عن السعر الأساسي).</p>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Option to clear package */}
                            <div 
                                onClick={() => setSelectedPackage(null)}
                                className={`
                                    cursor-pointer p-5 rounded-[1.5rem] border-2 transition-all duration-300 flex flex-col justify-between h-full relative
                                    ${!selectedPackage 
                                        ? 'border-primary bg-primary/5 shadow-sm' 
                                        : 'border-gray-100 bg-white hover:border-gray-200'}
                                `}
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-black text-lg">الحجز الأساسي</h4>
                                        {!selectedPackage && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                    </div>
                                    <p className="text-sm text-gray-500">حجز القاعة بدون إضافات خاصة (السعر الافتراضي).</p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100/50">
                                    <PriceTag amount={Number(hall?.price_per_night)} className="text-xl text-primary" />
                                </div>
                            </div>

                            {hallPackages.map((pkg, i) => {
                                const isSelected = selectedPackage?.name === pkg.name;
                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => setSelectedPackage(pkg)}
                                        className={`
                                            cursor-pointer p-5 rounded-[1.5rem] border-2 transition-all duration-300 flex flex-col justify-between h-full relative
                                            ${isSelected 
                                                ? 'border-primary bg-primary/5 shadow-sm' 
                                                : 'border-gray-100 bg-white hover:border-gray-200'}
                                        `}
                                    >
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-black text-lg text-primary">{pkg.name}</h4>
                                                {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                            </div>
                                            <p className="text-sm text-gray-500">{pkg.description}</p>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-gray-100/50">
                                            <PriceTag amount={pkg.price} className="text-xl text-primary" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Section B: Amenities */}
                {isHall && (
                    <div className="border-b border-gray-100 pb-10 space-y-6">
                        <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-primary" /> مميزات القاعة
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                            {(hall?.amenities?.length ? hall.amenities : HALL_AMENITIES).map((amenity, i) => (
                                <div key={i} className="flex items-center gap-3 group">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <span className="text-gray-700 font-bold text-sm group-hover:text-gray-900">{amenity}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section C: Vendor Services (Global Services) */}
                {isHall && vendorServices.length > 0 && (
                    <div className="border-b border-gray-100 pb-10 space-y-6">
                        <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <Briefcase className="w-6 h-6 text-primary" /> خدمات يقدمها البائع
                        </h3>
                        <p className="text-sm text-gray-500 font-bold mb-4">بإمكانك إضافة هذه الخدمات الخارجية لحجزك.</p>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            {vendorServices.map((svc, i) => {
                                const isSelected = selectedVendorServices.find(s => s.id === svc.id);
                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => toggleVendorService(svc)}
                                        className={`
                                            cursor-pointer p-5 rounded-[1.5rem] border-2 transition-all duration-300 flex items-center justify-between group
                                            ${isSelected 
                                                ? 'border-primary bg-primary/5 shadow-sm' 
                                                : 'border-gray-100 bg-white hover:border-primary/30 hover:shadow-md'}
                                        `}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl bg-white border flex items-center justify-center transition-colors ${isSelected ? 'border-primary text-primary' : 'border-gray-200 text-gray-300'}`}>
                                                {isSelected ? <Check className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className={`font-black text-sm ${isSelected ? 'text-primary' : 'text-gray-900'}`}>{svc.name}</p>
                                                <span className="text-[10px] text-gray-400 font-bold">{svc.category}</span>
                                            </div>
                                        </div>
                                        <PriceTag amount={svc.price} className={`text-lg ${isSelected ? 'text-primary' : 'text-gray-900'}`} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Section D: Addons (Hall Specific) */}
                {isHall && hallAddons.length > 0 && (
                    <div className="border-b border-gray-100 pb-10 space-y-6">
                        <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <Package className="w-6 h-6 text-primary" /> خدمات إضافية (مرافق القاعة)
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {hallAddons.map((addon, i) => {
                                const isSelected = selectedAddons.find(a => a.name === addon.name);
                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => toggleAddon(addon)}
                                        className={`
                                            cursor-pointer p-5 rounded-[1.5rem] border-2 transition-all duration-300 flex items-center justify-between group
                                            ${isSelected 
                                                ? 'border-primary bg-primary/5 shadow-sm' 
                                                : 'border-gray-100 bg-white hover:border-primary/30 hover:shadow-md'}
                                        `}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300 group-hover:border-primary/50'}`}>
                                                {isSelected && <Check className="w-3 h-3" />}
                                            </div>
                                            <div>
                                                <p className={`font-black text-sm ${isSelected ? 'text-primary' : 'text-gray-900'}`}>{addon.name}</p>
                                            </div>
                                        </div>
                                        <PriceTag amount={addon.price} className={`text-lg ${isSelected ? 'text-primary' : 'text-gray-900'}`} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Section E: Calendar */}
                <div className="py-4">
                    <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-primary" /> الأيام المتاحة للحجز
                    </h3>
                    
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex justify-center" dir="ltr">
                        <Calendar 
                            dir="ltr"
                            mode="single"
                            selected={bookingDate}
                            onSelect={setBookingDate}
                            disabled={(date) => isBefore(date, startOfDay(new Date())) || blockedDates.some(d => isSameDay(d, date))}
                            className="w-full max-w-md"
                            classNames={{
                                day_selected: "bg-primary text-white hover:bg-primary focus:bg-primary rounded-full shadow-lg shadow-primary/30",
                                day_today: "text-primary font-black border-2 border-primary/20",
                                day_disabled: `
                                    opacity-100 cursor-not-allowed text-red-300 font-medium
                                    bg-[linear-gradient(45deg,transparent_25%,rgba(254,202,202,0.4)_25%,rgba(254,202,202,0.4)_50%,transparent_50%,transparent_75%,rgba(254,202,202,0.4)_75%,rgba(254,202,202,0.4)_100%)] 
                                    bg-[length:10px_10px] rounded-full
                                `
                            }}
                        />
                    </div>
                </div>

            </div>

            {/* RIGHT COLUMN: Sticky Booking Card */}
            <div className="relative">
                <div className="sticky top-28 space-y-6">
                    <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-400 to-pink-300"></div>
                        
                        <div className="flex justify-between items-end">
                            <div className="flex items-end gap-1">
                                <PriceTag amount={grandTotal} className="text-3xl font-black text-gray-900" />
                                <span className="text-gray-500 text-xs font-bold mb-1">/ الإجمالي</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> 4.9
                            </div>
                        </div>

                        {/* Booking Form */}
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <Input 
                                    placeholder="الاسم الكريم" 
                                    className="h-12 bg-white rounded-xl text-sm font-bold border-gray-200"
                                    value={guestData.name}
                                    onChange={e => setGuestData({...guestData, name: e.target.value})}
                                />
                                <Input 
                                    placeholder="رقم الجوال" 
                                    className="h-12 bg-white rounded-xl text-sm font-bold border-gray-200"
                                    value={guestData.phone}
                                    onChange={e => setGuestData({...guestData, phone: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">طريقة الدفع</p>
                            <div className="space-y-2">
                                <div onClick={() => setPaymentMethod('deposit')} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${paymentMethod === 'deposit' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                                    {paymentMethod === 'deposit' ? <CircleDot className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-gray-300" />}
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-gray-900">دفع عربون (30%)</div>
                                        <div className="text-[10px] text-gray-500">ادفع {grandTotal * 0.3} ر.س الآن لتأكيد الحجز</div>
                                    </div>
                                </div>
                                <div onClick={() => setPaymentMethod('full')} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${paymentMethod === 'full' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                                    {paymentMethod === 'full' ? <CircleDot className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-gray-300" />}
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-gray-900">دفع كامل المبلغ</div>
                                        <div className="text-[10px] text-gray-500">سداد فوري وشامل</div>
                                    </div>
                                </div>
                                <div onClick={() => setPaymentMethod('hold')} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${paymentMethod === 'hold' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                                    {paymentMethod === 'hold' ? <CircleDot className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-gray-300" />}
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-gray-900">حجز مؤقت (48 ساعة)</div>
                                        <div className="text-[10px] text-gray-500">حجز مبدئي بدون دفع الآن</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="text-center space-y-4 pt-2">
                            <div className="space-y-2 pt-4 border-t border-gray-100">
                                <div className="flex justify-between text-sm text-gray-600 font-medium">
                                    <span>الأساسي / الباقة</span>
                                    <span>{basePrice} SAR</span>
                                </div>
                                {selectedAddons.length > 0 && (
                                    <div className="flex justify-between text-sm text-gray-600 font-medium">
                                        <span>إضافات القاعة ({selectedAddons.length})</span>
                                        <span>{selectedAddons.reduce((s,a) => s + Number(a.price), 0)} SAR</span>
                                    </div>
                                )}
                                {selectedVendorServices.length > 0 && (
                                    <div className="flex justify-between text-sm text-gray-600 font-medium">
                                        <span>خدمات خارجية ({selectedVendorServices.length})</span>
                                        <span>{selectedVendorServices.reduce((s,a) => s + Number(a.price), 0)} SAR</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm text-gray-600 font-medium">
                                    <span>الضريبة (15%)</span>
                                    <span>{vat.toFixed(2)} SAR</span>
                                </div>
                            </div>

                            <div className="flex justify-between text-lg font-black text-primary pt-4 border-t border-gray-200 border-dashed">
                                <span>المستحق الآن</span>
                                <span>{dueNow.toLocaleString()} SAR</span>
                            </div>
                        </div>

                        <Button onClick={handleBookingSubmission} disabled={isBooking} className="w-full h-14 rounded-2xl text-lg font-black bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95">
                            {isBooking ? <Loader2 className="w-6 h-6 animate-spin" /> : (paymentMethod === 'hold' ? 'تأكيد الحجز المؤقت' : 'دفع وتأكيد الحجز')}
                        </Button>
                    </div>
                </div>
            </div>

        </div>
      </div>

      {showInvoice && completedBooking && <InvoiceModal isOpen={showInvoice} onClose={() => { setShowInvoice(false); onBack(); }} booking={completedBooking} />}
    </div>
  );
};
