
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Booking, UserProfile } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { Calendar, Receipt, CheckCircle, XCircle, Clock, Search, AlertTriangle } from 'lucide-react';
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
  
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  
  const { toast } = useToast();

  const fetchBookings = async () => {
    setLoading(true);
    let query = supabase
      .from('bookings')
      .select('*, halls(*), profiles:user_id(*)');

    if (user.role === 'vendor') {
      query = query.eq('vendor_id', user.id);
    } else if (user.role === 'user') {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      setBookings(data as any[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id);

    if (!error) {
      const statusText = status === 'confirmed' ? 'تأكيد' : 'إلغاء';
      toast({ 
        title: 'تم التحديث', 
        description: `تم ${statusText} الحجز بنجاح.`, 
        variant: 'success' 
      });
      setCancellingBookingId(null);
      fetchBookings();
    } else {
      toast({ title: 'خطأ', description: 'فشل تحديث حالة الحجز', variant: 'destructive' });
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
                          b.profiles?.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || b.status === filter;
    return matchesSearch && matchesFilter;
  });

  const filterTabs = [
    { id: 'all', label: 'الكل' },
    { id: 'pending', label: 'قيد الانتظار' },
    { id: 'confirmed', label: 'المؤكدة' },
    { id: 'cancelled', label: 'الملغاة' },
  ] as const;

  if (loading && bookings.length === 0) return <div className="p-12 text-center animate-pulse">جاري تحميل الحجوزات...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            {user.role === 'super_admin' ? 'إدارة كافة الحجوزات' : 
             user.role === 'vendor' ? 'إدارة حجوزات قاعاتي' : 'حجوزاتي'}
          </h2>
          <p className="text-sm text-muted-foreground">
            تتبع حالة الحجوزات والفواتير الضريبية.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex bg-muted/30 p-1 rounded-xl border border-border/50">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`
                px-4 py-1.5 text-xs font-bold rounded-lg transition-all
                ${filter === tab.id 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border w-full md:w-64">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="البحث في الحجوزات..." 
            className="bg-transparent border-none focus:outline-none text-sm w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-4 font-medium">القاعة</th>
                {user.role !== 'user' && <th className="p-4 font-medium">العميل</th>}
                <th className="p-4 font-medium">تاريخ المناسبة</th>
                <th className="p-4 font-medium">المبلغ الإجمالي</th>
                <th className="p-4 font-medium">الحالة</th>
                <th className="p-4 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={user.role === 'user' ? 5 : 6} className="p-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-4">
                      <Clock className="w-12 h-12 opacity-10" />
                      <div>
                        <p className="text-lg font-bold">لا توجد حجوزات مطابقة</p>
                        <p className="text-sm">جرب تغيير حالة الفلتر أو البحث عن اسم آخر.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="p-4 font-medium">{b.halls?.name}</td>
                    {user.role !== 'user' && <td className="p-4">{b.profiles?.full_name}</td>}
                    <td className="p-4 text-muted-foreground">{b.booking_date}</td>
                    <td className="p-4">
                      <PriceTag amount={b.total_amount} className="text-primary" />
                    </td>
                    <td className="p-4">{getStatusBadge(b.status)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 gap-1 rounded-lg"
                          onClick={() => { setSelectedBooking(b); setIsInvoiceOpen(true); }}
                        >
                          <Receipt className="w-3.5 h-3.5" /> الفاتورة
                        </Button>
                        
                        {(user.role === 'vendor' || user.role === 'user') && b.status === 'pending' && (
                          <>
                            {user.role === 'vendor' && (
                              <Button 
                                size="sm" 
                                className="h-8 gap-1 bg-green-600 hover:bg-green-700 rounded-lg"
                                onClick={() => updateStatus(b.id, 'confirmed')}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> تأكيد
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="h-8 gap-1 rounded-lg"
                              onClick={() => setCancellingBookingId(b.id)}
                            >
                              <XCircle className="w-3.5 h-3.5" /> إلغاء
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Cancellation */}
      <Modal 
        isOpen={!!cancellingBookingId} 
        onClose={() => setCancellingBookingId(null)}
        title="تأكيد إلغاء الحجز"
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <div className="bg-destructive/10 p-4 rounded-full">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <h4 className="text-lg font-bold">هل أنت متأكد من رغبتك في إلغاء الحجز؟</h4>
              <p className="text-sm text-muted-foreground">لا يمكن التراجع عن هذا الإجراء، وسيتم إخطار الطرف الآخر فوراً.</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setCancellingBookingId(null)}>تراجع</Button>
            <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => cancellingBookingId && updateStatus(cancellingBookingId, 'cancelled')}>
              تأكيد الإلغاء
            </Button>
          </div>
        </div>
      </Modal>

      <InvoiceModal 
        isOpen={isInvoiceOpen} 
        onClose={() => setIsInvoiceOpen(false)} 
        booking={selectedBooking} 
      />
    </div>
  );
};
