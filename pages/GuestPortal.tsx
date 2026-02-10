
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, StoreOrder } from '../types';
import { PriceTag } from '../components/ui/PriceTag';
import { Button } from '../components/ui/Button';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  LayoutDashboard, ShoppingBag, CalendarCheck, Clock, 
  MapPin, CheckCircle2, Package, Truck, ChevronLeft, 
  Receipt, Building2, Sparkles, Palmtree, User
} from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useToast } from '../context/ToastContext';
import { normalizeNumbers } from '../utils/helpers';

interface GuestPortalProps {
  user: UserProfile;
}

export const GuestPortal: React.FC<GuestPortalProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'orders'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const phone = normalizeNumbers(user.phone_number || '');
        
        // 1. Fetch Bookings (Linked by ID or Phone for Guest Login compatibility)
        let bookingQuery = supabase.from('bookings')
            .select('*, halls(name, city, image_url), chalets(name, city, image_url), services(name, image_url), vendor:vendor_id(business_name)')
            .order('booking_date', { ascending: false });

        if (user.role === 'user' && user.email !== 'guest') {
             bookingQuery = bookingQuery.eq('user_id', user.id);
        } else if (phone) {
             bookingQuery = bookingQuery.eq('guest_phone', phone);
        } else {
             // Fallback for brand new empty profile
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
            // Store orders for guests store phone in guest_info jsonb
            // This is a bit complex for JSONB filter, simplified to ID for now or skip if guest
            // Ideally we filter by guest_info->>'phone' but Supabase JS filter is tricky here without RPC
            // For now, assume Store Orders require login or we use ID
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. Welcome Header */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="relative z-10 space-y-2 text-center md:text-right">
            <h1 className="text-3xl font-black text-gray-900">مرحباً، {user.full_name} 👋</h1>
            <p className="text-gray-500 font-bold text-sm">أهلاً بك في مساحتك الخاصة. تابع حجوزاتك وطلباتك بكل سهولة.</p>
         </div>
         <div className="relative z-10 flex gap-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center min-w-[120px]">
                <p className="text-2xl font-black text-primary">{bookings.length}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">حجوزات</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center min-w-[120px]">
                <p className="text-2xl font-black text-orange-500">{orders.length}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">طلبات متجر</p>
            </div>
         </div>
         {/* Decoration */}
         <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -ml-20 -mt-20"></div>
      </div>

      {/* 2. Tabs */}
      <div className="flex justify-center md:justify-start">
          <div className="bg-white p-1.5 rounded-2xl border border-gray-100 inline-flex gap-2">
              <button 
                onClick={() => setActiveTab('bookings')} 
                className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'bookings' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                  <CalendarCheck className="w-4 h-4" /> سجل الحجوزات
              </button>
              <button 
                onClick={() => setActiveTab('orders')} 
                className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'orders' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                  <ShoppingBag className="w-4 h-4" /> طلبات المتجر
              </button>
          </div>
      </div>

      {/* 3. Content Area */}
      <div className="min-h-[400px]">
          {activeTab === 'bookings' && (
              <div className="space-y-6">
                  {bookings.length === 0 ? (
                      <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                          <CalendarCheck className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                          <p className="text-gray-400 font-bold">لا توجد حجوزات مسجلة حتى الآن.</p>
                          <Button className="mt-4" onClick={() => window.location.href='/#browse'}>تصفح القاعات</Button>
                      </div>
                  ) : (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
                          {bookings.map(booking => (
                              <div key={booking.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 hover:border-primary/20 transition-all group relative overflow-hidden flex flex-col sm:flex-row gap-6">
                                  {/* Image */}
                                  <div className="w-full sm:w-40 h-40 rounded-[2rem] overflow-hidden bg-gray-50 relative shrink-0">
                                      <img src={getImage(booking)} className="w-full h-full object-cover" />
                                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur p-2 rounded-xl text-xs font-bold shadow-sm">
                                          {getAssetIcon(booking)}
                                      </div>
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 flex flex-col justify-between">
                                      <div className="space-y-2">
                                          <div className="flex justify-between items-start">
                                              <h3 className="text-xl font-black text-gray-900 line-clamp-1">{booking.halls?.name || booking.chalets?.name || booking.services?.name}</h3>
                                              {booking.status === 'confirmed' && <span className="bg-green-50 text-green-600 px-3 py-1 rounded-lg text-[10px] font-black border border-green-100">مؤكد</span>}
                                              {booking.status === 'pending' && <span className="bg-yellow-50 text-yellow-600 px-3 py-1 rounded-lg text-[10px] font-black border border-yellow-100">قيد الانتظار</span>}
                                              {booking.status === 'cancelled' && <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black border border-red-100">ملغي</span>}
                                          </div>
                                          
                                          <div className="flex flex-wrap gap-3 text-xs font-bold text-gray-500">
                                              <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg"><CalendarCheck className="w-3.5 h-3.5" /> {format(new Date(booking.booking_date), 'dd MMMM yyyy', { locale: arSA })}</span>
                                              <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg"><MapPin className="w-3.5 h-3.5" /> {booking.halls?.city || booking.chalets?.city || 'الرياض'}</span>
                                          </div>
                                          
                                          <div className="flex items-center gap-2 mt-2">
                                               <span className="text-[10px] font-bold text-gray-400">الإجمالي:</span>
                                               <PriceTag amount={booking.total_amount} className="text-lg font-black text-primary" />
                                          </div>
                                      </div>

                                      <div className="pt-4 mt-2 border-t border-gray-50 flex gap-3">
                                          <Button onClick={() => { setSelectedBooking(booking); setShowInvoice(true); }} variant="outline" className="flex-1 rounded-xl h-10 text-xs font-bold border-gray-200 gap-2">
                                              <Receipt className="w-3.5 h-3.5" /> الفاتورة
                                          </Button>
                                          {booking.payment_status !== 'paid' && booking.status !== 'cancelled' && (
                                              <Button className="flex-1 rounded-xl h-10 text-xs font-black bg-gray-900 text-white shadow-none">
                                                  إكمال الدفع
                                              </Button>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'orders' && (
              <div className="space-y-6">
                  {orders.length === 0 ? (
                      <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                          <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                          <p className="text-gray-400 font-bold">لا توجد طلبات شراء سابقة.</p>
                          <Button className="mt-4" onClick={() => window.location.href='/#store'}>زيارة المتجر</Button>
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
