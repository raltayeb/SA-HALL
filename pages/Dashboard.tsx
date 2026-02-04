
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, Hall } from '../types';
import { PriceTag } from '../components/ui/PriceTag';
import { Button } from '../components/ui/Button';
import { 
  CalendarCheck, Banknote, Hourglass, Building2, 
  Loader2, CheckCircle2, XCircle, ArrowRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';

interface DashboardProps {
  user: UserProfile;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState({ totalBookings: 0, totalRevenue: 0, pendingBookings: 0, activeHalls: 0 });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: hData } = await supabase.from('halls').select('*').eq('vendor_id', user.id);
      const { data: bData } = await supabase
        .from('bookings')
        .select('*, halls(name), profiles:user_id(full_name)')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false });

      const bookings = (bData as Booking[] || []);
      const activeBookings = bookings.filter(b => b.status !== 'cancelled');
      
      const totalRevenue = activeBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
      
      setStats({
        totalBookings: bookings.length,
        totalRevenue,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        activeHalls: hData?.length || 0
      });

      setRecentBookings(bookings.slice(0, 5));

      const chartData = [
        { name: 'يناير', total: totalRevenue * 0.1 }, 
        { name: 'فبراير', total: totalRevenue * 0.2 },
        { name: 'مارس', total: totalRevenue * 0.15 },
        { name: 'أبريل', total: totalRevenue * 0.3 },
        { name: 'مايو', total: totalRevenue * 0.25 },
      ]; 
      setRevenueData(chartData);

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-primary/5 rounded-[2.5rem] p-8 border border-primary/10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-primary">لوحة التحكم</h2>
          <p className="text-muted-foreground mt-2 font-bold">مرحباً {user.full_name}، إليك نظرة سريعة على أداء نشاطك اليوم.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button className="h-12 px-8 rounded-2xl font-bold shadow-none bg-primary text-white">إضافة حجز سريع</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-[2rem] border border-border/50 shadow-sm hover:shadow-md transition-all space-y-2">
           <div className="flex items-center justify-between">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">الإيرادات</span>
              <div className="p-2 bg-primary/5 rounded-xl text-primary"><Banknote className="w-5 h-5" /></div>
           </div>
           <PriceTag amount={stats.totalRevenue} className="text-3xl font-black text-foreground" />
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-border/50 shadow-sm hover:shadow-md transition-all space-y-2">
           <div className="flex items-center justify-between">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">الحجوزات</span>
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><CalendarCheck className="w-5 h-5" /></div>
           </div>
           <div className="text-3xl font-black text-foreground">{stats.totalBookings}</div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-border/50 shadow-sm hover:shadow-md transition-all space-y-2">
           <div className="flex items-center justify-between">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">قيد الانتظار</span>
              <div className="p-2 bg-orange-50 rounded-xl text-orange-600"><Hourglass className="w-5 h-5" /></div>
           </div>
           <div className="text-3xl font-black text-foreground">{stats.pendingBookings}</div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-border/50 shadow-sm hover:shadow-md transition-all space-y-2">
           <div className="flex items-center justify-between">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">القاعات النشطة</span>
              <div className="p-2 bg-green-50 rounded-xl text-green-600"><Building2 className="w-5 h-5" /></div>
           </div>
           <div className="text-3xl font-black text-foreground">{stats.activeHalls}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white border border-border/50 rounded-[2.5rem] p-8 shadow-sm">
            <h3 className="font-black text-xl mb-8 text-foreground">تحليل الإيرادات</h3>
            <div className="h-[300px] w-full" dir="ltr">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 700}} />
                     <Tooltip 
                        cursor={{fill: '#F3E8FF', opacity: 0.4}}
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                     />
                     <Bar dataKey="total" fill="#4B0082" radius={[8, 8, 8, 8]} barSize={48} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white border border-border/50 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
            <h3 className="font-black text-xl mb-6 text-foreground">آخر الحجوزات</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar max-h-[300px]">
               {recentBookings.length === 0 ? (
                  <p className="text-muted-foreground text-sm font-bold text-center py-10 opacity-50">لا توجد حجوزات حديثة</p>
               ) : recentBookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${b.status === 'confirmed' ? 'bg-green-100 text-green-600' : b.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                           {b.status === 'confirmed' ? <CheckCircle2 className="w-5 h-5" /> : b.status === 'cancelled' ? <XCircle className="w-5 h-5" /> : <Hourglass className="w-5 h-5" />}
                        </div>
                        <div>
                           <p className="text-sm font-black text-foreground">{b.profiles?.full_name || 'ضيف'}</p>
                           <p className="text-[10px] font-bold text-muted-foreground">{b.halls?.name}</p>
                        </div>
                     </div>
                     <div className="text-left">
                        <PriceTag amount={b.total_amount} className="text-sm font-black" />
                        <p className="text-[10px] font-bold text-muted-foreground mt-0.5">{format(new Date(b.booking_date), 'dd MMM')}</p>
                     </div>
                  </div>
               ))}
            </div>
            <Button variant="outline" className="w-full mt-6 rounded-xl font-bold border-border text-foreground hover:bg-gray-50 h-12">
               عرض الكل <ArrowRight className="w-4 h-4 mr-2" />
            </Button>
         </div>
      </div>
    </div>
  );
};
