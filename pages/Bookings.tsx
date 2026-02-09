
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Booking, UserProfile, Hall, Chalet } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AddBookingModal } from '../components/Booking/AddBookingModal';
import { EditBookingDetailsModal } from '../components/Booking/EditBookingDetailsModal';
import { PaymentHistoryModal } from '../components/Booking/PaymentHistoryModal';
import { GuestBookingDetailsModal } from '../components/Booking/GuestBookingDetailsModal';
import { 
  Search, Plus, Inbox, CheckCircle2, Clock, PieChart, CreditCard, ChevronLeft, ChevronRight, Calendar, Building2, Eye, UserCheck, Palmtree, Sparkles, Filter
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { normalizeNumbers } from '../utils/helpers';

interface BookingsProps {
  user: UserProfile;
}

export const Bookings: React.FC<BookingsProps> = ({ user }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [chalets, setChalets] = useState<Chalet[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGuestDetailsOpen, setIsGuestDetailsOpen] = useState(false); 
  
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    assetType: 'all', // hall, chalet, service
    paymentStatus: 'all',
    status: 'all'
  });

  const { toast } = useToast();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Assets for filtering (if vendor)
      if (user.role === 'vendor') {
          const [hRes, cRes] = await Promise.all([
              supabase.from('halls').select('*').eq('vendor_id', user.id),
              supabase.from('chalets').select('*').eq('vendor_id', user.id)
          ]);
          setHalls(hRes.data || []);
          setChalets(cRes.data || []);
      }

      // 2. Build Query
      let query = supabase
        .from('bookings')
        .select(`
          *,
          halls:hall_id (name, city),
          chalets:chalet_id (name, city),
          client:user_id (full_name, email, phone_number),
          vendor:vendor_id (business_name, phone_number, email),
          services:service_id (name)
        `);

      if (user.role === 'vendor') {
        query = query.eq('vendor_id', user.id);
      } else {
        // User/Guest View
        const normalizedPhone = normalizeNumbers(user.phone_number || '');
        if (normalizedPhone) {
            query = query.or(`user_id.eq.${user.id},guest_phone.eq.${normalizedPhone}`);
        } else {
            query = query.eq('user_id', user.id);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setBookings(data as any[] || []);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'خطأ', description: 'فشل في تحميل الحجوزات.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user.id, user.role, user.phone_number, toast]);

  // Realtime Subscription
  useEffect(() => {
    fetchBookings();
    
    const channel = supabase.channel('bookings_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
          fetchBookings();
          // Optional: Add a toast "New booking received"
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings]);

  const handleBookingClick = async (booking: Booking) => {
      setSelectedBooking(booking);
      if (user.role === 'vendor') {
          setIsEditModalOpen(true);
          if (!(booking as any).is_read) {
              await supabase.from('bookings').update({ is_read: true }).eq('id', booking.id);
              setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, is_read: true } : b));
          }
      } else {
          setIsGuestDetailsOpen(true);
      }
  };

  // Filter Logic
  const filteredBookings = bookings.filter(b => {
    const searchTerm = normalizeNumbers(filters.search.toLowerCase());
    const matchSearch = !searchTerm || 
        (b.client?.full_name || b.guest_name || 'عميل').toLowerCase().includes(searchTerm) || 
        normalizeNumbers(b.guest_phone || '')?.includes(searchTerm) ||
        b.id.toLowerCase().includes(searchTerm);
    
    const matchDate = !filters.date || b.booking_date.includes(filters.date);
    
    const matchAsset = filters.assetType === 'all' || 
       (filters.assetType === 'hall' && b.hall_id) ||
       (filters.assetType === 'chalet' && b.chalet_id) ||
       (filters.assetType === 'service' && b.service_id);

    const matchPayment = filters.paymentStatus === 'all' || b.payment_status === filters.paymentStatus;
    const matchStatus = filters.status === 'all' || b.status === filters.status;

    return matchSearch && matchDate && matchAsset && matchPayment && matchStatus;
  });

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const currentData = filteredBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getAssetName = (b: Booking) => b.halls?.name || b.chalets?.name || b.services?.name || 'غير محدد';
  const getAssetIcon = (b: Booking) => {
      if (b.chalets) return <Palmtree className="w-4 h-4 text-blue-500" />;
      if (b.services) return <Sparkles className="w-4 h-4 text-orange-500" />;
      return <Building2 className="w-4 h-4 text-purple-500" />;
  };

  return (
    <div className="space-y-6 pb-20 font-tajawal text-right">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-primary relative border border-gray-100">
                <Inbox className="w-6 h-6" />
                {user.role === 'vendor' && bookings.filter(b => !(b as any).is_read).length > 0 && (
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
            </div>
            <div>
                <h2 className="text-2xl font-black text-gray-900">{user.role === 'vendor' ? 'سجل الحجوزات' : 'حجوزاتي'}</h2>
                <p className="text-xs font-bold text-gray-400 mt-1">
                    {bookings.length} حجز مسجل في النظام
                </p>
            </div>
         </div>
         {user.role === 'vendor' && (
            <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 h-12 rounded-2xl font-black shadow-lg shadow-primary/20 bg-gray-900 text-white">
                <Plus className="w-4 h-4" /> حجز يدوي
            </Button>
         )}
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
         <div className="md:col-span-2 relative">
            <input 
                placeholder="بحث..."
                className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 pl-10 text-xs font-bold focus:bg-white transition-all outline-none"
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
         </div>
         <select className="h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none cursor-pointer" value={filters.assetType} onChange={e => setFilters({...filters, assetType: e.target.value})}>
            <option value="all">كل الأصول</option>
            <option value="hall">القاعات</option>
            <option value="chalet">الشاليهات</option>
            <option value="service">الخدمات</option>
         </select>
         <select className="h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none cursor-pointer" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
            <option value="all">كل الحالات</option>
            <option value="confirmed">مؤكد</option>
            <option value="pending">معلق</option>
            <option value="cancelled">ملغي</option>
         </select>
         <input type="date" className="h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none cursor-pointer" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-right border-collapse">
                <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                    <tr>
                        <th className="p-5 w-[25%]">{user.role === 'vendor' ? 'العميل' : 'رقم الحجز'}</th>
                        <th className="p-5 w-[20%]">الأصل المحجوز</th>
                        <th className="p-5 w-[15%]">الحالة</th>
                        <th className="p-5 w-[20%]">المالية</th>
                        <th className="p-5 w-[15%] text-center">التاريخ</th>
                        <th className="p-5 w-[5%]"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {loading ? (
                        Array.from({length: 5}).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={6} className="p-6"><div className="h-4 bg-gray-100 rounded w-full"></div></td></tr>)
                    ) : currentData.length === 0 ? (
                        <tr><td colSpan={6} className="p-20 text-center text-gray-400 font-bold">لا توجد حجوزات مطابقة</td></tr>
                    ) : currentData.map((b) => {
                        const isRead = (b as any).is_read;
                        return (
                            <tr 
                                key={b.id} 
                                onClick={() => handleBookingClick(b)}
                                className={`
                                    group transition-all cursor-pointer hover:bg-gray-50
                                    ${!isRead && user.role === 'vendor' ? 'bg-primary/5' : 'bg-white'}
                                `}
                            >
                                <td className="p-5">
                                    <div className="font-bold text-gray-900 text-sm">{b.client?.full_name || b.guest_name || 'عميل'}</div>
                                    <div className="text-[10px] text-gray-400 font-mono mt-1">#{b.id.slice(0,8)}</div>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">{getAssetIcon(b)}</div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-900">{getAssetName(b)}</div>
                                            <div className="text-[10px] text-gray-400 font-mono">{b.booking_date}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <Badge variant={b.status === 'confirmed' ? 'success' : b.status === 'pending' ? 'warning' : 'destructive'} className="text-[10px] px-2 py-1 rounded-lg">
                                        {b.status === 'confirmed' ? 'مؤكد' : b.status === 'pending' ? 'جديد' : b.status === 'cancelled' ? 'ملغي' : b.status}
                                    </Badge>
                                </td>
                                <td className="p-5">
                                    <div className="text-sm font-black text-gray-900">{b.total_amount.toLocaleString()} <span className="text-[9px] font-medium text-gray-400">ر.س</span></div>
                                    <div className={`text-[9px] font-bold mt-1 ${b.payment_status === 'paid' ? 'text-green-600' : 'text-orange-500'}`}>
                                        {b.payment_status === 'paid' ? 'مدفوع بالكامل' : b.payment_status === 'partial' ? `متبقي: ${(b.total_amount - (b.paid_amount || 0)).toLocaleString()}` : 'غير مدفوع'}
                                    </div>
                                </td>
                                <td className="p-5 text-center text-[10px] font-bold text-gray-400">
                                    {format(new Date(b.created_at || ''), 'dd/MM p', { locale: arSA })}
                                </td>
                                <td className="p-5 text-center">
                                    <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-50 flex justify-between items-center bg-gray-50/50">
            <span className="text-[10px] font-bold text-gray-400">صفحة {currentPage} من {totalPages || 1}</span>
            <div className="flex gap-2">
                <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 w-8 rounded-lg bg-white border-gray-200"><ChevronRight className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="h-8 w-8 rounded-lg bg-white border-gray-200"><ChevronLeft className="w-4 h-4" /></Button>
            </div>
        </div>
      </div>

      {selectedBooking && (
        <>
            <InvoiceModal isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} booking={{...selectedBooking, profiles: user.role === 'vendor' ? (selectedBooking.client || selectedBooking.profiles) : (selectedBooking.vendor || selectedBooking.profiles)}} />
            
            <GuestBookingDetailsModal 
                isOpen={isGuestDetailsOpen} 
                onClose={() => setIsGuestDetailsOpen(false)} 
                booking={selectedBooking} 
                onOpenInvoice={() => setIsInvoiceOpen(true)}
            />

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
