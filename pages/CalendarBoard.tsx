
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Edit, List, Grid3X3, Users, Filter, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useToast } from '../context/ToastContext';

export const CalendarBoard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [assets, setAssets] = useState<{id: string, name: string}[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>('all');
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Partial<Booking> | null>(null);
  const { toast } = useToast();

  // Fetch Assets
  useEffect(() => {
      const fetchAssets = async () => {
          const [halls, chalets] = await Promise.all([
              supabase.from('halls').select('id, name').eq('vendor_id', user.id),
              supabase.from('chalets').select('id, name').eq('vendor_id', user.id)
          ]);
          setAssets([...(halls.data || []), ...(chalets.data || [])]);
      };
      fetchAssets();
  }, [user.id]);

  const fetchCalendarData = async () => {
    setLoading(true);
    const firstDay = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const lastDay = format(endOfMonth(currentDate), 'yyyy-MM-dd');

    let query = supabase.from('bookings')
        .select('*, profiles:user_id(full_name), halls(name), chalets(name)')
        .eq('vendor_id', user.id)
        .gte('booking_date', firstDay)
        .lte('booking_date', lastDay)
        .neq('status', 'cancelled');

    if (selectedAsset !== 'all') {
        query = query.or(`hall_id.eq.${selectedAsset},chalet_id.eq.${selectedAsset}`);
    }

    const { data } = await query;
    setBookings(data as any[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchCalendarData(); }, [currentDate, selectedAsset]);

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
      setSelectedBooking({ 
          booking_date: format(day, 'yyyy-MM-dd'), 
          status: 'confirmed', 
          vendor_id: user.id,
          hall_id: selectedAsset !== 'all' ? selectedAsset : (assets[0]?.id || '') 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedBooking?.hall_id && !selectedBooking?.chalet_id) {
      toast({ title: 'خطأ', description: 'يرجى اختيار القاعة/الشاليه.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    // Determine target based on asset list
    const isChalet = assets.find(a => a.id === selectedBooking.hall_id)?.name.includes('شاليه'); // Simplistic check, better to use type in assets
    
    // Correction: AddBookingModal handles ID assignment correctly, here we assume hall_id in state maps to selected asset ID
    // We need to verify if the ID belongs to hall or chalet table
    const targetId = selectedBooking.hall_id;
    let finalPayload: any = { ...selectedBooking };
    
    // Check against hall list
    const { data: isHall } = await supabase.from('halls').select('id').eq('id', targetId).maybeSingle();
    if(isHall) {
        finalPayload.hall_id = targetId;
        finalPayload.chalet_id = null;
    } else {
        finalPayload.chalet_id = targetId;
        finalPayload.hall_id = null;
    }

    finalPayload = {
      ...finalPayload,
      vendor_id: user.id,
      user_id: selectedBooking.user_id || null, 
      total_amount: selectedBooking.total_amount || 0,
      vat_amount: 0,
    };

    const { error } = selectedBooking.id 
      ? await supabase.from('bookings').update(finalPayload).eq('id', selectedBooking.id)
      : await supabase.from('bookings').insert([finalPayload]);

    if (!error) {
      toast({ title: 'نجاح', description: 'تم حفظ الموعد بنجاح.', variant: 'success' });
      setIsModalOpen(false);
      fetchCalendarData();
    } else {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
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
            <CalendarDays className="w-8 h-8" /> لوحة المواعيد
          </h2>
          <p className="text-gray-400 font-bold text-sm mt-1">جدول زمني متقدم لإدارة جميع أصولك.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-gray-200 p-2 rounded-2xl">
             <Filter className="w-4 h-4 text-gray-400" />
             <select 
                className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer"
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
             >
                <option value="all">كافة الأصول</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
             </select>
          </div>

          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-1">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronRight className="w-5 h-5" /></Button>
            <span className="px-6 font-black text-sm min-w-[140px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: arSA })}
            </span>
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronLeft className="w-5 h-5" /></Button>
          </div>

          <Button onClick={() => { setSelectedBooking({ booking_date: format(new Date(), 'yyyy-MM-dd'), status: 'confirmed' }); setIsModalOpen(true); }} className="gap-2 rounded-2xl h-12 px-6 font-black shadow">
            <Plus className="w-5 h-5" /> حجز يدوي
          </Button>
        </div>
      </div>

      {/* Grid View */}
      <div className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden relative">
          <div className="grid grid-cols-7 border-b border-gray-200">
            {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(d => (
              <div key={d} className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 border-l border-gray-200 last:border-l-0 bg-gray-50/50">{d}</div>
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
                    min-h-[160px] p-2 border-l border-b border-gray-200 last:border-l-0 transition-all cursor-pointer group hover:bg-gray-50
                    ${!isCurrentMonth ? 'bg-gray-50/30' : 'bg-white'}
                    ${isToday(day) ? 'bg-primary/5' : ''}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors
                      ${isToday(day) ? 'bg-primary text-white shadow' : 'text-gray-400 group-hover:text-primary'}
                    `}>
                      {format(day, 'd')}
                    </span>
                    {dayBookings.length > 0 && <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">{dayBookings.length} حجز</span>}
                  </div>
                  
                  <div className="space-y-1.5 max-h-[100px] overflow-y-auto no-scrollbar">
                    {dayBookings.slice(0, 3).map(b => (
                      <div key={b.id} className="text-[9px] font-black p-2 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col gap-0.5 hover:border-primary/30 transition-colors">
                        <span className="text-primary truncate">{b.halls?.name || b.chalets?.name}</span>
                        <span className="text-gray-400 opacity-80 truncate flex items-center gap-1">
                          <Users className="w-2 h-2" /> {b.guest_name || 'عميل'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
      </div>

      {/* Booking Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedBooking?.id ? 'تفاصيل الموعد' : 'إضافة حجز يدوي'}>
        <div className="space-y-6 text-right">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
               المكان المستهدف
            </label>
            <select 
                className="w-full h-12 bg-white border border-gray-200 rounded-2xl px-4 text-sm font-bold outline-none appearance-none" 
                value={selectedBooking?.hall_id || selectedBooking?.chalet_id || ''} 
                onChange={e => setSelectedBooking({...selectedBooking, hall_id: e.target.value})} // We handle id split on save
            >
              <option value="">اختر من القائمة</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">تاريخ الحجز</label>
                <Input type="date" value={selectedBooking?.booking_date || ''} onChange={e => setSelectedBooking({...selectedBooking, booking_date: e.target.value})} className="h-12 rounded-2xl font-bold border-gray-200" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">الحالة</label>
                <select className="w-full h-12 bg-white border border-gray-200 rounded-2xl px-4 text-sm font-bold outline-none" value={selectedBooking?.status || 'confirmed'} onChange={e => setSelectedBooking({...selectedBooking, status: e.target.value as any})}>
                  <option value="confirmed">مؤكد</option>
                  <option value="pending">قيد الانتظار</option>
                </select>
             </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">ملاحظات أو اسم العميل</label>
            <textarea 
              className="w-full h-24 bg-white border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none resize-none" 
              value={selectedBooking?.notes || ''} 
              placeholder="مثال: حجز عائلة فلان - اتصال هاتفي" 
              onChange={e => setSelectedBooking({...selectedBooking, notes: e.target.value})} 
            />
          </div>
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-100">
            {selectedBooking?.id && <Button variant="destructive" onClick={handleDelete} className="gap-2 rounded-xl h-12 px-6 font-bold"><Trash2 className="w-4 h-4" /> حذف الموعد</Button>}
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-12 px-6 font-bold border-gray-200">إلغاء</Button>
            <Button onClick={handleSave} disabled={loading} className="gap-2 rounded-xl h-12 px-8 font-black shadow">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
              {selectedBooking?.id ? 'تحديث البيانات' : 'تأكيد الحجز'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
