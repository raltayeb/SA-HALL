
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Booking, UserProfile } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AddBookingModal } from '../components/Booking/AddBookingModal';
import { EditBookingDetailsModal } from '../components/Booking/EditBookingDetailsModal';
import { PaymentHistoryModal } from '../components/Booking/PaymentHistoryModal';
import { 
  Search, Download, Plus, Edit2, Bell,
  Calendar, User, CreditCard, Filter, History, CheckCircle2, Clock, PieChart
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { format } from 'date-fns';

interface BookingsProps {
  user: UserProfile;
}

export const Bookings: React.FC<BookingsProps> = ({ user }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Column Filters
  const [columnFilters, setColumnFilters] = useState({
    client: '',
    date: '',
    startTime: '',
    endTime: '',
    hall: '',
    paymentStatus: 'all',
    status: 'all'
  });

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

      const { data, error } = await query.order('booking_date', { ascending: false });
      if (error) throw error;
      setBookings(data as Booking[] || []);
    } catch (err: any) {
      toast({ title: 'خطأ', description: 'فشل في تحميل الحجوزات.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user.id, user.role, toast]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const exportToExcel = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "التاريخ,العميل,القاعة,المبلغ,المدفوع,الحالة,حالة الدفع\n"
        + bookings.map(b => `${b.booking_date},${b.client?.full_name || 'زائر'},${b.halls?.name},${b.total_amount},${b.paid_amount || 0},${b.status},${b.payment_status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bookings.csv");
    document.body.appendChild(link);
    link.click();
  };

  const filteredBookings = bookings.filter(b => {
    const matchClient = !columnFilters.client || (b.client?.full_name || 'عميل خارجي').toLowerCase().includes(columnFilters.client.toLowerCase()) || (b.notes || '').toLowerCase().includes(columnFilters.client.toLowerCase());
    const matchDate = !columnFilters.date || b.booking_date.includes(columnFilters.date);
    const matchStart = !columnFilters.startTime || (b.start_time || '').includes(columnFilters.startTime);
    const matchEnd = !columnFilters.endTime || (b.end_time || '').includes(columnFilters.endTime);
    const matchHall = !columnFilters.hall || (b.halls?.name || '').toLowerCase().includes(columnFilters.hall.toLowerCase());
    const matchPayment = columnFilters.paymentStatus === 'all' || b.payment_status === columnFilters.paymentStatus;
    const matchStatus = columnFilters.status === 'all' || b.status === columnFilters.status;

    return matchClient && matchDate && matchStart && matchEnd && matchHall && matchPayment && matchStatus;
  });

  const getPaymentStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'paid':
        return (
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-xs font-black">مدفوع بالكامل</span>
          </div>
        );
      case 'partial':
        return (
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-100 w-fit">
            <PieChart className="w-3.5 h-3.5" />
            <span className="text-xs font-black">مدفوع جزئياً</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 w-fit">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-black">آجل / غير مدفوع</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                <Bell className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-gray-900">إدارة الحجوزات</h2>
                <p className="text-xs font-bold text-gray-400">تابع حجوزاتك وتفاصيلها المالية بدقة.</p>
            </div>
         </div>
         <div className="flex gap-3">
            <Button variant="outline" onClick={exportToExcel} className="gap-2 h-12 rounded-xl font-bold border-gray-200 hover:border-primary hover:text-primary transition-all">
                <Download className="w-4 h-4" /> تصدير
            </Button>
            {user.role === 'vendor' && (
                <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 h-12 rounded-xl font-black shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4" /> حجز جديد
                </Button>
            )}
         </div>
      </div>

      {/* Advanced Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right">
                <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="p-4 min-w-[180px]">
                            <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-2"><User className="w-3 h-3" /> العميل</span>
                                <div className="relative">
                                    <input 
                                        placeholder="بحث بالاسم..." 
                                        className="w-full h-9 bg-white border border-gray-200 rounded-lg px-3 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                                        value={columnFilters.client}
                                        onChange={e => setColumnFilters({...columnFilters, client: e.target.value})}
                                    />
                                    <Search className="w-3 h-3 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>
                        </th>
                        <th className="p-4 min-w-[150px]">
                            <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-2"><Calendar className="w-3 h-3" /> التاريخ</span>
                                <input 
                                    type="date"
                                    className="w-full h-9 bg-white border border-gray-200 rounded-lg px-3 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                                    value={columnFilters.date}
                                    onChange={e => setColumnFilters({...columnFilters, date: e.target.value})}
                                />
                            </div>
                        </th>
                        <th className="p-4 min-w-[150px]">
                            <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase text-primary tracking-wider">القاعة / الباقة</span>
                                <input 
                                    placeholder="فلترة..." 
                                    className="w-full h-9 bg-white border border-gray-200 rounded-lg px-3 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                                    value={columnFilters.hall}
                                    onChange={e => setColumnFilters({...columnFilters, hall: e.target.value})}
                                />
                            </div>
                        </th>
                        <th className="p-4 min-w-[150px]">
                            <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-2"><CreditCard className="w-3 h-3" /> حالة الدفع</span>
                                <select 
                                    className="w-full h-9 bg-white border border-gray-200 rounded-lg px-3 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                                    value={columnFilters.paymentStatus}
                                    onChange={e => setColumnFilters({...columnFilters, paymentStatus: e.target.value})}
                                >
                                    <option value="all">الكل</option>
                                    <option value="paid">مدفوع</option>
                                    <option value="partial">جزئي</option>
                                    <option value="unpaid">آجل</option>
                                </select>
                            </div>
                        </th>
                        <th className="p-4 min-w-[130px]">
                            <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-2"><Filter className="w-3 h-3" /> حالة الحجز</span>
                                <select 
                                    className="w-full h-9 bg-white border border-gray-200 rounded-lg px-3 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                                    value={columnFilters.status}
                                    onChange={e => setColumnFilters({...columnFilters, status: e.target.value})}
                                >
                                    <option value="all">الكل</option>
                                    <option value="confirmed">مؤكد</option>
                                    <option value="pending">قيد الانتظار</option>
                                    <option value="cancelled">ملغي</option>
                                </select>
                            </div>
                        </th>
                        <th className="p-4 text-center min-w-[120px]">
                            <span className="text-[10px] font-black uppercase text-primary tracking-wider">أجراءات</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {loading ? (
                        <tr><td colSpan={6} className="p-10 text-center animate-pulse text-gray-400 font-bold">جاري تحميل البيانات...</td></tr>
                    ) : filteredBookings.length === 0 ? (
                        <tr><td colSpan={6} className="p-10 text-center text-gray-400 font-bold">لا توجد حجوزات مطابقة للفلاتر</td></tr>
                    ) : filteredBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="p-4">
                                <div className="font-bold text-sm text-gray-900">{b.client?.full_name || 'عميل خارجي'}</div>
                                <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{b.notes?.split('|')[0] || ''}</div>
                            </td>
                            <td className="p-4 font-bold text-xs text-gray-600 font-mono">
                                {format(new Date(b.booking_date), 'yyyy-MM-dd')}
                                {b.start_time && <div className="text-[10px] text-gray-400 mt-1 dir-ltr">{b.start_time.slice(0,5)} - {b.end_time?.slice(0,5)}</div>}
                            </td>
                            <td className="p-4">
                                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-md">{b.halls?.name || 'حجز خدمة'}</span>
                            </td>
                            <td className="p-4">
                                {getPaymentStatusBadge(b.payment_status)}
                            </td>
                            <td className="p-4">
                                <Badge variant={b.status === 'confirmed' ? 'success' : b.status === 'pending' ? 'warning' : 'destructive'} className="rounded-lg px-3">
                                    {b.status === 'confirmed' ? 'مؤكد' : b.status === 'pending' ? 'انتظار' : 'ملغي'}
                                </Badge>
                            </td>
                            <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => { setSelectedBooking(b); setIsPaymentModalOpen(true); }} className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-all" title="سجل الدفعات">
                                        <History className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => { setSelectedBooking(b); user.role === 'vendor' ? setIsEditModalOpen(true) : setIsInvoiceOpen(true); }} className="text-gray-400 hover:text-primary hover:bg-primary/10 p-2 rounded-lg transition-all" title="تعديل التفاصيل">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="p-4 border-t border-gray-100 text-xs font-bold text-gray-400 text-left">
            العدد الإجمالي: {filteredBookings.length}
        </div>
      </div>

      {selectedBooking && (
        <>
            <InvoiceModal 
                isOpen={isInvoiceOpen} 
                onClose={() => setIsInvoiceOpen(false)} 
                booking={{
                    ...selectedBooking,
                    profiles: user.role === 'vendor' ? (selectedBooking.client || selectedBooking.profiles) : (selectedBooking.vendor || selectedBooking.profiles)
                }} 
            />
            {user.role === 'vendor' && (
                <>
                    <EditBookingDetailsModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        booking={selectedBooking}
                        onSuccess={fetchBookings}
                    />
                    <PaymentHistoryModal 
                        isOpen={isPaymentModalOpen}
                        onClose={() => setIsPaymentModalOpen(false)}
                        booking={selectedBooking}
                        onUpdate={fetchBookings}
                    />
                </>
            )}
        </>
      )}

      {user.role === 'vendor' && (
        <AddBookingModal 
            isOpen={isAddModalOpen} 
            onClose={() => setIsAddModalOpen(false)} 
            vendorId={user.id}
            onSuccess={fetchBookings}
        />
      )}
    </div>
  );
};
