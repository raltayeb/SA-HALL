
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, VAT_RATE, Hall } from '../types';
import { PriceTag } from '../components/ui/PriceTag';
import { Button } from '../components/ui/Button';
import { CalendarCheck, Banknote, Hourglass, Landmark, TrendingUp, Users, Building2, LayoutDashboard, ChevronDown, Loader2 } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

interface DashboardProps {
  user: UserProfile;
}

const getMonthName = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-SA', { month: 'short' }).format(date);
  } catch (e) { return 'غير معروف'; }
};

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState({ totalBookings: 0, totalRevenue: 0, pendingBookings: 0, avgBookingValue: 0, zatcaTax: 0 });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [selectedHallId, setSelectedHallId] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Halls for selector
      if (user.role === 'vendor') {
        const { data: hData } = await supabase.from('halls').select('*').eq('vendor_id', user.id);
        setHalls(hData || []);
      }

      // 2. Fetch Bookings
      let query = supabase.from('bookings').select('*, halls(*)');
      if (user.role === 'vendor') {
        query = query.eq('vendor_id', user.id);
        if (selectedHallId !== 'all') query = query.eq('hall_id', selectedHallId);
      } else if (user.role === 'user') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const bookings = (data as Booking[] || []).filter(Boolean);
      const total = bookings.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
      
      setStats({
        totalBookings: bookings.length,
        totalRevenue: total,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        avgBookingValue: bookings.length > 0 ? total / bookings.length : 0,
        zatcaTax: total * (VAT_RATE / (1 + VAT_RATE))
      });

      // Prepare Charts
      const revenueMap = new Map<string, number>();
      bookings.forEach(b => {
        if (b.status !== 'cancelled' && b.booking_date) {
          const month = getMonthName(b.booking_date);
          revenueMap.set(month, (revenueMap.get(month) || 0) + (Number(b.total_amount) || 0));
        }
      });
      setRevenueData(Array.from(revenueMap, ([name, total]) => ({ name, total })));

      const statusCount = { pending: 0, confirmed: 0, cancelled: 0 };
      bookings.forEach(b => { if(b.status && (statusCount as any)[b.status] !== undefined) (statusCount as any)[b.status]++; });
      setStatusData([
        { name: 'قيد الانتظار', value: statusCount.pending, color: '#D4AF37' },
        { name: 'مؤكد', value: statusCount.confirmed, color: '#4B0082' },
        { name: 'ملغي', value: statusCount.cancelled, color: '#ef4444' },
      ].filter(i => i.value > 0));

    } catch (error) {
      console.error(error);
    } finally { setLoading(false); }
  }, [user, selectedHallId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-6">
        <div className="text-right">
          <h2 className="text-4xl font-ruqaa text-primary">لوحة التحكم</h2>
          <p className="text-sm text-muted-foreground mt-1">مرحباً {user.full_name}، إليك ملخص نشاطك.</p>
        </div>

        {/* Hall Context Selector for Vendors */}
        {user.role === 'vendor' && halls.length > 0 && (
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm ml-auto md:ml-0">
             <span className="text-[10px] font-black uppercase text-gray-400 pr-3 border-r mr-2">عرض بيانات</span>
             <select 
              className="bg-transparent border-none text-sm font-black focus:ring-0 outline-none min-w-[150px] text-right appearance-none cursor-pointer"
              value={selectedHallId}
              onChange={e => setSelectedHallId(e.target.value)}
             >
               <option value="all">كافة القاعات</option>
               {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
             </select>
             <Building2 className="w-5 h-5 text-primary ml-2" />
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'إجمالي الحجوزات', val: stats.totalBookings, icon: CalendarCheck },
          { label: 'صافي الإيرادات', val: stats.totalRevenue, icon: Banknote, isPrice: true },
          { label: 'بانتظار التأكيد', val: stats.pendingBookings, icon: Hourglass },
          { label: 'الضريبة المستحقة', val: stats.zatcaTax, icon: Landmark, isPrice: true }
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm text-right hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <div className="bg-primary/5 p-3 rounded-2xl text-primary"><item.icon className="w-5 h-5" /></div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">{item.label}</h3>
            </div>
            {item.isPrice ? (
               <PriceTag amount={item.val} className="text-3xl justify-end" iconSize={24} />
            ) : (
               <div className="text-4xl font-black tracking-tighter text-gray-900">{item.val}</div>
            )}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="h-[400px] flex items-center justify-center bg-white rounded-[2.5rem] border border-gray-100">
           <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10 flex flex-col">
              <h3 className="text-xl font-black mb-10 text-right">تحليل الإيرادات</h3>
              <div className="h-[300px] w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                          <defs>
                              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#4B0082" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#4B0082" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                          <XAxis dataKey="name" tick={{fill: '#999', fontSize: 11, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fill: '#999', fontSize: 11}} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}} />
                          <Area type="monotone" dataKey="total" stroke="#4B0082" strokeWidth={4} fill="url(#colorTotal)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10 flex flex-col items-center">
              <h3 className="text-xl font-black mb-8 w-full text-right">توزيع الحالات</h3>
              <div className="h-[250px] w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={statusData} innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                              {statusData.map((entry, idx) => <Cell key={idx} fill={entry.color} strokeWidth={0} />)}
                          </Pie>
                          <Tooltip />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 gap-3 w-full mt-6">
                 {statusData.map(s => (
                   <div key={s.name} className="flex items-center justify-between flex-row-reverse text-xs font-bold">
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: s.color}}></div>
                        <span>{s.name}</span>
                      </div>
                      <span className="text-gray-400">{s.value}</span>
                   </div>
                 ))}
              </div>
          </div>
        </div>
      )}
    </div>
  );
};
