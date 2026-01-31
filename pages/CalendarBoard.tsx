
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, Hall } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, Trash2, Edit } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { useToast } from '../context/ToastContext';

export const CalendarBoard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Partial<Booking> | null>(null);
  const { toast } = useToast();

  const fetchCalendarData = async () => {
    setLoading(true);
    const firstDay = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const lastDay = format(endOfMonth(currentDate), 'yyyy-MM-dd');

    const [bookingsRes, hallsRes] = await Promise.all([
      supabase.from('bookings').select('*, profiles:user_id(full_name), halls(*)').eq('vendor_id', user.id).gte('booking_date', firstDay).lte('booking_date', lastDay),
      supabase.from('halls').select('*').eq('vendor_id', user.id)
    ]);

    if (bookingsRes.data) setBookings(bookingsRes.data as any[]);
    if (hallsRes.data) setHalls(hallsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchCalendarData(); }, [currentDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleDayClick = (day: Date) => {
    const existing = bookings.find(b => isSameDay(new Date(b.booking_date), day));
    if (existing) {
      setSelectedBooking(existing);
    } else {
      setSelectedBooking({ booking_date: format(day, 'yyyy-MM-dd'), status: 'confirmed', vendor_id: user.id });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedBooking?.hall_id || !selectedBooking?.booking_date) {
      toast({ title: 'خطأ', description: 'يرجى اختيار القاعة والتاريخ.', variant: 'destructive' });
      return;
    }

    const payload = {
      ...selectedBooking,
      vendor_id: user.id,
      user_id: selectedBooking.user_id || user.id, // Manual entries use vendor ID as fallback user
      total_amount: selectedBooking.total_amount || 0,
      vat_amount: 0,
    };

    const { error } = selectedBooking.id 
      ? await supabase.from('bookings').update(payload).eq('id', selectedBooking.id)
      : await supabase.from('bookings').insert([payload]);

    if (!error) {
      toast({ title: 'نجاح', description: 'تم حفظ الموعد بنجاح.', variant: 'success' });
      setIsModalOpen(false);
      fetchCalendarData();
    } else {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedBooking?.id) return;
    if (confirm('هل أنت متأكد من حذف هذا الحجز؟')) {
      const { error } = await supabase.from('bookings').delete().eq('id', selectedBooking.id);
      if (!error) {
        toast({ title: 'تم الحذف', variant: 'success' });
        setIsModalOpen(false);
        fetchCalendarData();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2"><CalendarDays className="text-primary" /> لوحة المواعيد</h2>
          <p className="text-sm text-muted-foreground">إدارة وجدولة حجوزات القاعات والمناسبات.</p>
        </div>
        <div className="flex items-center gap-2 bg-card border rounded-xl p-1 shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronRight className="w-5 h-5" /></Button>
          <span className="px-4 font-bold text-sm min-w-[120px] text-center">{format(currentDate, 'MMMM yyyy', { locale: undefined })}</span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronLeft className="w-5 h-5" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border border rounded-2xl overflow-hidden shadow-sm">
        {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(d => (
          <div key={d} className="bg-muted/50 p-3 text-center text-xs font-black text-muted-foreground">{d}</div>
        ))}
        {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`empty-${i}`} className="bg-background/50 h-32" />)}
        {days.map(day => {
          const dayBookings = bookings.filter(b => isSameDay(new Date(b.booking_date), day));
          return (
            <div key={day.toString()} onClick={() => handleDayClick(day)} className={`bg-card min-h-[120px] p-2 transition-colors cursor-pointer hover:bg-primary/5 ${isToday(day) ? 'ring-1 ring-primary ring-inset' : ''}`}>
              <span className={`text-xs font-bold ${!isSameMonth(day, currentDate) ? 'text-muted-foreground/30' : ''}`}>{format(day, 'd')}</span>
              <div className="mt-2 space-y-1">
                {dayBookings.map(b => (
                  <div key={b.id} className={`text-[9px] font-bold p-1 rounded truncate border ${b.status === 'confirmed' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-yellow-50 border-yellow-100 text-yellow-700'}`}>
                    {b.halls?.name} - {b.profiles?.full_name || 'حجز خارجي'}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedBooking?.id ? 'تفاصيل الموعد' : 'إضافة حجز يدوي'}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">القاعة</label>
            <select className="w-full h-10 bg-background border rounded-xl px-3 text-sm focus:ring-1 focus:ring-primary outline-none" value={selectedBooking?.hall_id || ''} onChange={e => setSelectedBooking({...selectedBooking, hall_id: e.target.value})}>
              <option value="">اختر القاعة</option>
              {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <Input label="التاريخ" type="date" value={selectedBooking?.booking_date || ''} onChange={e => setSelectedBooking({...selectedBooking, booking_date: e.target.value})} />
          <Input label="اسم العميل (اختياري)" value={selectedBooking?.notes || ''} placeholder="مثال: حجز عائلة فلان" onChange={e => setSelectedBooking({...selectedBooking, notes: e.target.value})} />
          <div className="flex gap-2 justify-end pt-4 border-t">
            {selectedBooking?.id && <Button variant="destructive" onClick={handleDelete} className="gap-2"><Trash2 className="w-4 h-4" /> حذف</Button>}
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} className="gap-2"><Edit className="w-4 h-4" /> حفظ التغييرات</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
