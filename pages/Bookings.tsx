
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Booking, UserProfile } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AddBookingModal } from '../components/Booking/AddBookingModal';
import { EditBookingDetailsModal } from '../components/Booking/EditBookingDetailsModal';
import { 
  Search, Plus, Inbox, CheckCircle2, Clock, CalendarCheck, 
  Building2, Palmtree, Sparkles, User, Filter, AlertCircle, XCircle, Check
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { normalizeNumbers } from '../utils/helpers';
import { PriceTag } from '../components/ui/PriceTag';

interface BookingsProps {
  user: UserProfile;
}

export const Bookings: React.FC<BookingsProps> = ({ user }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Advanced Filters
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const { toast } = useToast();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          halls:hall_id (name, city),
          chalets:chalet_id (name, city),
          client:user_id (full_name, email, phone_number),
          services:service_id (name)
        `);

      if (user.role === 'vendor') {
        query = query.eq('vendor_id', user.id);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('booking_date', { ascending: false });
      if (error) throw error;
      setBookings(data as any[] || []);
    } catch (err: any) {
      toast({ title: 'خطأ', description: 'فشل في تحميل الحجوزات.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user.id, toast]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleBookingClick = (booking: Booking) => {
      setSelectedBooking(booking);
      setIsEditModalOpen(true);
  };

  const filteredBookings = bookings.filter(b => {
    const searchTerm = normalizeNumbers(filters.search.toLowerCase());
    
    // 1. Search Text
    const matchSearch = !searchTerm || 
        (b.client?.full_name || b.guest_name || '').toLowerCase().includes(searchTerm) || 
        (b.id || '').includes(searchTerm) ||
        (b.halls?.name || b.chalets?.name || '').toLowerCase().includes(searchTerm);
    
    // 2. Status
    const matchStatus = filters.status === 'all' || b.status === filters.status;

    // 3. Date Range
    let matchDate = true;
    if (filters.dateFrom && filters.dateTo) {
        const bookingDate = parseISO(b.booking_date);
        const start = startOfDay(parseISO(filters.dateFrom));
        const end = endOfDay(parseISO(filters.dateTo));
        matchDate = isWithinInterval(bookingDate, { start, end });
    }

    return matchSearch && matchStatus && matchDate;
  });

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'confirmed': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200"><CheckCircle2 className="w-3 h-3" /> مؤكد</span>;
          case 'pending': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200"><Clock className="w-3 h-3" /> انتظار</span>;
          case 'cancelled': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3 h-3" /> ملغي</span>;
          default: return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-50 text-gray-700 border border-gray-200">{status}</span>;
      }
  };

  const getPaymentStatusBadge = (status: string) => {
      switch(status) {
          case 'paid': return <span className="text-green-600 font-black text-xs">مدفوع بالكامل</span>;
          case 'partial': return <span className="text-orange-500 font-black text-xs">مدفوع جزئياً</span>;
          default: return <span className="text-red-500 font-black text-xs">غير مدفوع</span>;
      }
  };

  return (
    <div className="space-y-8 pb-20 font-tajawal text-right">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-primary relative border border-gray-100">
                <Inbox className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-gray-900">سجل الحجوزات</h2>
                <p className="text-xs font-bold text-gray-400 mt-1">إدارة ومتابعة كافة الطلبات الواردة.</p>
            </div>
         </div>
         {user.role === 'vendor' && (
            <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 h-12 rounded-2xl font-black shadow-lg shadow-primary/20 bg-gray-900 text-white">
                <Plus className="w-4 h-4" /> حجز جديد
            </Button>
         )}
      </div>

      {/* Advanced Filters Bar */}
      <div className="bg-white p-4 rounded-[2rem] border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
         <div className="relative">
            <label className="text-[10px] font-bold text-gray-400 mb-1 block">بحث عام</label>
            <div className="relative">
                <input 
                    placeholder="رقم الحجز، العميل، المكان..."
                    className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 pl-10 text-xs font-bold focus:bg-white transition-all outline-none"
                    value={filters.search}
                    onChange={e => setFilters({...filters, search: e.target.value})}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
         </div>
         <div>
            <label className="text-[10px] font-bold text-gray-400 mb-1 block">حالة الحجز</label>
            <select 
                className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none cursor-pointer" 
                value={filters.status} 
                onChange={e => setFilters({...filters, status: e.target.value})}
            >
                <option value="all">الكل</option>
                <option value="confirmed">مؤكد</option>
                <option value="pending">قيد الانتظار</option>
                <option value="cancelled">ملغي</option>
                <option value="on_hold">حجز مؤقت</option>
            </select>
         </div>
         <div className="md:col-span-2 grid grid-cols-2 gap-2">
             <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">من تاريخ</label>
                <input type="date" className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} />
             </div>
             <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">إلى تاريخ</label>
                <input type="date" className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} />
             </div>
         </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm min-h-[400px]">
        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead className="bg-gray-50/50 text-gray-500 font-black text-[10px] uppercase tracking-wider border-b border-gray-100">
                    <tr>
                        <th className="p-5">رقم الحجز</th>
                        <th className="p-5">العميل</th>
                        <th className="p-5">الأصل / القاعة</th>
                        <th className="p-5">تاريخ الحجز</th>
                        <th className="p-5">الحالة</th>
                        <th className="p-5">المالية</th>
                        <th className="p-5 text-center">إجراء</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {loading ? (
                        <tr><td colSpan={7} className="p-10 text-center"><span className="flex items-center justify-center gap-2 text-gray-400 font-bold"><Clock className="w-5 h-5 animate-spin" /> جاري التحميل...</span></td></tr>
                    ) : filteredBookings.length === 0 ? (
                        <tr><td colSpan={7} className="p-10 text-center text-gray-400 font-bold">لا توجد حجوزات مطابقة للبحث.</td></tr>
                    ) : (
                        filteredBookings.map((booking) => (
                            <tr 
                                key={booking.id} 
                                onClick={() => handleBookingClick(booking)}
                                className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                            >
                                <td className="p-5">
                                    <span className="font-mono text-xs font-black text-gray-400 group-hover:text-primary transition-colors">#{booking.id.slice(0, 6).toUpperCase()}</span>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-black">
                                            {(booking.guest_name || booking.client?.full_name || '?')[0]}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-900">{booking.guest_name || booking.client?.full_name || 'ضيف'}</p>
                                            <p className="text-[9px] text-gray-400">{booking.guest_phone || booking.client?.phone_number || '-'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-2">
                                        {booking.chalet_id ? <Palmtree className="w-4 h-4 text-blue-500" /> : booking.service_id ? <Sparkles className="w-4 h-4 text-orange-500" /> : <Building2 className="w-4 h-4 text-purple-500" />}
                                        <span className="text-xs font-bold text-gray-700">{booking.halls?.name || booking.chalets?.name || booking.services?.name}</span>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <div className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                        <CalendarCheck className="w-3 h-3 text-gray-400" />
                                        {format(parseISO(booking.booking_date), 'dd/MM/yyyy')}
                                    </div>
                                </td>
                                <td className="p-5">
                                    {getStatusBadge(booking.status)}
                                </td>
                                <td className="p-5">
                                    <div className="flex flex-col gap-1">
                                        <PriceTag amount={booking.total_amount} className="text-sm font-black text-gray-900" />
                                        {getPaymentStatusBadge(booking.payment_status || 'unpaid')}
                                    </div>
                                </td>
                                <td className="p-5 text-center">
                                    <button className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm">
                                        التفاصيل
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {selectedBooking && (
        <EditBookingDetailsModal 
            isOpen={isEditModalOpen} 
            onClose={() => setIsEditModalOpen(false)} 
            booking={selectedBooking} 
            onSuccess={fetchBookings} 
        />
      )}

      {user.role === 'vendor' && (
        <AddBookingModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} vendorId={user.id} onSuccess={fetchBookings} />
      )}
    </div>
  );
};
