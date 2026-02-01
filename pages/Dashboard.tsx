
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, VAT_RATE, Hall } from '../types';
import { PriceTag } from '../components/ui/PriceTag';
import { Button } from '../components/ui/Button';
import { CalendarCheck, Banknote, Hourglass, Landmark, TrendingUp, Users, Building2, ArrowUpRight, ArrowDownRight, Award, Loader2 } from 'lucide-react';
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
  } catch (e) {
    return 'غير معروف';
  }
};

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    pendingBookings: 0,
    avgBookingValue: 0,
    zatcaTax: 0
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [topHalls, setTopHalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const fetchStats = async () => {
      try {
        setLoading(true);
        let query = supabase.from('bookings').select('*, halls(*)');

        if (user.role === 'vendor') {
          query = query.eq('vendor_id', user.id);
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

        if (user.role !== 'user') {
            const revenueMap = new Map<string, number>();
            bookings.forEach(b => {
                if (b.status !== 'cancelled' && b.booking_date) {
                    const month = getMonthName(b.booking_date);
                    revenueMap.set(month, (revenueMap.get(month) || 0) + (Number(b.total_amount) || 0));
                }
            });
            const revData = Array.from(revenueMap, ([name, total]) => ({ name, total }));
            setRevenueData(revData);

            const hallMap = new Map<string, { name: string, total: number, count: number }>();
            bookings.forEach(b => {
                if (b.status === 'confirmed' && b.halls) {
                    const h = hallMap.get(b.halls.id) || { name: b.halls.name, total: 0, count: 0 };
                    h.total += (Number(b.total_amount) || 0);
                    h.count += 1;
                    hallMap.set(b.halls.id, h);
                }
            });
            const top = Array.from(hallMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);
            setTopHalls(top);

            const statusCount = { pending: 0, confirmed: 0, cancelled: 0 };
            bookings.forEach(b => { 
                if(b.status && (statusCount as any)[b.status] !== undefined) (statusCount as any)[b.status]++; 
            });
            setStatusData([
                { name: 'قيد الانتظار', value: statusCount.pending, color: '#D4AF37' },
                { name: 'مؤكد', value: statusCount.confirmed, color: '#4B0082' },
                { name: 'ملغي', value: statusCount.cancelled, color: '#ef4444' },
            ].filter(i => i.value > 0));
        }

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
        clearTimeout(timer);
      }
    };

    fetchStats();
    return () => clearTimeout(timer);
  }, [user]);

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="font-bold text-muted-foreground animate-pulse text-right">جاري تحليل البيانات...</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-4">
        <div className="text-right">
          <h2 className="text-3xl font-black text-primary tracking-tighter">مرحباً، {user.full_name} 👋</h2>
          <p className="text-sm text-muted-foreground mt-1">إليك ملخص أداء {user.role === 'vendor' ? 'قاعاتك' : 'نشاطك'} اليوم.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'إجمالي الحجوزات', val: stats.totalBookings, icon: CalendarCheck, color: 'primary' },
          { label: 'صافي الإيرادات', val: stats.totalRevenue, icon: Banknote, color: 'primary', isPrice: true },
          { label: 'قيد الانتظار', val: stats.pendingBookings, icon: Hourglass, color: 'gold' },
          { label: 'تقدير الضريبة', val: stats.zatcaTax, icon: Landmark, color: 'primary', isPrice: true }
        ].map((item, i) => (
          <div key={i} className="rounded-[1.125rem] border bg-card p-6 shadow-sm hover:shadow-md transition-all text-right">
            <div className="flex items-center justify-between mb-4 flex-row-reverse">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</h3>
              <div className="bg-muted p-2 rounded-lg text-primary"><item.icon className="w-4 h-4" /></div>
            </div>
            {item.isPrice ? (
               <PriceTag amount={item.val} className="text-2xl justify-end" iconSize={20} />
            ) : (
               <div className="text-3xl font-black tracking-tighter">{item.val}</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-[1.125rem] border bg-card shadow-sm p-8 flex flex-col">
              <h3 className="text-lg font-black tracking-tight mb-8 text-right">اتجاه الإيرادات</h3>
              <div className="h-[300px] w-full mt-auto" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                          <defs>
                              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#4B0082" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#4B0082" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                          <XAxis dataKey="name" tick={{fill: '#888', fontSize: 10}} dy={10} axisLine={false} tickLine={false} />
                          <YAxis tick={{fill: '#888', fontSize: 10}} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)'}} />
                          <Area type="monotone" dataKey="total" stroke="#4B0082" strokeWidth={3} fill="url(#colorTotal)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="rounded-[1.125rem] border bg-card shadow-sm p-8">
              <h3 className="text-lg font-black mb-6 text-right">حالات الحجز</h3>
              <div className="h-[250px]" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {statusData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>
    </div>
  );
};
