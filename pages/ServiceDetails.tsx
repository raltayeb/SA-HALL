
import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Service, UserProfile, VAT_RATE } from '../types';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ArrowRight, Sparkles, User, MessageCircle, Share2, Heart, CheckCircle2, Calendar, Phone, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { DatePicker } from '../components/ui/DatePicker';
import { format, isBefore, startOfDay } from 'date-fns';
import { normalizeNumbers } from '../utils/helpers';

interface ServiceDetailsProps {
  item: Service & { vendor?: UserProfile };
  user: UserProfile | null;
  onBack: () => void;
}

export const ServiceDetails: React.FC<ServiceDetailsProps> = ({ item, user, onBack }) => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [guestData, setGuestData] = useState({ name: user?.full_name || '', phone: user?.phone_number || '', email: user?.email || '', notes: '' });

  const { toast } = useToast();

  const allImages = useMemo(() => {
    // Combine main image and portfolio images
    const main = item.image_url ? [item.image_url] : [];
    const portfolio = item.images || [];
    return [...main, ...portfolio];
  }, [item]);

  const vat = item.price * VAT_RATE;
  const total = item.price + vat;

  const handleBookingSubmission = async () => {
    if (!bookingDate) { toast({ title: 'تنبيه', description: 'يرجى اختيار تاريخ المناسبة', variant: 'destructive' }); return; }
    if (!guestData.name || !guestData.phone) { toast({ title: 'تنبيه', description: 'يرجى إكمال بيانات التواصل', variant: 'destructive' }); return; }

    setIsBooking(true);
    try {
      const normalizedPhone = normalizeNumbers(guestData.phone);
      
      const payload = {
        service_id: item.id,
        vendor_id: item.vendor_id,
        booking_date: format(bookingDate, 'yyyy-MM-dd'),
        total_amount: total,
        vat_amount: vat,
        paid_amount: 0,
        payment_status: 'unpaid',
        status: 'pending', // Starts as pending until vendor confirms
        guest_name: guestData.name,
        guest_phone: normalizedPhone,
        guest_email: guestData.email,
        user_id: user?.id || null,
        notes: guestData.notes,
        booking_type: 'booking'
      };

      const { error } = await supabase.from('bookings').insert([payload]);
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

      await supabase.from('notifications').insert([{
          user_id: item.vendor_id,
          title: 'طلب حجز خدمة جديد',
          message: `طلب حجز خدمة ${item.name} من ${guestData.name}`,
          type: 'booking_new',
          link: 'hall_bookings'
      }]);

      toast({ title: 'تم إرسال الطلب', description: 'سيتم التواصل معك من قبل مقدم الخدمة لتأكيد الحجز.', variant: 'success' });
      setIsWizardOpen(false);
      onBack(); // Or stay on page

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
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
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
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-6">
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
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-6">
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
                    <div className="sticky top-28 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-xl space-y-6">
                        <div className="text-center space-y-1 pb-4 border-b border-gray-50">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">تكلفة الخدمة</p>
                            <PriceTag amount={item.price} className="text-4xl font-black text-gray-900 justify-center" />
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-green-50 border border-green-100 text-green-700 text-sm font-bold">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm"><MessageCircle className="w-4 h-4" /></div>
                                <span>رد سريع (خلال ساعة)</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 text-sm font-bold">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm"><User className="w-4 h-4" /></div>
                                <span>فريق عمل احترافي</span>
                            </div>
                        </div>

                        <Button onClick={() => { setBookingStep(1); setIsWizardOpen(true); }} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl bg-gray-900 text-white hover:bg-black transition-all active:scale-95">
                            حجز الخدمة الآن
                        </Button>
                        
                        <p className="text-[10px] text-center text-gray-400 font-bold leading-relaxed">
                            هذا طلب حجز أولي. لن يتم خصم أي مبلغ حتى يتم تأكيد الحجز من قبل مقدم الخدمة.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Booking Wizard Modal */}
        <Modal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} title="حجز الخدمة" className="max-w-xl">
            <div className="space-y-6 text-right">
                
                {/* Step Indicator */}
                <div className="flex justify-center gap-2 mb-6">
                    {[1, 2].map(s => (
                        <div key={s} className={`h-1.5 w-12 rounded-full transition-all ${s <= bookingStep ? 'bg-primary' : 'bg-gray-200'}`}></div>
                    ))}
                </div>

                {bookingStep === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-black text-gray-900">متى تحتاج الخدمة؟</h3>
                            <p className="text-sm text-gray-500 font-bold">حدد التاريخ المناسب لتنفيذ الخدمة</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-[2rem] border border-gray-100 flex justify-center">
                            <DatePicker date={bookingDate} setDate={setBookingDate} disabledDates={(date) => isBefore(date, startOfDay(new Date()))} className="w-full" placeholder="اختر التاريخ" />
                        </div>
                        <Button onClick={() => {
                            if (!bookingDate) return toast({ title: 'تنبيه', description: 'اختر التاريخ للمتابعة', variant: 'destructive' });
                            setBookingStep(2);
                        }} className="w-full h-12 rounded-xl font-black">التالي: بيانات التواصل</Button>
                    </div>
                )}

                {bookingStep === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-black text-gray-900">بيانات التواصل</h3>
                            <p className="text-sm text-gray-500 font-bold">ليتمكن مقدم الخدمة من التواصل معك</p>
                        </div>
                        
                        <div className="space-y-3">
                            <Input label="الاسم الكامل" value={guestData.name} onChange={e => setGuestData({...guestData, name: e.target.value})} className="h-12 rounded-xl bg-gray-50" />
                            <Input label="رقم الجوال" value={guestData.phone} onChange={e => setGuestData({...guestData, phone: normalizeNumbers(e.target.value)})} className="h-12 rounded-xl bg-gray-50" placeholder="05xxxxxxxx" />
                            <div className="relative">
                                <Input label="البريد الإلكتروني" value={guestData.email} onChange={e => setGuestData({...guestData, email: e.target.value})} className="h-12 rounded-xl bg-gray-50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500">ملاحظات إضافية (اختياري)</label>
                                <textarea 
                                    className="w-full h-24 border border-gray-200 rounded-xl p-3 bg-gray-50 outline-none resize-none font-bold text-sm"
                                    placeholder="أي تفاصيل إضافية حول المناسبة..."
                                    value={guestData.notes}
                                    onChange={e => setGuestData({...guestData, notes: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-600">الإجمالي المتوقع</span>
                            <PriceTag amount={total} className="text-xl font-black text-primary" />
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setBookingStep(1)} className="h-12 px-6 rounded-xl font-bold">رجوع</Button>
                            <Button onClick={handleBookingSubmission} disabled={isBooking} className="flex-1 h-12 rounded-xl font-black shadow-lg shadow-primary/20">
                                {isBooking ? <Loader2 className="animate-spin" /> : 'تأكيد وإرسال الطلب'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    </div>
  );
};
