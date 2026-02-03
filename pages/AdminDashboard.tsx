
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  Users, Building2, CalendarCheck, Banknote, 
  TrendingUp, TrendingDown, ArrowUpRight 
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

  const cards = [
    { label: 'إجمالي الإيرادات', val: stats.totalRevenue, icon: Banknote, isPrice: true, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'الحجوزات النشطة', val: stats.totalBookings, icon: CalendarCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'العملاء المسجلين', val: stats.totalUsers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'شركاء النجاح (البائعين)', val: stats.totalVendors, icon: Building2, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  // Dummy chart data for visualization
  const chartData = [
    { name: 'يناير', total: 4000 },
    { name: 'فبراير', total: 3000 },
    { name: 'مارس', total: 2000 },
    { name: 'أبريل', total: 2780 },
    { name: 'مايو', total: 1890 },
    { name: 'يونيو', total: 2390 },
    { name: 'يوليو', total: 3490 },
  ];

  if (loading) return <div className="p-10 text-center animate-pulse">جاري تحميل البيانات...</div>;

  return (
    <div className="space-y-8 pb-10">
      <div className="text-right">
        <h2 className="text-3xl font-ruqaa text-primary">لوحة القيادة المركزية</h2>
        <p className="text-sm text-muted-foreground mt-1">نظرة شاملة على أداء المنصة والنمو.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all text-right">
             <div className="flex justify-between items-start mb-4 flex-row-reverse">
                <div className={`p-3 rounded-2xl ${card.bg} ${card.color}`}>
                   <card.icon className="w-6 h-6" />
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-lg">
                   +12% <TrendingUp className="w-3 h-3" />
                </span>
             </div>
             <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
                {card.isPrice ? (
                   <PriceTag amount={card.val} className="text-3xl font-black text-gray-900 justify-end" />
                ) : (
                   <h3 className="text-3xl font-black text-gray-900">{card.val}</h3>
                )}
             </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
            <div className="flex justify-between items-center mb-8 flex-row-reverse">
               <h3 className="text-xl font-black text-gray-900">نمو الإيرادات السنوي</h3>
               <button className="text-xs font-bold text-primary flex items-center gap-1">عرض التقرير الكامل <ArrowUpRight className="w-4 h-4" /></button>
            </div>
            <div className="h-[300px]" dir="ltr">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                     <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#4B0082" stopOpacity={0.2}/>
                           <stop offset="95%" stopColor="#4B0082" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                     <XAxis dataKey="name" tick={{fontSize: 12, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                     <YAxis tick={{fontSize: 12, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                     <Tooltip 
                        contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}}
                        itemStyle={{color: '#4B0082', fontWeight: 'bold'}}
                     />
                     <Area type="monotone" dataKey="total" stroke="#4B0082" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-primary text-white rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10 text-right space-y-2">
               <h3 className="text-2xl font-black">القاعات النشطة</h3>
               <p className="text-white/80 font-medium">عدد القاعات المفعلة والمتاحة للحجز في النظام.</p>
            </div>
            <div className="relative z-10 text-center py-10">
               <span className="text-8xl font-black tracking-tighter">{stats.activeHalls}</span>
               <span className="text-xl font-bold block mt-2 text-white/60">قاعة</span>
            </div>
            <div className="relative z-10">
               <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/10 rounded-xl h-12 font-bold transition-all">
                  إدارة القاعات
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};
