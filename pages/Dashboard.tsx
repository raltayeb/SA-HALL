
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
    // Safety timeout to ensure loading doesn't persist if fetch hangs
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
            // Chart Data Processing
            const revenueMap = new Map<string, number>();
            bookings.forEach(b => {
                if (b.status !== 'cancelled' && b.booking_date) {
                    const month = getMonthName(b.booking_date);
                    revenueMap.set(month, (revenueMap.get(month) || 0) + (Number(b.total_amount) || 0));
                }
            });
            const revData = Array.from(revenueMap, ([name, total]) => ({ name, total }));
            setRevenueData(revData);

            // Hall Ranking
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

            // Status Distribution
            const statusCount = { pending: 0, confirmed: 0, cancelled: 0 };
            bookings.forEach(b => { 
                if(b.status && (statusCount as any)[b.status] !== undefined) (statusCount as any)[b.status]++; 
            });
            setStatusData([
                { name: 'قيد الانتظار', value: statusCount.pending, color: 'oklch(0.702 0.183 293.541)' },
                { name: 'مؤكد', value: statusCount.confirmed, color: 'oklch(0.541 0.281 293.009)' },
                { name: 'ملغي', value: statusCount.cancelled, color: 'oklch(0.577 0.245 27.325)' },
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
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-4">
        <div className="text-right">
          <h2 className="text-4xl font-black text-primary tracking-tighter">مرحباً، {user.full_name} 👋</h2>
          <p className="text-muted-foreground mt-1">إليك ملخص أداء {user.role === 'vendor' ? 'قاعاتك' : 'نشاطك'} اليوم.</p>
        </div>
        <div className="bg-primary/5 px-4 py-2 rounded-2xl flex items-center gap-3 border border-primary/10 flex-row-reverse">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
            <Award className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">مستوى الأداء</p>
            <p className="text-sm font-black text-primary">بائع مميز (PRO)</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="group rounded-[2rem] border bg-card p-8 shadow-sm hover:shadow-xl transition-all relative overflow-hidden text-right">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-colors"></div>
          <div className="flex items-center justify-between mb-4 flex-row-reverse">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">إجمالي الحجوزات</h3>
            <div className="bg-primary/10 p-2 rounded-xl text-primary"><CalendarCheck className="w-5 h-5" /></div>
          </div>
          <div className="text-4xl font-black tracking-tighter">{stats.totalBookings}</div>
          <div className="mt-4 flex items-center justify-end gap-2 text-xs font-bold text-green-600">
            12% نمو هذا الشهر <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {(user.role === 'vendor' || user.role === 'super_admin') && (
          <div className="group rounded-[2rem] border bg-card p-8 shadow-sm hover:shadow-xl transition-all relative overflow-hidden text-right">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
            <div className="flex items-center justify-between mb-4 flex-row-reverse">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">صافي الإيرادات</h3>
              <div className="bg-primary/10 p-2 rounded-xl text-primary"><Banknote className="w-5 h-5" /></div>
            </div>
            <PriceTag amount={stats.totalRevenue} className="text-3xl justify-end" iconSize={24} />
            <div className="mt-4 flex items-center justify-end gap-2 text-xs font-bold text-muted-foreground">
              متوسط الفاتورة: {Math.round(stats.avgBookingValue)} ر.س
            </div>
          </div>
        )}

        <div className="group rounded-[2rem] border bg-card p-8 shadow-sm hover:shadow-xl transition-all relative overflow-hidden text-right">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
          <div className="flex items-center justify-between mb-4 flex-row-reverse">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">قيد الانتظار</h3>
            <div className="bg-yellow-500/10 p-2 rounded-xl text-yellow-600"><Hourglass className="w-5 h-5" /></div>
          </div>
          <div className="text-4xl font-black tracking-tighter">{stats.pendingBookings}</div>
          <p className="mt-4 text-[10px] text-muted-foreground font-bold">يرجى مراجعة الطلبات المعلقة فوراً</p>
        </div>

        {(user.role === 'vendor' || user.role === 'super_admin') && (
          <div className="group rounded-[2rem] border bg-primary/5 border-primary/20 p-8 shadow-sm hover:shadow-xl transition-all relative overflow-hidden text-right">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
            <div className="flex items-center justify-between mb-4 flex-row-reverse">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary/70">تقدير الضريبة</h3>
              <div className="bg-primary/20 p-2 rounded-xl text-primary"><Landmark className="w-5 h-5" /></div>
            </div>
            <PriceTag amount={stats.zatcaTax} className="text-3xl text-primary justify-end" iconSize={24} />
            <p className="mt-4 text-[10px] text-primary/60 font-bold uppercase tracking-widest">مستحقات هيئة الزكاة (VAT)</p>
          </div>
        )}
      </div>

      {(user.role === 'super_admin' || user.role === 'vendor') && (
        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-[2.5rem] border bg-card shadow-sm p-8 flex flex-col">
                <div className="flex items-center justify-between mb-8 flex-row-reverse">
                    <div className="text-right">
                        <h3 className="text-xl font-black tracking-tight flex items-center justify-end gap-2">
                            اتجاه الإيرادات الشهرية
                            <TrendingUp className="w-5 h-5 text-primary" />
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">تطور دخل المنصة بناءً على الحجوزات المؤكدة.</p>
                    </div>
                </div>
                <div className="h-[350px] w-full mt-auto" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                            <XAxis 
                                dataKey="name" 
                                tickLine={false} 
                                axisLine={false} 
                                tick={{fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 700}} 
                                dy={10}
                            />
                            <YAxis 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(val) => `${val/1000}k`} 
                                tick={{fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 700}} 
                            />
                            <Tooltip 
                                contentStyle={{backgroundColor: 'var(--card)', borderRadius: '1rem', border: '1px solid var(--border)', fontSize: '12px'}}
                                cursor={{stroke: 'var(--primary)', strokeWidth: 1}}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="total" 
                                stroke="var(--primary)" 
                                strokeWidth={4} 
                                fillOpacity={1} 
                                fill="url(#colorTotal)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="space-y-8">
                <div className="rounded-[2.5rem] border bg-card shadow-sm p-8 flex flex-col h-full">
                    <h3 className="text-xl font-black tracking-tight mb-6 text-right">توزيع حالات الحجز</h3>
                    <div className="h-[250px] w-full flex justify-center items-center" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-3 rounded-[2.5rem] border bg-card shadow-sm p-8">
                <div className="flex items-center justify-between mb-6 flex-row-reverse">
                    <div className="text-right">
                        <h3 className="text-xl font-black tracking-tight">أفضل القاعات أداءً</h3>
                        <p className="text-xs text-muted-foreground mt-1">ترتيب القاعات بناءً على إجمالي الإيرادات المؤكدة.</p>
                    </div>
                    <Button variant="ghost" size="sm" className="font-bold gap-2">تصدير التقرير <ArrowDownRight className="w-4 h-4" /></Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-muted/50 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                      <tr>
                        <th className="p-4 rounded-r-2xl text-right">القاعة</th>
                        <th className="p-4 text-right">عدد الحجوزات</th>
                        <th className="p-4 text-right">نسبة الإشغال</th>
                        <th className="p-4 rounded-l-2xl text-left">إجمالي الإيرادات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {topHalls.map((hall, idx) => (
                        <tr key={idx} className="hover:bg-muted/10 transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-3 flex-row-reverse">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary group-hover:bg-primary group-hover:text-white transition-colors">{idx + 1}</div>
                              <span className="font-black text-sm">{hall.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm font-bold">{hall.count} حجز</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 flex-row-reverse">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{width: `${Math.min(100, (hall.count / 30) * 100)}%`}}></div>
                              </div>
                              <span className="text-[10px] font-black text-muted-foreground">{Math.round((hall.count / 30) * 100)}%</span>
                            </div>
                          </td>
                          <td className="p-4 font-black text-primary text-left">
                            <PriceTag amount={hall.total} />
                          </td>
                        </tr>
                      ))}
                      {topHalls.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-muted-foreground italic">لا توجد بيانات كافية للتحليل حالياً.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
