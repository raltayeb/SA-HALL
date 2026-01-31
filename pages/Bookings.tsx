
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Booking, UserProfile } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { Calendar, Receipt, CheckCircle, XCircle, Clock, Search, ShieldAlert, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
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
      } else if (user.role === 'user') {
        // Specifically ensuring we filter by the user's ID for "My Bookings"
        query = query.eq('user_id', user.id);
      } else if (user.role === 'super_admin') {
        // Superadmin should see all for platform monitoring if allowed,
        // but based on your previous logic we might want to restrict this.
        // Keeping it open for now or you can add restriction back.
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setBookings(data as any[]);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      toast({ title: 'خطأ', description: 'فشل في تحميل الحجوزات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id);

    if (!error) {
      toast({ title: 'تم التحديث', description: `تم تحديث حالة الحجز بنجاح.`, variant: 'success' });
      setBookingToCancel(null);
      fetchBookings();
    } else {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
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
    const matchesSearch = b.halls?.name.toLowerCase().includes(search.toLowerCase()) ||
                          b.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                          b.services?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || b.status === filter;
    return matchesSearch && matchesFilter;
  });

  if (user.role === 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <div className="bg-primary/10 p-6 rounded-full">
              <ShieldAlert className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-xl font-bold">وصول محدود لمدير النظام</h2>
          <p className="text-muted-foreground max-w-md">
              لحماية خصوصية البائعين، يرجى التوجه إلى لوحة الاشتراكات لمراقبة نشاط المنصة بشكل عام.
          </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-right">
        <div className="w-full">
          <h2 className="text-4xl font-black tracking-tighter flex items-center justify-end gap-3 text-primary">
             {user.role === 'vendor' ? 'سجل حجوزات القاعات' : 'حجوزاتي الشخصية'} <Calendar className="w-10 h-10" />
          </h2>
          <p className="text-sm text-muted-foreground mt-1">تتبع حالة المواعيد، الفواتير، والتواصل مع مقدمي الخدمة.</p>
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
            placeholder="بحث برقم الحجز أو الاسم..." 
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
            <p className="font-black">جاري تحميل سجلاتك...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-32 text-center flex flex-col items-center gap-4 border-2 border-dashed rounded-[3rem] bg-muted/5 opacity-50">
            <Clock className="w-12 h-12 text-muted-foreground" />
            <p className="font-black text-muted-foreground">لا توجد سجلات حجز مطابقة حالياً.</p>
          </div>
        ) : (
          filteredBookings.map((b) => (
            <div key={b.id} className="bg-card border rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row-reverse items-center gap-8 group relative overflow-hidden">
               <div className="w-24 h-24 rounded-3xl bg-muted overflow-hidden shrink-0 shadow-inner">
                  {b.halls?.image_url ? <img src={b.halls.image_url} className="w-full h-full object-cover" /> : <Calendar className="w-10 h-10 m-7 opacity-20" />}
               </div>
               
               <div className="flex-1 text-center md:text-right space-y-2">
                  <div className="flex flex-col md:flex-row-reverse items-center gap-3 mb-1">
                    <h3 className="text-2xl font-black">{b.halls?.name}</h3>
                    {getStatusBadge(b.status)}
                  </div>
                  <div className="flex flex-wrap justify-center md:justify-end items-center gap-4 text-xs font-bold text-muted-foreground">
                    <span className="flex flex-row-reverse items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary" /> {b.services?.name || 'حجز أساسي'}</span>
                    <span className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full"></span>
                    <span className="flex flex-row-reverse items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> {new Date(b.booking_date).toLocaleDateString('ar-SA')}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-40">رقم المرجع: {b.id.slice(0, 8).toUpperCase()}</p>
               </div>

               <div className="flex flex-col items-center md:items-start gap-4 px-8 md:border-l">
                  <PriceTag amount={b.total_amount} className="text-3xl text-primary" iconSize={28} />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl h-12 gap-2 font-black px-6 border-2" onClick={() => { setSelectedBooking(b); setIsInvoiceOpen(true); }}>
                       الفاتورة <Receipt className="w-4 h-4" />
                    </Button>
                    
                    {b.status === 'pending' && (
                      <>
                        {user.role === 'vendor' && (
                          <Button size="sm" className="rounded-xl h-12 gap-2 font-black px-6 bg-green-600 hover:bg-green-700" onClick={() => updateStatus(b.id, 'confirmed')}>
                             تأكيد <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" className="rounded-xl h-12 gap-2 font-black px-6" onClick={() => setBookingToCancel(b)}>
                           إلغاء <XCircle className="w-4 h-4" />
                        </Button>
                      </>
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
            <h4 className="text-2xl font-black">هل أنت متأكد من الإلغاء؟</h4>
            <p className="text-sm text-muted-foreground leading-relaxed px-4">
              سيتم إلغاء حجز قاعة <span className="font-bold text-foreground">"{bookingToCancel?.halls?.name}"</span>. 
              هذا الإجراء قد يؤثر على جدول مواعيدك.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-6 border-t px-4">
            <Button variant="outline" className="h-14 rounded-2xl font-black" onClick={() => setBookingToCancel(null)}>تراجع</Button>
            <Button variant="destructive" className="h-14 rounded-2xl font-black shadow-xl shadow-destructive/20" onClick={() => bookingToCancel && updateStatus(bookingToCancel.id, 'cancelled')}>
              تأكيد الإلغاء
            </Button>
          </div>
        </div>
      </Modal>

      <InvoiceModal isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} booking={selectedBooking} />
    </div>
  );
};
