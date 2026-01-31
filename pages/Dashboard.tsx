import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, VAT_RATE } from '../types';
import { formatCurrency } from '../utils/currency';
import { CalendarCheck, Banknote, Hourglass, Landmark, TrendingUp } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';

interface DashboardProps {
  user: UserProfile;
}

// Helper to get Arabic Month Name
const getMonthName = (dateStr: string) => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ar-SA', { month: 'short' }).format(date);
};

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    pendingBookings: 0,
    zatcaTax: 0
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        let query = supabase.from('bookings').select('*');

        if (user.role === 'vendor') {
          query = query.eq('vendor_id', user.id);
        } else if (user.role === 'user') {
          query = query.eq('user_id', user.id);
        }
        // Super admin sees all

        const { data, error } = await query;

        if (error) throw error;

        const bookings = data as Booking[] || [];
        const total = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        
        setStats({
          totalBookings: bookings.length,
          totalRevenue: total,
          pendingBookings: bookings.filter(b => b.status === 'pending').length,
          zatcaTax: total * (VAT_RATE / (1 + VAT_RATE)) // Extract VAT from total inclusive
        });

        // Process Chart Data (Only needed for Admin/Vendor)
        if (user.role !== 'user') {
            // 1. Revenue per Month
            const revenueMap = new Map<string, number>();
            bookings.forEach(b => {
                const month = getMonthName(b.booking_date);
                revenueMap.set(month, (revenueMap.get(month) || 0) + b.total_amount);
            });
            const revData = Array.from(revenueMap, ([name, total]) => ({ name, total }));
            setRevenueData(revData);

            // 2. Status Distribution
            const statusCount = { pending: 0, confirmed: 0, cancelled: 0 };
            bookings.forEach(b => {
                if(statusCount[b.status] !== undefined) statusCount[b.status]++;
            });
            setStatusData([
                { name: 'قيد الانتظار', value: statusCount.pending, color: 'oklch(0.702 0.183 293.541)' }, // Ring color
                { name: 'مؤكد', value: statusCount.confirmed, color: 'oklch(0.541 0.281 293.009)' }, // Primary
                { name: 'ملغي', value: statusCount.cancelled, color: 'oklch(0.577 0.245 27.325)' }, // Destructive
            ].filter(i => i.value > 0));
        }

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) return <div className="p-8">جاري التحميل...</div>;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border p-2 rounded-lg shadow-sm text-sm">
          <p className="font-bold mb-1">{label}</p>
          <p className="text-primary">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">إجمالي الحجوزات</h3>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{stats.totalBookings}</div>
          <p className="text-xs text-muted-foreground mt-1">حجوزات مسجلة في النظام</p>
        </div>

        {(user.role === 'vendor' || user.role === 'super_admin') && (
          <div className="rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">الإيرادات</h3>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">شاملة ضريبة القيمة المضافة</p>
          </div>
        )}

        <div className="rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">قيد الانتظار</h3>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{stats.pendingBookings}</div>
          <p className="text-xs text-muted-foreground mt-1">طلبات تحتاج إلى تأكيد</p>
        </div>

        {(user.role === 'vendor' || user.role === 'super_admin') && (
          <div className="rounded-xl border bg-card text-card-foreground p-6 bg-primary/5 border-primary/20 shadow-sm">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-primary">استحقاق الزكاة/الضريبة</h3>
              <Landmark className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.zatcaTax)}</div>
            <p className="text-xs text-muted-foreground mt-1">تقدير ضريبة القيمة المضافة (15%)</p>
          </div>
        )}
      </div>

      {(user.role === 'super_admin' || user.role === 'vendor') && (
        <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        الإيرادات الشهرية
                    </h3>
                </div>
                <div className="h-[300px] w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis 
                                dataKey="name" 
                                tickLine={false} 
                                axisLine={false} 
                                tick={{fill: 'var(--muted-foreground)', fontSize: 12}} 
                                dy={10}
                            />
                            <YAxis 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(val) => `SAR ${val/1000}k`} 
                                tick={{fill: 'var(--muted-foreground)', fontSize: 12}} 
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'var(--muted)'}} />
                            <Bar 
                                dataKey="total" 
                                fill="var(--primary)" 
                                radius={[4, 4, 0, 0]} 
                                barSize={40}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold leading-none tracking-tight">توزيع حالات الحجز</h3>
                </div>
                <div className="h-[300px] w-full flex justify-center items-center" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--card)" strokeWidth={2} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

      {user.role === 'user' && (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
            <h3 className="font-semibold leading-none tracking-tight mb-2">مرحباً بك في SA Hall</h3>
            <p className="text-sm text-muted-foreground">استمتع بتجربة حجز قاعات سهلة وموثوقة.</p>
            </div>
        </div>
      )}
    </div>
  );
};