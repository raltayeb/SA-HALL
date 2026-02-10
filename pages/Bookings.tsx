
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Booking, UserProfile } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AddBookingModal } from '../components/Booking/AddBookingModal';
import { EditBookingDetailsModal } from '../components/Booking/EditBookingDetailsModal';
import { 
  Search, Plus, Inbox, CheckCircle2, Clock, CalendarCheck, 
  Building2, Palmtree, Sparkles, ChevronLeft, User, MapPin, Filter 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { normalizeNumbers } from '../utils/helpers';

interface BookingsProps {
  user: UserProfile;
}

export const Bookings: React.FC<BookingsProps> = ({ user }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
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

      const { data, error } = await query.order('created_at', { ascending: false });
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
    const matchSearch = !searchTerm || 
        (b.client?.full_name || b.guest_name || '').toLowerCase().includes(searchTerm) || 
        (b.id || '').includes(searchTerm);
    const matchStatus = filters.status === 'all' || b.status === filters.status;
    return matchSearch && matchStatus;
  });

  const getAssetIcon = (b: Booking) => {
      if (b.chalet_id) return <Palmtree className="w-5 h-5 text-blue-500" />;
      if (b.service_id) return <Sparkles className="w-5 h-5 text-orange-500" />;
      return <Building2 className="w-5 h-5 text-purple-500" />;
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

      {/* Filters */}
      <div className="flex gap-4 bg-white p-2 rounded-[2rem] border border-gray-100 w-full md:w-fit">
         <div className="relative flex-1 md:w-64">
            <input 
                placeholder="بحث برقم الحجز أو الاسم..."
                className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 pl-10 text-xs font-bold focus:bg-white transition-all outline-none"
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
         </div>
         <select className="h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none cursor-pointer" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
            <option value="all">كل الحالات</option>
            <option value="confirmed">مؤكد</option>
            <option value="pending">قيد الانتظار</option>
            <option value="cancelled">ملغي</option>
         </select>
      </div>

      {/* Redesigned Table List */}
      <div className="space-y-4">
        {loading ? (
            Array.from({length: 3}).map((_, i) => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-[2rem]"></div>)
        ) : filteredBookings.length === 0 ? (
            <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-[2.5rem]">
                <CalendarCheck className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="font-bold text-gray-400">لا توجد حجوزات مطابقة.</p>
            </div>
        ) : (
            filteredBookings.map(booking => (
                <div 
                    key={booking.id} 
                    onClick={() => handleBookingClick(booking)}
                    className="bg-white border border-gray-100 rounded-[2rem] p-6 hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group relative overflow-hidden"
                >
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Info Section */}
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-colors">
                                {getAssetIcon(booking)}
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-black text-gray-900 text-lg">{booking.halls?.name || booking.chalets?.name || booking.services?.name}</h3>
                                    <span className="text-[10px] bg-gray-50 text-gray-400 px-2 py-0.5 rounded border border-gray-100 font-mono">#{booking.id.slice(0,6)}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {booking.guest_name || booking.client?.full_name || 'ضيف'}</span>
                                    <span className="flex items-center gap-1"><CalendarCheck className="w-3 h-3" /> {format(new Date(booking.booking_date), 'dd MMM yyyy', { locale: arSA })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Status & Price */}
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-400 mb-1">الإجمالي</p>
                                <p className="font-black text-xl text-primary">{booking.total_amount.toLocaleString()} ر.س</p>
                            </div>
                            <div className={`px-4 py-2 rounded-xl text-xs font-black border flex items-center gap-2 ${
                                booking.status === 'confirmed' ? 'bg-green-50 text-green-600 border-green-100' : 
                                booking.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                                'bg-red-50 text-red-600 border-red-100'
                            }`}>
                                {booking.status === 'confirmed' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                {booking.status === 'confirmed' ? 'مؤكد' : booking.status === 'pending' ? 'جديد' : 'ملغي'}
                            </div>
                            <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors hidden md:block" />
                        </div>
                    </div>
                </div>
            ))
        )}
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
