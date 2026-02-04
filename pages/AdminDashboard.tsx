
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Users, Building2, CalendarCheck, Banknote, 
  TrendingUp, Activity, ArrowUpRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVendors: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeHalls: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      
      const [
        { count: userCount }, 
        { count: vendorCount },
        { count: bookingCount, data: bookingData },
        { count: hallCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vendor'),
        supabase.from('bookings').select('total_amount', { count: 'exact' }).neq('status', 'cancelled'),
        supabase.from('halls').select('*', { count: 'exact', head: true }).eq('is_active', true)
      ]);

      const revenue = bookingData?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) || 0;

      setStats({
        totalUsers: userCount || 0,
        totalVendors: vendorCount || 0,
        totalBookings: bookingCount || 0,
        totalRevenue: revenue,
        activeHalls: hallCount || 0
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const chartData = [
    { name: 'يناير', total: 4000 },
    { name: 'فبراير', total: 3000 },
    { name: 'مارس', total: 6000 },
    { name: 'أبريل', total: 8780 },
    { name: 'مايو', total: 5890 },
    { name: 'يونيو', total: 9390 },
  ];

  if (loading) return <div className="p-10 text-center animate-pulse">جاري تحميل البيانات...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-border/50">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">لوحة القيادة</h2>
          <p className="text-muted-foreground mt-1 font-bold text-sm opacity-80">نظرة شاملة على أداء المنصة.</p>
        </div>
        <div className="flex gap-2">
           <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">تصدير التقارير</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-[2rem] border border-border/60 p-6 relative overflow-hidden group hover:border-primary/20 transition-all">
           <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                 <Banknote className="w-6 h-6" />
              </div>
              <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                 +12% <TrendingUp className="w-3 h-3" />
              </span>
           </div>
           <div>
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">إجمالي الإيرادات</p>
              <PriceTag amount={stats.totalRevenue} className="text-3xl font-black text-foreground" />
           </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-border/60 p-6 relative overflow-hidden group hover:border-blue-500/20 transition-all">
           <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                 <CalendarCheck className="w-6 h-6" />
              </div>
           </div>
           <div>
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">الحجوزات</p>
              <h3 className="text-3xl font-black text-foreground">{stats.totalBookings}</h3>
           </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-border/60 p-6 relative overflow-hidden group hover:border-purple-500/20 transition-all">
           <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
                 <Users className="w-6 h-6" />
              </div>
           </div>
           <div>
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">المستخدمين</p>
              <h3 className="text-3xl font-black text-foreground">{stats.totalUsers}</h3>
           </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-border/60 p-6 relative overflow-hidden group hover:border-orange-500/20 transition-all">
           <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-orange-50 text-orange-600">
                 <Building2 className="w-6 h-6" />
              </div>
           </div>
           <div>
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">البائعين</p>
              <h3 className="text-3xl font-black text-foreground">{stats.totalVendors}</h3>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-border/60 p-8">
            <div className="flex justify-between items-center mb-10">
               <h3 className="text-xl font-black text-foreground flex items-center gap-3"><Activity className="w-6 h-6 text-primary" /> نمو الإيرادات</h3>
            </div>
            <div className="h-[320px]" dir="ltr">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                     <defs>
                        <linearGradient id="colorRevenueAdmin" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#4B0082" stopOpacity={0.2}/>
                           <stop offset="95%" stopColor="#4B0082" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis dataKey="name" tick={{fontSize: 12, fill: '#9CA3AF', fontWeight: 700}} axisLine={false} tickLine={false} />
                     <YAxis tick={{fontSize: 12, fill: '#9CA3AF', fontWeight: 700}} axisLine={false} tickLine={false} />
                     <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                        itemStyle={{color: '#4B0082'}}
                     />
                     <Area type="monotone" dataKey="total" stroke="#4B0082" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenueAdmin)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-primary text-primary-foreground rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl shadow-primary/20">
               <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-3xl"></div>
               <div className="relative z-10 space-y-6">
                  <h3 className="text-2xl font-black">القاعات النشطة</h3>
                  <div className="text-7xl font-black tracking-tighter">{stats.activeHalls}</div>
                  <p className="text-white/80 text-sm font-bold">قاعة جاهزة لاستقبال الحجوزات</p>
                  <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl h-12 font-bold transition-all text-sm flex items-center justify-center gap-2">
                     عرض القاعات <ArrowUpRight className="w-4 h-4" />
                  </button>
               </div>
            </div>
            
            <div className="bg-white border border-border/60 rounded-[2.5rem] p-8">
               <h4 className="font-black text-lg mb-6 text-foreground">إجراءات سريعة</h4>
               <div className="space-y-3">
                  <button className="w-full text-right px-5 py-4 rounded-2xl bg-gray-50 hover:bg-gray-100 text-sm font-bold transition-colors text-foreground flex justify-between items-center group">
                     <span>مراجعة طلبات الانضمام</span>
                     <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  </button>
                  <button className="w-full text-right px-5 py-4 rounded-2xl bg-gray-50 hover:bg-gray-100 text-sm font-bold transition-colors text-foreground">
                     تحديث إعدادات العمولة
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
