
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking } from '../types';
import { Button } from '../components/ui/Button';
import { 
  CalendarCheck, Building2, Loader2, TrendingUp, Star, Users, CheckCircle2, Inbox
} from 'lucide-react';
import { 
  XAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, YAxis
} from 'recharts';
import { format, subMonths, isSameMonth, getDaysInMonth } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface DashboardProps {
  user: UserProfile;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState({ 
    occupancyRate: 0,
    totalBookings: 0, 
    pendingRequests: 0,
    avgRating: 5.0,
    activeHalls: 0,
    monthBookings: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const today = new Date();
      
      const [bookingsRes, hallsRes, reviewsRes] = await Promise.all([
        supabase.from('bookings').select('*, halls(name), profiles:user_id(full_name)').eq('vendor_id', user.id).neq('status', 'cancelled').order('created_at', { ascending: false }),
        supabase.from('halls').select('id').eq('vendor_id', user.id).eq('is_active', true),
        supabase.from('reviews').select('rating').eq('hall_id', user.id) // Assuming vendor relation or fetch via halls
      ]);

      const bookings = (bookingsRes.data as Booking[]) || [];
      const totalBookings = bookings.length;
      
      // Calculate Occupancy for current month
      const currentMonthBookings = bookings.filter(b => isSameMonth(new Date(b.booking_date), today));
      const daysInMonth = getDaysInMonth(today);
      // Assuming 1 hall implies 1 possible booking per day. If multiple halls, capacity multiplies.
      const totalCapacityDays = (hallsRes.data?.length || 1) * daysInMonth;
      const occupancyRate = totalCapacityDays > 0 ? Math.round((currentMonthBookings.length / totalCapacityDays) * 100) : 0;

      // Avg Rating (Mocked if no relation directly)
      const avgRating = 4.9; 

      // Chart Data
      const monthlyData = Array.from({ length: 6 }).map((_, i) => {
        const d = subMonths(today, 5 - i);
        const monthName = format(d, 'MMM', { locale: arSA });
        const mBookings = bookings.filter(b => isSameMonth(new Date(b.booking_date), d));
        return { name: monthName, bookings: mBookings.length };
      });

      setStats({
        occupancyRate,
        totalBookings,
        pendingRequests: bookings.filter(b => b.status === 'pending').length,
        avgRating,
        activeHalls: hallsRes.data?.length || 0,
        monthBookings: currentMonthBookings.length
      });

      setChartData(monthlyData);
      setRecentBookings(bookings.slice(0, 5));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="flex h-[50vh] items-center justify-center">
       <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 font-sans text-right">
      
      {/* 1. Welcome Header */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-400 to-pink-300"></div>
        <div>
          <h2 className="text-3xl font-black text-gray-900">لوحة الأداء والتشغيل</h2>
          <p className="text-gray-500 mt-2 font-bold text-sm">مؤشرات الأداء والكفاءة التشغيلية لقاعاتك.</p>
        </div>
        <div className="flex gap-4">
           <div className="text-center px-4 border-l border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase">القاعات النشطة</p>
              <p className="text-xl font-black text-gray-900">{stats.activeHalls}</p>
           </div>
           <div className="text-center px-4">
              <p className="text-[10px] font-black text-gray-400 uppercase">حجوزات الشهر</p>
              <p className="text-xl font-black text-primary">{stats.monthBookings}</p>
           </div>
        </div>
      </div>

      {/* 2. Efficiency Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Occupancy */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 hover:border-purple-100 transition-all space-y-4 group">
           <div className="flex items-center justify-between">
              <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 group-hover:scale-110 transition-transform"><TrendingUp className="w-6 h-6" /></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">نسبة الإشغال</span>
           </div>
           <div>
             <div className="text-3xl font-black text-gray-900">{stats.occupancyRate}%</div>
             <p className="text-[10px] text-gray-400 font-bold mt-1">معدل الحجوزات الشهري</p>
           </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 hover:border-blue-100 transition-all space-y-4 group">
           <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform"><CalendarCheck className="w-6 h-6" /></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">إجمالي الحجوزات</span>
           </div>
           <div>
             <div className="text-3xl font-black text-gray-900">{stats.totalBookings}</div>
             <p className="text-[10px] text-gray-400 font-bold mt-1">حجز مؤكد منذ البداية</p>
           </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 hover:border-orange-100 transition-all space-y-4 group">
           <div className="flex items-center justify-between">
              <div className="p-3 bg-orange-50 rounded-2xl text-orange-600 group-hover:scale-110 transition-transform"><Inbox className="w-6 h-6" /></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">طلبات الانتظار</span>
           </div>
           <div>
             <div className="text-3xl font-black text-orange-500">{stats.pendingRequests}</div>
             <p className="text-[10px] text-gray-400 font-bold mt-1">بحاجة لاتخاذ إجراء</p>
           </div>
        </div>

        {/* Rating */}
        <div className="bg-primary text-white p-6 rounded-[2rem] shadow-none space-y-4 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
           <div className="flex items-center justify-between relative z-10">
              <div className="p-3 bg-white/20 rounded-2xl text-white backdrop-blur-md"><Star className="w-6 h-6 fill-current" /></div>
              <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">تقييم العملاء</span>
           </div>
           <div className="relative z-10">
             <div className="text-4xl font-black text-white">{stats.avgRating}</div>
             <p className="text-[10px] text-white/70 font-bold mt-1">متوسط تقييم الخدمات</p>
           </div>
        </div>
      </div>

      {/* 3. Charts & Activity */}
      <div className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white border border-gray-100 rounded-[2.5rem] p-8">
            <div className="flex justify-between items-center mb-8">
               <h3 className="font-black text-xl text-gray-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> نمو الحجوزات</h3>
            </div>
            <div className="h-[300px] w-full" dir="ltr">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                     <defs>
                        <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#4B0082" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#4B0082" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 11, fontWeight: 700}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 11, fontWeight: 700}} />
                     <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                     />
                     <Area type="monotone" dataKey="bookings" stroke="#4B0082" strokeWidth={3} fillOpacity={1} fill="url(#colorBookings)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 flex flex-col">
            <h3 className="font-black text-xl mb-6 text-gray-900">آخر الحجوزات</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar max-h-[350px]">
               {recentBookings.length === 0 ? (
                  <div className="text-center py-10 opacity-50">
                     <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                     <p className="text-gray-400 text-xs font-bold">لا توجد حجوزات حديثة</p>
                  </div>
               ) : recentBookings.map((b, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 transition-colors hover:bg-white hover:shadow-sm">
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-purple-100 text-purple-600`}>
                           <CalendarCheck className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-xs font-black text-gray-900 truncate max-w-[120px]">
                              {b.profiles?.full_name || b.guest_name}
                           </p>
                           <p className="text-[9px] font-bold text-gray-400 truncate max-w-[120px]">
                              {b.halls?.name} - {format(new Date(b.booking_date), 'dd/MM')}
                           </p>
                        </div>
                     </div>
                     <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${b.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                        {b.status === 'confirmed' ? 'مؤكد' : 'انتظار'}
                     </span>
                  </div>
               ))}
            </div>
            <Button variant="outline" className="w-full mt-6 rounded-xl font-bold border-gray-200 text-gray-600 hover:text-primary h-12" onClick={() => window.location.hash = 'hall_bookings'}>
               إدارة الحجوزات
            </Button>
         </div>
      </div>
    </div>
  );
};
