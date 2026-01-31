
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, Hall } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, Trash2, Edit, List, Grid3X3, Users, Building2, MapPin, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useToast } from '../context/ToastContext';

export const CalendarBoard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
      supabase.from('bookings').select('*, profiles:user_id(full_name), halls(*)').eq('vendor_id', user.id).gte('booking_date', firstDay).lte('booking_date', lastDay).neq('status', 'cancelled'),
      supabase.from('halls').select('*').eq('vendor_id', user.id)
    ]);

    if (bookingsRes.data) setBookings(bookingsRes.data as any[]);
    if (hallsRes.data) setHalls(hallsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchCalendarData(); }, [currentDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

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

    setLoading(true);
    const payload = {
      ...selectedBooking,
      vendor_id: user.id,
      user_id: selectedBooking.user_id || user.id,
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
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tighter flex items-center gap-3">
            <CalendarDays className="w-8 h-8" /> لوحة المواعيد الذكية
          </h2>
          <p className="text-muted-foreground mt-1">جدول زمني متقدم لإدارة جميع قاعاتك في مكان واحد.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-card border rounded-2xl p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 bg-card border rounded-2xl p-1 shadow-sm">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronRight className="w-5 h-5" /></Button>
            <span className="px-6 font-black text-sm min-w-[140px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: arSA })}
            </span>
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronLeft className="w-5 h-5" /></Button>
          </div>

          <Button onClick={() => { setSelectedBooking({ booking_date: format(new Date(), 'yyyy-MM-dd'), status: 'confirmed' }); setIsModalOpen(true); }} className="gap-2 rounded-2xl h-12 px-6 font-black shadow-lg shadow-primary/20">
            <Plus className="w-5 h-5" /> حجز يدوي
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="bg-card border rounded-[2.5rem] shadow-xl overflow-hidden relative">
          <div className="grid grid-cols-7 border-b">
            {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(d => (
              <div key={d} className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-l last:border-l-0 bg-muted/30">{d}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayBookings = bookings.filter(b => isSameDay(new Date(b.booking_date), day));
              const isCurrentMonth = isSameMonth(day, currentDate);
              
              return (
                <div 
                  key={day.toString()} 
                  onClick={() => handleDayClick(day)} 
                  className={`
                    min-h-[160px] p-2 border-l border-b last:border-l-0 transition-all cursor-pointer group hover:bg-primary/[0.02]
                    ${!isCurrentMonth ? 'bg-muted/5 opacity-40' : 'bg-card'}
                    ${isToday(day) ? 'bg-primary/[0.03]' : ''}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors
                      ${isToday(day) ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-muted-foreground group-hover:text-primary'}
                    `}>
                      {format(day, 'd')}
                    </span>
                    {dayBookings.length > 0 && <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{dayBookings.length} حجز</span>}
                  </div>
                  
                  <div className="space-y-1.5 max-h-[100px] overflow-y-auto no-scrollbar">
                    {dayBookings.slice(0, 3).map(b => (
                      <div key={b.id} className="text-[9px] font-black p-2 rounded-xl border bg-white shadow-sm flex flex-col gap-0.5 border-primary/20 hover:scale-[1.02] transition-transform">
                        <span className="text-primary truncate">{b.halls?.name}</span>
                        <span className="text-muted-foreground opacity-70 truncate flex items-center gap-1">
                          <Users className="w-2 h-2" /> {b.profiles?.full_name || 'حجز خارجي'}
                        </span>
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <div className="text-[8px] font-bold text-center text-muted-foreground py-1 bg-muted/20 rounded-lg">
                        + {dayBookings.length - 3} حجوزات أخرى
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="grid gap-4">
          {bookings.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed rounded-[2.5rem] bg-muted/5 opacity-50">
              <CalendarDays className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-black text-muted-foreground">لا توجد حجوزات مسجلة لهذا الشهر.</p>
            </div>
          ) : (
            bookings.map((b) => (
              <div key={b.id} onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }} className="bg-card border rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-6 cursor-pointer group">
                 <div className="w-16 h-16 rounded-2xl bg-primary/10 flex flex-col items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="text-[10px] font-black uppercase">{format(new Date(b.booking_date), 'MMM', { locale: arSA })}</span>
                    <span className="text-xl font-black">{format(new Date(b.booking_date), 'dd')}</span>
                 </div>
                 <div className="flex-1 text-center md:text-right">
                    <h3 className="text-lg font-black group-hover:text-primary transition-colors">{b.halls?.name}</h3>
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-1 text-xs text-muted-foreground font-bold">
                       <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {b.profiles?.full_name || 'حجز خارجي'}</span>
                       <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {b.halls?.city}</span>
                    </div>
                 </div>
                 <div className="px-6 border-r flex flex-col items-center md:items-end gap-2">
                    <Badge variant={b.status === 'confirmed' ? 'success' : 'warning'}>
                      {b.status === 'confirmed' ? 'مؤكد' : 'معلق'}
                    </Badge>
                    <span className="text-[10px] font-black text-muted-foreground">ID: {b.id.slice(0, 8)}</span>
                 </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Booking Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedBooking?.id ? 'تفاصيل الموعد' : 'إضافة حجز يدوي'}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" /> القاعة المستهدفة
            </label>
            <select className="w-full h-12 bg-card border rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none" value={selectedBooking?.hall_id || ''} onChange={e => setSelectedBooking({...selectedBooking, hall_id: e.target.value})}>
              <option value="">اختر القاعة من القائمة</option>
              {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">تاريخ الحجز</label>
                <Input type="date" value={selectedBooking?.booking_date || ''} onChange={e => setSelectedBooking({...selectedBooking, booking_date: e.target.value})} className="h-12 rounded-2xl font-bold" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">الحالة</label>
                <select className="w-full h-12 bg-card border rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={selectedBooking?.status || 'confirmed'} onChange={e => setSelectedBooking({...selectedBooking, status: e.target.value as any})}>
                  <option value="confirmed">مؤكد</option>
                  <option value="pending">قيد الانتظار</option>
                </select>
             </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">ملاحظات أو اسم العميل</label>
            <textarea 
              className="w-full h-24 bg-card border rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none" 
              value={selectedBooking?.notes || ''} 
              placeholder="مثال: حجز عائلة فلان - اتصال هاتفي" 
              onChange={e => setSelectedBooking({...selectedBooking, notes: e.target.value})} 
            />
          </div>
          <div className="flex gap-3 justify-end pt-6 border-t">
            {selectedBooking?.id && <Button variant="destructive" onClick={handleDelete} className="gap-2 rounded-xl h-12 px-6 font-bold"><Trash2 className="w-4 h-4" /> حذف الموعد</Button>}
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-12 px-6 font-bold">إلغاء</Button>
            <Button onClick={handleSave} className="gap-2 rounded-xl h-12 px-8 font-black shadow-lg shadow-primary/20">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
              {selectedBooking?.id ? 'تحديث البيانات' : 'تأكيد الحجز'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};