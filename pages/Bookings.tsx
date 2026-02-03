
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Booking, UserProfile } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Calendar, Receipt, CheckCircle, XCircle, Clock, Search, 
  AlertCircle, Sparkles, Loader2, User as UserIcon, 
  Phone, Building2
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
  
  const { toast } = useToast();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          halls:hall_id (*),
          client:user_id (*),
          vendor:vendor_id (*),
          services:service_id (*)
        `);

      if (user.role === 'vendor') {
        query = query.eq('vendor_id', user.id);
      } else if (user.role === 'user') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setBookings(data as Booking[] || []);
    } catch (err: any) {
      toast({ title: 'خطأ', description: 'فشل في تحميل الحجوزات.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user.id, user.role, toast]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const updateStatus = async (booking: Booking, status: 'confirmed' | 'cancelled') => {
    try {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', booking.id);
      if (error) throw error;

      await supabase.from('notifications').insert([{
        user_id: booking.user_id,
        title: status === 'confirmed' ? 'تم تأكيد حجزك ✅' : 'تحديث على حجزك',
        message: `تم ${status === 'confirmed' ? 'تأكيد' : 'إلغاء'} حجزك لقاعة ${booking.halls?.name}.`,
        type: status === 'confirmed' ? 'booking_confirmed' : 'booking_cancelled',
        link: 'my_bookings',
        is_read: false
      }]);

      toast({ title: 'تم التحديث', variant: 'success' });
      fetchBookings();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    }
  };

  const filteredBookings = bookings.filter(b => {
    const searchLower = search.toLowerCase();
    const matchesSearch = (b.halls?.name || '').toLowerCase().includes(searchLower) || 
                          (b.client?.full_name || '').toLowerCase().includes(searchLower);
    const matchesFilter = filter === 'all' || b.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-4 text-right">
        <h2 className="text-2xl font-black tracking-tight text-primary">سجل الحجوزات</h2>
        <div className="flex items-center gap-3 w-full md:w-auto flex-row-reverse">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input className="w-full h-10 bg-card border rounded-xl pr-10 pl-4 text-xs font-bold" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-10 border rounded-xl bg-card px-4 text-xs font-bold" value={filter} onChange={e => setFilter(e.target.value as any)}>
            <option value="all">الكل</option>
            <option value="pending">قيد الانتظار</option>
            <option value="confirmed">المؤكدة</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="py-20 text-center animate-pulse border-2 border-dashed rounded-[1.125rem]">جاري التحميل...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed rounded-[1.125rem] text-muted-foreground font-bold italic">لا توجد سجلات مطابقة.</div>
        ) : (
          filteredBookings.map((b) => (
            <div key={b.id} className="bg-card border rounded-[1.125rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row-reverse items-center gap-6 text-right">
               <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden shrink-0 border">
                  {b.halls?.image_url ? <img src={b.halls.image_url} className="w-full h-full object-cover" /> : <Calendar className="w-8 h-8 m-4 opacity-20" />}
               </div>
               <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <h3 className="font-black text-lg">{b.halls?.name}</h3>
                    <Badge variant={b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'destructive' : 'warning'}>{b.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-bold text-muted-foreground flex-row-reverse">
                    <span className="flex items-center gap-1 flex-row-reverse"><UserIcon className="w-3 h-3" /> {b.client?.full_name}</span>
                    <span className="flex items-center gap-1 flex-row-reverse"><Clock className="w-3 h-3" /> {b.booking_date}</span>
                  </div>
               </div>
               <div className="flex flex-col md:flex-row gap-3 items-center">
                  <PriceTag amount={b.total_amount} className="text-xl" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg h-9 font-bold" onClick={() => { setSelectedBooking(b); setIsInvoiceOpen(true); }}>الفاتورة</Button>
                    {b.status === 'pending' && user.role === 'vendor' && (
                      <Button size="sm" className="rounded-lg h-9 font-bold" onClick={() => updateStatus(b, 'confirmed')}>تأكيد</Button>
                    )}
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      {selectedBooking && (
        <InvoiceModal 
          isOpen={isInvoiceOpen} 
          onClose={() => setIsInvoiceOpen(false)} 
          booking={{
            ...selectedBooking,
            profiles: user.role === 'vendor' ? (selectedBooking.client || selectedBooking.profiles) : (selectedBooking.vendor || selectedBooking.profiles)
          }} 
        />
      )}
    </div>
  );
};
