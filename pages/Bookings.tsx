
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Booking, UserProfile } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Calendar, Receipt, CheckCircle, XCircle, Clock, Search, 
  ShieldAlert, AlertCircle, Sparkles, Loader2, User as UserIcon, 
  Phone, MessageSquare, StickyNote, Mail
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { Modal } from '../components/ui/Modal';

interface BookingsProps {
  user: UserProfile;
}

type BookingFilter = 'all' | 'pending' | 'confirmed' | 'cancelled';

export const Bookings: React.FC<BookingsProps> = ({ user }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  
  const { toast } = useToast();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bookings')
        .select('*, halls(*), profiles:user_id(*), services(*)');

      if (user.role === 'vendor') {
        query = query.eq('vendor_id', user.id);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data as any[] || []);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      toast({ title: 'خطأ', description: 'فشل في تحميل الحجوزات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user.id, user.role, toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const updateStatus = async (booking: Booking, status: 'confirmed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', booking.id);

      if (error) throw error;

      // Real-time notification to the CLIENT
      const statusAr = status === 'confirmed' ? 'تأكيد' : 'إلغاء';
      await supabase.from('notifications').insert([{
        user_id: booking.user_id,
        title: `تحديث في حالة الحجز`,
        message: `تم ${statusAr} حجزك لقاعة ${booking.halls?.name} من قبل الإدارة.`,
        type: status === 'confirmed' ? 'booking_confirmed' : 'booking_cancelled',
        action_url: 'my_bookings'
      }]);

      toast({ title: 'تم التحديث', description: `تم ${statusAr} الحجز وإشعار العميل بنجاح.`, variant: 'success' });
      setBookingToCancel(null);
      fetchBookings(); // Refresh list to show updated status
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge variant="success">مؤكد</Badge>;
      case 'cancelled': return <Badge variant="destructive">ملغي</Badge>;
      default: return <Badge variant="warning">قيد الانتظار</Badge>;
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.halls?.name.toLowerCase().includes(search.toLowerCase()) ||
      b.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.notes?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || b.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-right">
        <div className="w-full">
          <h2 className="text-4xl font-black tracking-tighter flex items-center justify-end gap-3 text-primary">
             {user.role === 'vendor' ? 'إدارة طلبات الحجز' : 'سجل حجوزاتي'} <Calendar className="w-10 h-10" />
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {user.role === 'vendor' ? 'راجع تفاصيل العملاء وأكد الحجوزات الواردة.' : 'تتبع حالة حجوزاتك وفواتيرك الإلكترونية.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row-reverse gap-4 justify-between items-start md:items-center">
        <div className="flex bg-card p-1.5 rounded-[1.5rem] border border-border/50 shadow-sm overflow-x-auto no-scrollbar flex-row-reverse">
          {['all', 'pending', 'confirmed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all whitespace-nowrap ${filter === tab ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {tab === 'all' ? 'الكل' : tab === 'pending' ? 'المعلقة' : tab === 'confirmed' ? 'المؤكدة' : 'الملغاة'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-2xl border w-full md:w-80 shadow-sm group focus-within:ring-2 focus-within:ring-primary/20 transition-all flex-row-reverse">
          <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
          <input 
            type="text" 
            placeholder="بحث بالعميل أو القاعة..." 
            className="bg-transparent border-none focus:outline-none text-sm w-full font-bold text-right"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="py-32 text-center flex flex-col items-center gap-4 border-2 border-dashed rounded-[3rem] bg-muted/5 opacity-50">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="font-black">جاري جلب السجلات...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-32 text-center flex flex-col items-center gap-4 border-2 border-dashed rounded-[3rem] bg-muted/5 opacity-50">
            <Clock className="w-12 h-12 text-muted-foreground" />
            <p className="font-black text-muted-foreground">لا توجد سجلات مطابقة حالياً.</p>
          </div>
        ) : (
          filteredBookings.map((b) => (
            <div key={b.id} className="bg-card border rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row-reverse items-start gap-8 group relative overflow-hidden">
               <div className="w-24 h-24 rounded-3xl bg-muted overflow-hidden shrink-0 shadow-inner border self-center md:self-start">
                  {b.halls?.image_url ? <img src={b.halls.image_url} className="w-full h-full object-cover" /> : <Calendar className="w-10 h-10 m-7 opacity-20" />}
               </div>
               
               <div className="flex-1 text-center md:text-right space-y-4 w-full">
                  <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-3 mb-1">
                    <div className="flex flex-col items-center md:items-end">
                      <h3 className="text-2xl font-black">{b.halls?.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">ID: {b.id.slice(0, 8).toUpperCase()}</span>
                        {getStatusBadge(b.status)}
                      </div>
                    </div>
                    {user.role === 'vendor' && (
                      <div className="flex flex-col items-center md:items-end bg-primary/5 p-4 rounded-2xl border border-primary/10 w-full md:w-auto">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-1 flex-row-reverse">
                            <UserIcon className="w-3 h-3" /> بيانات العميل
                          </p>
                          <p className="text-sm font-black">{b.profiles?.full_name || 'غير محدد'}</p>
                          <p className="text-xs font-bold text-muted-foreground mt-1 flex items-center gap-1.5 flex-row-reverse">
                            <Phone className="w-3 h-3" /> {b.profiles?.phone_number || 'لا يوجد هاتف'}
                          </p>
                      </div>
                    )}
                  </div>

                  {b.notes && (
                    <div className="bg-muted/30 p-4 rounded-2xl border border-dashed text-right flex items-start gap-3 flex-row-reverse">
                       <StickyNote className="w-4 h-4 text-primary shrink-0 mt-1" />
                       <div className="flex-1">
                         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">تفاصيل إضافية</p>
                         <p className="text-xs font-bold leading-relaxed">{b.notes}</p>
                       </div>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-center md:justify-end items-center gap-4 text-xs font-bold text-muted-foreground">
                    <span className="flex flex-row-reverse items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary" /> {b.services?.name || 'خدمات أساسية'}</span>
                    <span className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full"></span>
                    <span className="flex flex-row-reverse items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> {new Date(b.booking_date).toLocaleDateString('ar-SA')}</span>
                  </div>
               </div>

               <div className="flex flex-col items-center md:items-start gap-4 px-8 md:border-l w-full md:w-auto self-stretch">
                  <PriceTag amount={b.total_amount} className="text-3xl text-primary" iconSize={28} />
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Button variant="outline" size="sm" className="rounded-xl h-12 gap-2 font-black px-6 border-2 w-full" onClick={() => { setSelectedBooking(b); setIsInvoiceOpen(true); }}>
                       الفاتورة <Receipt className="w-4 h-4" />
                    </Button>
                    
                    {b.status === 'pending' && user.role === 'vendor' && (
                      <div className="flex gap-2 w-full">
                        <Button size="sm" className="flex-1 rounded-xl h-12 gap-2 font-black bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(b, 'confirmed')}>
                           تأكيد <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" className="flex-1 rounded-xl h-12 gap-2 font-black" onClick={() => setBookingToCancel(b)}>
                           إلغاء <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={!!bookingToCancel} onClose={() => setBookingToCancel(null)} title="تأكيد إلغاء الحجز">
        <div className="space-y-6 text-center py-4">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h4 className="text-2xl font-black">تأكيد الإلغاء؟</h4>
            <p className="text-sm text-muted-foreground leading-relaxed px-4 text-right">
              سيتم إلغاء حجز قاعة <span className="font-bold text-foreground">"{bookingToCancel?.halls?.name}"</span> 
              وإرسال تنبيه فوري للعميل بهذا الإجراء.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-6 border-t px-4">
            <Button variant="outline" className="h-14 rounded-2xl font-black" onClick={() => setBookingToCancel(null)}>تراجع</Button>
            <Button variant="destructive" className="h-14 rounded-2xl font-black shadow-xl shadow-destructive/20" onClick={() => bookingToCancel && updateStatus(bookingToCancel, 'cancelled')}>
              تأكيد الإلغاء
            </Button>
          </div>
        </div>
      </Modal>

      <InvoiceModal isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} booking={selectedBooking} />
    </div>
  );
};
