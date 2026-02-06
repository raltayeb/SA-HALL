
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Booking, UserProfile, Hall } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AddBookingModal } from '../components/Booking/AddBookingModal';
import { EditBookingDetailsModal } from '../components/Booking/EditBookingDetailsModal';
import { PaymentHistoryModal } from '../components/Booking/PaymentHistoryModal';
import { 
  Search, Plus, Inbox, CheckCircle2, Clock, PieChart, CreditCard, ChevronLeft, ChevronRight, Calendar, Building2
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface BookingsProps {
  user: UserProfile;
}

export const Bookings: React.FC<BookingsProps> = ({ user }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Column Filters
  const [columnFilters, setColumnFilters] = useState({
    client: '',
    date: '',
    hall: 'all',
    paymentStatus: 'all',
    status: 'all'
  });

  const { toast } = useToast();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Halls first for filter
      if (user.role === 'vendor') {
          const { data: hData } = await supabase.from('halls').select('id, name').eq('vendor_id', user.id);
          setHalls(hData || []);
      }

      let query = supabase
        .from('bookings')
        .select(`
          *,
          halls:hall_id (name, city),
          client:user_id (full_name, email, phone_number),
          vendor:vendor_id (*),
          services:service_id (name)
        `);

      if (user.role === 'vendor') {
        query = query.eq('vendor_id', user.id);
      } else if (user.role === 'user') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setBookings(data as any[] || []);
    } catch (err: any) {
      toast({ title: 'خطأ', description: 'فشل في تحميل الحجوزات.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user.id, user.role, toast]);

  // Realtime Subscription
  useEffect(() => {
    fetchBookings();

    const channel = supabase.channel('bookings_realtime')
      .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'bookings',
          filter: user.role === 'vendor' ? `vendor_id=eq.${user.id}` : `user_id=eq.${user.id}`
      }, () => {
          fetchBookings(); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings, user.id, user.role]);

  // Handle Mark as Read
  const handleBookingClick = async (booking: Booking) => {
      setSelectedBooking(booking);
      if (user.role === 'vendor') {
          setIsEditModalOpen(true);
          // Mark as read if not already
          if (!(booking as any).is_read) {
              const { error } = await supabase.from('bookings').update({ is_read: true }).eq('id', booking.id);
              if (!error) {
                  setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, is_read: true } : b));
              }
          }
      } else {
          setIsInvoiceOpen(true);
      }
  };

  const filteredBookings = bookings.filter(b => {
    const matchClient = !columnFilters.client || 
        (b.client?.full_name || b.guest_name || 'عميل خارجي').toLowerCase().includes(columnFilters.client.toLowerCase()) || 
        (b.notes || '').toLowerCase().includes(columnFilters.client.toLowerCase()) || 
        b.id.toLowerCase().includes(columnFilters.client.toLowerCase()); // Search by ID too
    
    const matchDate = !columnFilters.date || b.booking_date.includes(columnFilters.date);
    // Hall Filter Logic
    const matchHall = columnFilters.hall === 'all' || b.hall_id === columnFilters.hall;
    
    const matchPayment = columnFilters.paymentStatus === 'all' || b.payment_status === columnFilters.paymentStatus;
    const matchStatus = columnFilters.status === 'all' || b.status === columnFilters.status;

    return matchClient && matchDate && matchHall && matchPayment && matchStatus;
  });

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const currentData = filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getPaymentStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'paid': return <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px]"><CheckCircle2 className="w-3 h-3" /> تم السداد</div>;
      case 'partial': return <div className="flex items-center gap-1 text-amber-600 font-bold text-[10px]"><PieChart className="w-3 h-3" /> مدفوع جزئياً</div>;
      default: return <div className="flex items-center gap-1 text-gray-400 font-bold text-[10px]"><Clock className="w-3 h-3" /> آجل / غير مدفوع</div>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary relative">
                <Inbox className="w-7 h-7" />
                {bookings.filter(b => !(b as any).is_read).length > 0 && (
                    <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
            </div>
            <div>
                <h2 className="text-3xl font-bold text-primary">سجل الحجوزات</h2>
                <p className="text-sm font-bold text-gray-400 mt-1">
                    لديك <span className="text-primary">{bookings.filter(b => !(b as any).is_read).length}</span> رسائل جديدة بانتظار القراءة.
                </p>
            </div>
         </div>
         <div className="flex gap-3 w-full md:w-auto">
            {user.role === 'vendor' && (
                <Button onClick={() => setIsAddModalOpen(true)} className="flex-1 md:flex-none gap-2 h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4" /> حجز يدوي
                </Button>
            )}
         </div>
      </div>

      {/* Inbox Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-5 bg-gray-50/50 border-b border-gray-100">
            <div className="md:col-span-2 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    placeholder="بحث برقم الحجز أو اسم العميل..." 
                    className="w-full h-10 bg-white border border-gray-200 rounded-xl pr-10 pl-4 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                    value={columnFilters.client}
                    onChange={e => setColumnFilters({...columnFilters, client: e.target.value})}
                />
            </div>
            {user.role === 'vendor' && (
                <div>
                    <select 
                        className="w-full h-10 bg-white border border-gray-200 rounded-xl px-4 text-xs font-bold" 
                        value={columnFilters.hall} 
                        onChange={e => setColumnFilters({...columnFilters, hall: e.target.value})}
                    >
                        <option value="all">كل القاعات</option>
                        {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                </div>
            )}
            <div><input type="date" className="w-full h-10 bg-white border border-gray-200 rounded-xl px-4 text-xs font-bold" value={columnFilters.date} onChange={e => setColumnFilters({...columnFilters, date: e.target.value})} /></div>
            <div>
                <select className="w-full h-10 bg-white border border-gray-200 rounded-xl px-4 text-xs font-bold" value={columnFilters.status} onChange={e => setColumnFilters({...columnFilters, status: e.target.value})}>
                    <option value="all">كل الحالات</option>
                    <option value="pending">جديد</option>
                    <option value="confirmed">مؤكد</option>
                    <option value="cancelled">ملغي</option>
                </select>
            </div>
            <div>
                <select className="w-full h-10 bg-white border border-gray-200 rounded-xl px-4 text-xs font-bold" value={columnFilters.paymentStatus} onChange={e => setColumnFilters({...columnFilters, paymentStatus: e.target.value})}>
                    <option value="all">كل الدفعات</option>
                    <option value="paid">مدفوع</option>
                    <option value="unpaid">آجل</option>
                </select>
            </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right border-collapse">
                <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                    <tr>
                        <th className="p-4 w-[25%]">تفاصيل العميل</th>
                        <th className="p-4 w-[20%]">الموعد والمكان</th>
                        <th className="p-4 w-[15%]">الحالة</th>
                        <th className="p-4 w-[20%]">المالية</th>
                        <th className="p-4 w-[15%] text-center">وقت الطلب</th>
                        <th className="p-4 w-[5%] text-center"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        Array.from({length: 5}).map((_, i) => <tr key={i} className="animate-pulse bg-white"><td colSpan={6} className="p-6"><div className="h-4 bg-gray-100 rounded w-full"></div></td></tr>)
                    ) : currentData.length === 0 ? (
                        <tr><td colSpan={6} className="p-16 text-center text-gray-400 font-bold">لا توجد حجوزات مطابقة</td></tr>
                    ) : currentData.map((b) => {
                        const isRead = (b as any).is_read;
                        return (
                            <tr 
                                key={b.id} 
                                onClick={() => handleBookingClick(b)}
                                className={`
                                    group transition-all cursor-pointer border-l-4
                                    ${!isRead && user.role === 'vendor'
                                        ? 'bg-white hover:bg-gray-50 border-l-primary font-bold shadow-sm' 
                                        : 'bg-gray-50/30 hover:bg-gray-100 text-gray-500 border-l-transparent'}
                                `}
                            >
                                <td className="p-4">
                                    <div className={`text-sm ${!isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                                        {b.client?.full_name || b.guest_name || 'عميل خارجي'}
                                    </div>
                                    <div className="flex gap-2 items-center mt-1">
                                        <span className="text-[9px] font-mono bg-gray-100 px-1 rounded text-gray-500">#{b.id.slice(0,8)}</span>
                                        <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{b.client?.phone_number || b.guest_phone}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${!isRead ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'}`}>
                                            <Calendar className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-800">{format(new Date(b.booking_date), 'yyyy-MM-dd')}</div>
                                            <div className="text-[10px] text-gray-400">{b.halls?.name || b.services?.name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <Badge variant={b.status === 'confirmed' ? 'success' : b.status === 'pending' ? 'warning' : 'destructive'} className="text-[10px] px-2 py-0.5 rounded-lg shadow-sm">
                                        {b.status === 'confirmed' ? 'مؤكد' : b.status === 'pending' ? 'طلب جديد' : 'ملغي'}
                                    </Badge>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="text-sm font-bold">
                                            {b.total_amount.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">ر.س</span>
                                        </div>
                                        {getPaymentStatusBadge(b.payment_status)}
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                                        {format(new Date(b.created_at || ''), 'dd/MM p', { locale: arSA })}
                                    </span>
                                </td>
                                <td className="p-4 text-center">
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); setIsPaymentModalOpen(true); }} className="p-2 rounded-full hover:bg-gray-200 text-gray-400 hover:text-green-600 transition-colors">
                                        <CreditCard className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
            <div className="text-[10px] font-bold text-gray-400">صفحة {currentPage} من {totalPages || 1}</div>
            <div className="flex gap-2">
                <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 w-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
                <Button variant="outline" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="h-8 w-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
            </div>
        </div>
      </div>

      {selectedBooking && (
        <>
            <InvoiceModal isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} booking={{...selectedBooking, profiles: user.role === 'vendor' ? (selectedBooking.client || selectedBooking.profiles) : (selectedBooking.vendor || selectedBooking.profiles)}} />
            {user.role === 'vendor' && (
                <>
                    <EditBookingDetailsModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} booking={selectedBooking} onSuccess={fetchBookings} />
                    <PaymentHistoryModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} booking={selectedBooking} onUpdate={fetchBookings} readOnly={true} />
                </>
            )}
        </>
      )}

      {user.role === 'vendor' && <AddBookingModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} vendorId={user.id} onSuccess={fetchBookings} />}
    </div>
  );
};
