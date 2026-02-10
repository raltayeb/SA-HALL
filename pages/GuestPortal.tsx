
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, StoreOrder } from '../types';
import { PriceTag } from '../components/ui/PriceTag';
import { Button } from '../components/ui/Button';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  ShoppingBag, CalendarCheck, Clock, 
  MapPin, CheckCircle2, Package, Truck, 
  Receipt, Building2, Sparkles, Palmtree, LogOut, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useToast } from '../context/ToastContext';
import { normalizeNumbers } from '../utils/helpers';

interface GuestPortalProps {
  user: UserProfile;
  onLogout: () => void;
}

export const GuestPortal: React.FC<GuestPortalProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'orders'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  const { toast } = useToast();

  // Extract First Name
  const firstName = user.full_name?.split(' ')[0] || 'ضيف';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const phone = normalizeNumbers(user.phone_number || '');
        const email = user.email;
        
        // 1. Fetch Bookings (Enhanced Logic)
        let bookingQuery = supabase.from('bookings')
            .select('*, halls(name, city, image_url), chalets(name, city, image_url), services(name, image_url), vendor:vendor_id(business_name)')
            .order('booking_date', { ascending: false });

        // Logic: Match user_id OR phone OR email
        if (user.role === 'user' && user.email !== 'guest') {
             // For registered/verified guests, check all possible identifiers
             const conditions = [`user_id.eq.${user.id}`];
             if (phone) conditions.push(`guest_phone.eq.${phone}`);
             if (email) conditions.push(`guest_email.eq.${email}`);
             bookingQuery = bookingQuery.or(conditions.join(','));
        } else if (phone) {
             bookingQuery = bookingQuery.eq('guest_phone', phone);
        } else {
             // Fallback
             bookingQuery = bookingQuery.eq('user_id', user.id);
        }

        const { data: bookingsData, error: bError } = await bookingQuery;
        if(bError) throw bError;
        setBookings(bookingsData as any[] || []);

        // 2. Fetch Store Orders
        let orderQuery = supabase.from('store_orders')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (user.role === 'user' && user.email !== 'guest') {
            orderQuery = orderQuery.eq('user_id', user.id);
        } else if (user.phone_number) {
            orderQuery = orderQuery.eq('user_id', user.id);
        }
        
        const { data: ordersData } = await orderQuery;
        setOrders(ordersData as any[] || []);

      } catch (err: any) {
        console.error(err);
        toast({ title: 'خطأ', description: 'لم نتمكن من تحميل بياناتك.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getStatusStep = (status: string) => {
      if (status === 'pending') return 1;
      if (status === 'processing') return 2;
      if (status === 'shipped') return 3;
      if (status === 'delivered') return 4;
      return 0;
  };

  const getAssetIcon = (b: Booking) => {
      if (b.chalet_id) return <Palmtree className="w-5 h-5 text-blue-500" />;
      if (b.service_id) return <Sparkles className="w-5 h-5 text-orange-500" />;
      return <Building2 className="w-5 h-5 text-purple-500" />;
  };

  const getImage = (b: Booking) => {
      return b.halls?.image_url || b.chalets?.image_url || b.services?.image_url || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-tajawal" dir="rtl">
      
      {/* 1. Header Section (Clean & Centered) */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black">
                      {firstName[0]}
                  </div>
                  <div>
                      <h1 className="text-xl font-black text-gray-900 leading-none">مرحباً ألف {firstName} 👋</h1>
                      <p className="text-[10px] font-bold text-gray-400 mt-1">تتبع طلباتك وحجوزاتك</p>
                  </div>
              </div>
              
              <Button onClick={onLogout} variant="outline" className="rounded-xl h-10 gap-2 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">تسجيل الخروج</span>
              </Button>
          </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          
          {/* 2. Stats Summary */}
          <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => setActiveTab('bookings')}
                className={`cursor-pointer p-6 rounded-[2rem] border transition-all duration-300 ${activeTab === 'bookings' ? 'bg-white border-primary shadow-lg shadow-primary/5 ring-1 ring-primary' : 'bg-white border-gray-100 hover:border-primary/30'}`}
              >
                  <div className="flex justify-between items-start mb-2">
                      <div className={`p-3 rounded-2xl ${activeTab === 'bookings' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400'}`}>
                          <CalendarCheck className="w-6 h-6" />
                      </div>
                      <span className="text-2xl font-black text-gray-900">{bookings.length}</span>
                  </div>
                  <p className={`text-sm font-bold ${activeTab === 'bookings' ? 'text-primary' : 'text-gray-500'}`}>الحجوزات الحالية</p>
              </div>

              <div 
                onClick={() => setActiveTab('orders')}
                className={`cursor-pointer p-6 rounded-[2rem] border transition-all duration-300 ${activeTab === 'orders' ? 'bg-white border-orange-500 shadow-lg shadow-orange-500/5 ring-1 ring-orange-500' : 'bg-white border-gray-100 hover:border-orange-200'}`}
              >
                  <div className="flex justify-between items-start mb-2">
                      <div className={`p-3 rounded-2xl ${activeTab === 'orders' ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-400'}`}>
                          <ShoppingBag className="w-6 h-6" />
                      </div>
                      <span className="text-2xl font-black text-gray-900">{orders.length}</span>
                  </div>
                  <p className={`text-sm font-bold ${activeTab === 'orders' ? 'text-orange-600' : 'text-gray-500'}`}>طلبات المتجر</p>
              </div>
          </div>

          {/* 3. Content List */}
          <div className="min-h-[400px]">
              {activeTab === 'bookings' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                      {bookings.length === 0 ? (
                          <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                              <CalendarCheck className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                              <p className="text-gray-400 font-bold">لا توجد حجوزات مسجلة.</p>
                          </div>
                      ) : (
                          <div className="grid gap-6">
                              {bookings.map(booking => (
                                  <div key={booking.id} className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6">
                                      {/* Image */}
                                      <div className="w-full md:w-48 h-48 md:h-auto rounded-[2rem] overflow-hidden bg-gray-50 relative shrink-0">
                                          <img src={getImage(booking)} className="w-full h-full object-cover" />
                                          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur p-2 rounded-xl text-xs font-bold shadow-sm">
                                              {getAssetIcon(booking)}
                                          </div>
                                      </div>

                                      {/* Info */}
                                      <div className="flex-1 flex flex-col justify-between py-2">
                                          <div className="space-y-3">
                                              <div className="flex justify-between items-start">
                                                  <h3 className="text-xl font-black text-gray-900 line-clamp-1">{booking.halls?.name || booking.chalets?.name || booking.services?.name}</h3>
                                                  {booking.status === 'confirmed' && <span className="bg-green-50 text-green-600 px-3 py-1 rounded-lg text-[10px] font-black border border-green-100">مؤكد</span>}
                                                  {booking.status === 'pending' && <span className="bg-yellow-50 text-yellow-600 px-3 py-1 rounded-lg text-[10px] font-black border border-yellow-100">قيد الانتظار</span>}
                                                  {booking.status === 'cancelled' && <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black border border-red-100">ملغي</span>}
                                              </div>
                                              
                                              <div className="flex flex-col gap-2 text-xs font-bold text-gray-500">
                                                  <span className="flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-primary" /> {format(new Date(booking.booking_date), 'dd MMMM yyyy', { locale: arSA })}</span>
                                                  <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {booking.halls?.city || booking.chalets?.city || 'الرياض'}</span>
                                              </div>
                                          </div>

                                          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
                                              <div>
                                                  <p className="text-[10px] font-bold text-gray-400">الإجمالي</p>
                                                  <PriceTag amount={booking.total_amount} className="text-xl font-black text-primary" />
                                              </div>
                                              <div className="flex gap-2">
                                                  <Button onClick={() => { setSelectedBooking(booking); setShowInvoice(true); }} variant="outline" className="rounded-xl h-10 text-xs font-bold border-gray-200 gap-2">
                                                      <Receipt className="w-3.5 h-3.5" /> الفاتورة
                                                  </Button>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              )}

              {activeTab === 'orders' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                      {orders.length === 0 ? (
                          <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                              <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                              <p className="text-gray-400 font-bold">لا توجد طلبات متجر سابقة.</p>
                          </div>
                      ) : (
                          <div className="grid gap-6">
                              {orders.map(order => {
                                  const step = getStatusStep(order.delivery_status || 'pending');
                                  return (
                                      <div key={order.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 hover:shadow-lg transition-all">
                                          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                                              <div>
                                                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                                      <Package className="w-5 h-5 text-primary" /> طلب #{order.id.slice(0, 8)}
                                                  </h3>
                                                  <p className="text-xs font-bold text-gray-400 mt-1">
                                                      تم الطلب في {format(new Date(order.created_at), 'dd/MM/yyyy p', { locale: arSA })}
                                                  </p>
                                              </div>
                                              <div className="text-left">
                                                  <PriceTag amount={order.total_amount} className="text-xl font-black text-gray-900" />
                                                  <p className="text-[10px] font-bold text-gray-400">{order.items.length} منتجات</p>
                                              </div>
                                          </div>

                                          {/* Tracking Stepper */}
                                          <div className="relative mb-8 px-4">
                                              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 rounded-full z-0"></div>
                                              <div className="absolute top-1/2 left-0 h-1 bg-green-500 -translate-y-1/2 rounded-full z-0 transition-all duration-1000" style={{ width: `${(step - 1) * 33.33}%` }}></div>
                                              
                                              <div className="relative z-10 flex justify-between w-full">
                                                  {[
                                                      { label: 'قيد المعالجة', icon: Clock, active: step >= 1 },
                                                      { label: 'تم التجهيز', icon: Package, active: step >= 2 },
                                                      { label: 'جاري التوصيل', icon: Truck, active: step >= 3 },
                                                      { label: 'تم التسليم', icon: CheckCircle2, active: step >= 4 },
                                                  ].map((s, idx) => (
                                                      <div key={idx} className="flex flex-col items-center gap-2">
                                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${s.active ? 'bg-green-500 border-green-100 text-white scale-110' : 'bg-white border-gray-100 text-gray-300'}`}>
                                                              <s.icon className="w-4 h-4" />
                                                          </div>
                                                          <span className={`text-[10px] font-bold ${s.active ? 'text-gray-900' : 'text-gray-300'}`}>{s.label}</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>

                                          {/* Items List */}
                                          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                              <div className="space-y-2">
                                                  {order.items.slice(0, 2).map((item, idx) => (
                                                      <div key={idx} className="flex justify-between items-center text-sm font-bold text-gray-700">
                                                          <span className="flex items-center gap-2">
                                                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span> {item.name}
                                                          </span>
                                                          <span className="text-gray-400">x{item.qty}</span>
                                                      </div>
                                                  ))}
                                                  {order.items.length > 2 && <p className="text-[10px] font-bold text-primary pt-2">+ {order.items.length - 2} منتجات أخرى</p>}
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>

      {showInvoice && selectedBooking && (
          <InvoiceModal 
            isOpen={showInvoice} 
            onClose={() => setShowInvoice(false)} 
            booking={selectedBooking} 
          />
      )}
    </div>
  );
};
