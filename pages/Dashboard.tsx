
// ... existing imports ...
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking } from '../types';
import { PriceTag } from '../components/ui/PriceTag';
import { 
  CalendarCheck, Building2, Loader2, TrendingUp, Inbox, 
  Clock, CheckCircle2, ArrowUpRight, Filter
} from 'lucide-react';
import { 
  XAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, YAxis
} from 'recharts';
import { format, subMonths, isSameMonth, eachMonthOfInterval } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface DashboardProps {
  user: UserProfile;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<{id: string, name: string, type: string}[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>('all');
  
  const [stats, setStats] = useState({ 
    totalBookings: 0, 
    confirmedBookings: 0,
    pendingRequests: 0,
    totalRevenue: 0,
    paidAmount: 0,
    outstandingAmount: 0,
    activeHalls: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);

  // Fetch Assets List (Filtered to only show Halls)
  useEffect(() => {
      const fetchAssets = async () => {
          const [halls] = await Promise.all([
              supabase.from('halls').select('id, name').eq('vendor_id', user.id),
              // Removed Chalets fetch
          ]);
          const combined = [
              ...(halls.data || []).map(h => ({ ...h, type: 'hall' })),
          ];
          setAssets(combined);
      };
      fetchAssets();
  }, [user.id]);

  // ... (Rest of logic remains same, just ensuring chalets aren't in assets state)
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const today = new Date();
      
      let query = supabase
        .from('bookings')
        .select('*, halls(name), chalets(name), profiles:user_id(full_name)')
        .eq('vendor_id', user.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (selectedAsset !== 'all') {
          query = query.eq('hall_id', selectedAsset); // Simplified since only halls
      }

      const { data: bookings } = await query;
      const allBookings = (bookings as Booking[]) || [];
      
      const totalRevenue = allBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
      const paidAmount = allBookings.reduce((sum, b) => sum + (Number(b.paid_amount) || 0), 0);
      
      setStats({
        totalBookings: allBookings.length,
        confirmedBookings: allBookings.filter(b => b.status === 'confirmed').length,
        pendingRequests: allBookings.filter(b => b.status === 'pending').length,
        totalRevenue,
        paidAmount,
        outstandingAmount: totalRevenue - paidAmount,
        activeHalls: assets.length,
      });

      const months = eachMonthOfInterval({ start: subMonths(today, 5), end: today });
      const monthlyData = months.map(month => {
        const mBookings = allBookings.filter(b => isSameMonth(new Date(b.booking_date), month));
        const mRevenue = mBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
        return { 
            name: format(month, 'MMM', { locale: arSA }), 
            revenue: mRevenue,
            bookings: mBookings.length
        };
      });
      setChartData(monthlyData);
      setRecentBookings(allBookings.slice(0, 5));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.id, selectedAsset, assets.length]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="flex h-[50vh] items-center justify-center">
       <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 font-tajawal text-right">
      
      {/* 1. Overview Banner */}
      <div className="bg-white rounded-[2rem] p-8 border border-gray-200 flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="space-y-2 text-center lg:text-right w-full lg:w-auto">
          <h2 className="text-3xl font-black text-gray-900">أهلاً بك، {user.business_name || user.full_name}</h2>
          <p className="text-gray-500 font-bold text-sm">نظرة عامة على أداء منشأتك.</p>
        </div>
        
        {/* Asset Filter */}
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
            <Filter className="w-5 h-5 text-gray-400 mr-2" />
            <select 
                className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer min-w-[150px]"
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
            >
                <option value="all">كافة القاعات</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
           {/* ... existing stats cards ... */}
           <div className="bg-emerald-50 px-6 py-6 rounded-[2rem] border border-emerald-100 text-center">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">المبالغ المحصلة</p>
              <PriceTag amount={stats.paidAmount} className="text-2xl font-black text-emerald-700 justify-center" />
           </div>
           <div className="bg-orange-50 px-6 py-6 rounded-[2rem] border border-orange-100 text-center">
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">المبالغ الآجلة</p>
              <PriceTag amount={stats.outstandingAmount} className="text-2xl font-black text-orange-700 justify-center" />
           </div>
           
            <div className="bg-white px-6 py-6 rounded-[2rem] border border-gray-200 text-center">
               <div className="flex justify-center mb-2 text-blue-500"><CalendarCheck className="w-6 h-6" /></div>
               <div className="text-3xl font-black text-gray-900">{stats.totalBookings}</div>
               <p className="text-[10px] text-gray-400 font-bold mt-1">إجمالي الحجوزات</p>
            </div>

            <div className="bg-white px-6 py-6 rounded-[2rem] border border-gray-200 text-center">
               <div className="flex justify-center mb-2 text-orange-500"><Inbox className="w-6 h-6" /></div>
               <div className="text-3xl font-black text-orange-600">{stats.pendingRequests}</div>
               <p className="text-[10px] text-gray-400 font-bold mt-1">طلبات جديدة</p>
            </div>
      </div>

      {/* 3. Charts & Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-8">
         {/* Chart */}
         <div className="lg:col-span-2 bg-white border border-gray-200 rounded-[2rem] p-8">
            <div className="flex justify-between items-center mb-8">
               <h3 className="font-black text-xl text-gray-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> الأداء المالي</h3>
            </div>
            <div className="h-[300px] w-full" dir="ltr">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                     <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#4B0082" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#4B0082" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 11, fontWeight: 700}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 11, fontWeight: 700}} />
                     <Tooltip 
                        contentStyle={{borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: 'none', fontWeight: 'bold'}}
                     />
                     <Area type="monotone" dataKey="revenue" stroke="#4B0082" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Recent Bookings List */}
         <div className="bg-white border border-gray-200 rounded-[2rem] p-8 flex flex-col">
            <h3 className="font-black text-xl mb-6 text-gray-900">آخر العمليات</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar max-h-[350px]">
               {recentBookings.length === 0 ? (
                  <div className="text-center py-10 opacity-50">
                     <Clock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                     <p className="text-gray-400 text-xs font-bold">لا توجد عمليات حديثة</p>
                  </div>
               ) : recentBookings.map((b, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 transition-colors hover:bg-white hover:border-gray-200 group">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${b.status === 'confirmed' ? 'bg-green-50 text-green-600 border-green-100' : b.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                           {b.status === 'confirmed' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                           <p className="text-xs font-black text-gray-900 truncate">
                              {b.guest_name || b.profiles?.full_name || 'عميل'}
                           </p>
                           <p className="text-[10px] font-bold text-gray-400 truncate">
                              {b.halls?.name || b.chalets?.name || 'خدمة'}
                           </p>
                        </div>
                     </div>
                     <div className="text-left shrink-0">
                        <PriceTag amount={b.total_amount} className="text-sm font-black text-primary" />
                        <p className="text-[9px] font-bold text-gray-400">{format(new Date(b.booking_date), 'dd MMM')}</p>
                     </div>
                  </div>
               ))}
            </div>
            <a href="#hall_bookings" className="mt-4 text-center text-xs font-black text-primary hover:underline flex items-center justify-center gap-1">
                عرض كل الحجوزات <ArrowUpRight className="w-3 h-3" />
            </a>
         </div>
      </div>
    </div>
  );
};
