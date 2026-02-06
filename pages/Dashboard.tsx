
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, Expense, ExternalInvoice } from '../types';
import { PriceTag } from '../components/ui/PriceTag';
import { Button } from '../components/ui/Button';
import { 
  CalendarCheck, Banknote, Hourglass, Building2, 
  Loader2, CheckCircle2, XCircle, ArrowRight, TrendingUp, TrendingDown, Wallet, PieChart
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, YAxis
} from 'recharts';
import { format, subMonths, isSameMonth } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface DashboardProps {
  user: UserProfile;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState({ 
    totalIncome: 0, 
    totalExpense: 0, 
    netProfit: 0,
    pendingBookings: 0, 
    activeHalls: 0,
    confirmedBookingsCount: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const today = new Date();
      const sixMonthsAgo = subMonths(today, 5);

      // 1. Fetch All Financial Data Sources
      const [bookingsRes, expensesRes, invoicesRes, hallsRes] = await Promise.all([
        supabase.from('bookings').select('*, halls(name), profiles:user_id(full_name)').eq('vendor_id', user.id).neq('status', 'cancelled').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').eq('vendor_id', user.id),
        supabase.from('external_invoices').select('*').eq('vendor_id', user.id),
        supabase.from('halls').select('id').eq('vendor_id', user.id).eq('is_active', true)
      ]);

      const bookings = (bookingsRes.data as Booking[]) || [];
      const expenses = (expensesRes.data as Expense[]) || [];
      const invoices = (invoicesRes.data as ExternalInvoice[]) || [];

      // 2. Calculate Totals
      const bookingsIncome = bookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
      const invoicesIncome = invoices.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      
      const totalIncome = bookingsIncome + invoicesIncome;

      // 3. Prepare Chart Data (Last 6 Months)
      const monthlyData = Array.from({ length: 6 }).map((_, i) => {
        const d = subMonths(today, 5 - i);
        const monthName = format(d, 'MMM', { locale: arSA });
        
        const mBookings = bookings.filter(b => isSameMonth(new Date(b.booking_date), d));
        const mInvoices = invoices.filter(i => isSameMonth(new Date(i.created_at || ''), d));
        const mExpenses = expenses.filter(e => isSameMonth(new Date(e.expense_date), d));

        const inc = mBookings.reduce((s, b) => s + Number(b.total_amount), 0) + mInvoices.reduce((s, i) => s + Number(i.total_amount), 0);
        const exp = mExpenses.reduce((s, e) => s + Number(e.amount), 0);

        return { name: monthName, income: inc, expense: exp, profit: inc - exp };
      });

      // 4. Recent Activity (Merge Bookings & Invoices)
      const mixedActivity = [
        ...bookings.slice(0, 5).map(b => ({ ...b, type: 'booking' })),
        ...invoices.slice(0, 5).map(i => ({ ...i, type: 'invoice', created_at: i.created_at }))
      ].sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()).slice(0, 6);

      setStats({
        totalIncome,
        totalExpense: totalExpenses,
        netProfit: totalIncome - totalExpenses,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        confirmedBookingsCount: bookings.filter(b => b.status === 'confirmed').length,
        activeHalls: hallsRes.data?.length || 0
      });

      setChartData(monthlyData);
      setRecentActivity(mixedActivity);

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
      
      {/* 1. Welcome & Quick Stats */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-400 to-pink-300"></div>
        <div>
          <h2 className="text-3xl font-black text-gray-900">لوحة التحكم المركزية</h2>
          <p className="text-gray-500 mt-2 font-bold text-sm">أهلاً {user.business_name || user.full_name}، إليك ملخص لأداء أعمالك.</p>
        </div>
        <div className="flex gap-4">
           <div className="text-center px-4 border-l border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase">القاعات النشطة</p>
              <p className="text-xl font-black text-gray-900">{stats.activeHalls}</p>
           </div>
           <div className="text-center px-4">
              <p className="text-[10px] font-black text-gray-400 uppercase">حجوزات الانتظار</p>
              <p className="text-xl font-black text-orange-500">{stats.pendingBookings}</p>
           </div>
        </div>
      </div>

      {/* 2. Financial Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-lg transition-all space-y-4 group">
           <div className="flex items-center justify-between">
              <div className="p-3 bg-green-50 rounded-2xl text-green-600 group-hover:scale-110 transition-transform"><TrendingUp className="w-6 h-6" /></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">إجمالي الدخل</span>
           </div>
           <div>
             <PriceTag amount={stats.totalIncome} className="text-3xl font-black text-gray-900" />
             <p className="text-[10px] text-gray-400 font-bold mt-1">شامل الحجوزات والمبيعات الخارجية</p>
           </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-lg transition-all space-y-4 group">
           <div className="flex items-center justify-between">
              <div className="p-3 bg-red-50 rounded-2xl text-red-600 group-hover:scale-110 transition-transform"><TrendingDown className="w-6 h-6" /></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">المصروفات</span>
           </div>
           <div>
             <PriceTag amount={stats.totalExpense} className="text-3xl font-black text-gray-900" />
             <p className="text-[10px] text-gray-400 font-bold mt-1">رواتب، صيانة، وتشغيل</p>
           </div>
        </div>

        <div className="bg-primary text-white p-6 rounded-[2rem] shadow-xl shadow-primary/20 space-y-4 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
           <div className="flex items-center justify-between relative z-10">
              <div className="p-3 bg-white/20 rounded-2xl text-white backdrop-blur-md"><Wallet className="w-6 h-6" /></div>
              <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">صافي الربح</span>
           </div>
           <div className="relative z-10">
             <PriceTag amount={stats.netProfit} className="text-4xl font-black text-white" />
             <p className="text-[10px] text-white/70 font-bold mt-1">الأرباح الفعلية بعد خصم المصروفات</p>
           </div>
        </div>
      </div>

      {/* 3. Charts & Activity */}
      <div className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
               <h3 className="font-black text-xl text-gray-900 flex items-center gap-2"><PieChart className="w-5 h-5 text-primary" /> التحليل المالي</h3>
               <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500"><div className="w-2 h-2 rounded-full bg-primary"></div> دخل</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500"><div className="w-2 h-2 rounded-full bg-red-400"></div> مصروف</span>
               </div>
            </div>
            <div className="h-[300px] w-full" dir="ltr">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                     <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#4B0082" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#4B0082" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 11, fontWeight: 700}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 11, fontWeight: 700}} />
                     <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                     />
                     <Area type="monotone" dataKey="income" stroke="#4B0082" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                     <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
            <h3 className="font-black text-xl mb-6 text-gray-900">آخر العمليات</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar max-h-[350px]">
               {recentActivity.length === 0 ? (
                  <div className="text-center py-10 opacity-50">
                     <Hourglass className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                     <p className="text-gray-400 text-xs font-bold">لا توجد عمليات حديثة</p>
                  </div>
               ) : recentActivity.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 transition-colors hover:bg-gray-100">
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${item.type === 'booking' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                           {item.type === 'booking' ? <CalendarCheck className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                        </div>
                        <div>
                           <p className="text-xs font-black text-gray-900 truncate max-w-[120px]">
                              {item.type === 'booking' ? (item.profiles?.full_name || 'حجز قاعة') : (item.customer_name || 'عميل خارجي')}
                           </p>
                           <p className="text-[9px] font-bold text-gray-400">
                              {item.type === 'booking' ? 'حجز منصة' : 'فاتورة POS'}
                           </p>
                        </div>
                     </div>
                     <PriceTag amount={item.total_amount} className="text-xs font-black" />
                  </div>
               ))}
            </div>
            <Button variant="outline" className="w-full mt-6 rounded-xl font-bold border-gray-200 text-gray-600 hover:text-primary h-12" onClick={() => window.location.hash = 'accounting'}>
               الذهاب للمالية <ArrowRight className="w-4 h-4 mr-2" />
            </Button>
         </div>
      </div>
    </div>
  );
};
