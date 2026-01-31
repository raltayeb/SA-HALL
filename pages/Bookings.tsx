
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Booking, UserProfile } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../utils/currency';
import { Calendar, Receipt, CheckCircle, XCircle, Clock, Filter, Search } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';

interface BookingsProps {
  user: UserProfile;
}

export const Bookings: React.FC<BookingsProps> = ({ user }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [search, setSearch] = useState('');
  
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
      toast({ 
        title: 'تم التحديث', 
        description: `تم ${status === 'confirmed' ? 'تأكيد' : 'إلغاء'} الحجز بنجاح.`, 
        variant: 'success' 
      });
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

  const filteredBookings = bookings.filter(b => 
    b.halls?.name.toLowerCase().includes(search.toLowerCase()) ||
    b.profiles?.full_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">جاري تحميل الحجوزات...</div>;

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

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border flex-1 max-w-sm">
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
                  <td colSpan={user.role === 'user' ? 5 : 6} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="w-8 h-8 opacity-20" />
                      <p>لا توجد حجوزات مسجلة حالياً.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="p-4 font-medium">{b.halls?.name}</td>
                    {user.role !== 'user' && <td className="p-4">{b.profiles?.full_name}</td>}
                    <td className="p-4 text-muted-foreground">{b.booking_date}</td>
                    <td className="p-4 font-bold text-primary">{formatCurrency(b.total_amount)}</td>
                    <td className="p-4">{getStatusBadge(b.status)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 gap-1"
                          onClick={() => { setSelectedBooking(b); setIsInvoiceOpen(true); }}
                        >
                          <Receipt className="w-3.5 h-3.5" /> الفاتورة
                        </Button>
                        
                        {user.role === 'vendor' && b.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              className="h-8 gap-1 bg-green-600 hover:bg-green-700"
                              onClick={() => updateStatus(b.id, 'confirmed')}
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> تأكيد
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="h-8 gap-1"
                              onClick={() => updateStatus(b.id, 'cancelled')}
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

      <InvoiceModal 
        isOpen={isInvoiceOpen} 
        onClose={() => setIsInvoiceOpen(false)} 
        booking={selectedBooking} 
      />
    </div>
  );
};
