import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { PriceTag } from '../components/ui/PriceTag';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Building2, CalendarCheck, Banknote, Users, Tag,
  TrendingUp, ArrowRight, Clock, ShoppingBag, Store
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface DashboardStats {
  totalHalls: number;
  totalSubscribers: number;
  totalOrders: number;
  monthlyRevenue: number;
  pendingSubscribers: number;
  activeCoupons: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalHalls: 0,
    totalSubscribers: 0,
    totalOrders: 0,
    monthlyRevenue: 0,
    pendingSubscribers: 0,
    activeCoupons: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      const [
        { count: hallsCount },
        { count: subscribersCount },
        { count: pendingCount },
        { count: ordersCount, data: ordersData },
        { count: couponsCount },
        { data: revenueData }
      ] = await Promise.all([
        supabase.from('halls').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['user', 'vendor']),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('store_orders').select('total_amount, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.rpc('get_monthly_revenue')
      ]);

      const revenue = ordersData?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;

      setStats({
        totalHalls: hallsCount || 0,
        totalSubscribers: subscribersCount || 0,
        totalOrders: ordersCount || 0,
        monthlyRevenue: revenue,
        pendingSubscribers: pendingCount || 0,
        activeCoupons: couponsCount || 0
      });

      setRecentOrders(ordersData || []);
      
      // Sample revenue chart data
      setRevenueData([
        { name: 'السبت', revenue: 4500, orders: 12 },
        { name: 'الأحد', revenue: 5200, orders: 15 },
        { name: 'الاثنين', revenue: 4800, orders: 11 },
        { name: 'الثلاثاء', revenue: 6100, orders: 18 },
        { name: 'الأربعاء', revenue: 5800, orders: 16 },
        { name: 'الخميس', revenue: 7200, orders: 22 },
        { name: 'الجمعة', revenue: 8500, orders: 28 }
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle, onClick }: any) => (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">لوحة القيادة</h2>
          <p className="text-sm text-gray-500 mt-1">نظرة عامة على المنصة</p>
        </div>
        <Button onClick={fetchDashboardData} className="text-sm">
          تحديث
        </Button>
      </div>

      {/* Main Stats - Focus on what matters */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="القاعات النشطة"
          value={stats.totalHalls}
          icon={Building2}
          color="bg-blue-50 text-blue-600"
          subtitle="قاعة مسجلة"
          onClick={() => window.location.href = '#admin_halls'}
        />
        <StatCard
          title="إجمالي المشتركين"
          value={stats.totalSubscribers}
          icon={Users}
          color="bg-purple-50 text-purple-600"
          subtitle={`${stats.pendingSubscribers} قيد المراجعة`}
          onClick={() => window.location.href = '#admin_subscribers'}
        />
        <StatCard
          title="طلبات المتجر"
          value={stats.totalOrders}
          icon={ShoppingBag}
          color="bg-green-50 text-green-600"
          subtitle="طلب منفذ"
          onClick={() => window.location.href = '#admin_store'}
        />
      </div>

      {/* Revenue Section */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue Card */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-white/80 mb-1">إجمالي المبيعات</p>
              <h3 className="text-3xl font-bold">
                <PriceTag amount={stats.monthlyRevenue} className="text-white" />
              </h3>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <Banknote className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span className="font-semibold">+12.5%</span>
            <span className="text-white/70">من الأسبوع الماضي</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-bold text-gray-900 mb-4">إجراءات سريعة</h4>
          <div className="grid md:grid-cols-3 gap-3">
            <button 
              onClick={() => window.location.href = '#admin_halls'}
              className="text-right px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-semibold transition-colors text-gray-700 flex justify-between items-center group"
            >
              <span>إدارة القاعات</span>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
            </button>
            <button 
              onClick={() => window.location.href = '#admin_subscribers'}
              className="text-right px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-semibold transition-colors text-gray-700 flex justify-between items-center group"
            >
              <span>إدارة المشتركين</span>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
            </button>
            <button 
              onClick={() => window.location.href = '#admin_store'}
              className="text-right px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-semibold transition-colors text-gray-700 flex justify-between items-center group"
            >
              <span>إدارة المتجر</span>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
            </button>
            <button 
              onClick={() => window.location.href = '#admin_accounting'}
              className="text-right px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-semibold transition-colors text-gray-700 flex justify-between items-center group"
            >
              <span>الحسابات</span>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
            </button>
            <button 
              onClick={() => window.location.href = '#admin_coupons'}
              className="text-right px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-semibold transition-colors text-gray-700 flex justify-between items-center group"
            >
              <span>كوبونات الخصم</span>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
            </button>
            <button className="text-right px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-semibold transition-colors text-gray-700 flex justify-between items-center group">
              <span>تصدير تقرير</span>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* Charts & Recent Orders */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">المبيعات الأسبوعية</h3>
              <p className="text-xs text-gray-500 mt-1">آخر 7 أيام</p>
            </div>
          </div>
          <div className="h-[280px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4B0082" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4B0082" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{fontSize: 11, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 11, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  itemStyle={{color: '#4B0082', fontWeight: 600}}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4B0082" strokeWidth={2} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-gray-900">آخر طلبات المتجر</h4>
                <p className="text-xs text-gray-500 mt-1">أحدث 5 طلبات</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs">عرض الكل</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">رقم الطلب</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">التاريخ</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">المبلغ</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <p className="text-sm font-semibold text-gray-900">#{index + 1000}</p>
                    </td>
                    <td className="p-3">
                      <p className="text-sm text-gray-700">
                        {new Date(order.created_at).toLocaleDateString('ar-SA')}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="text-sm font-bold text-gray-900">
                        {Number(order.total_amount).toLocaleString()} ر.س
                      </p>
                    </td>
                    <td className="p-3">
                      <Badge variant="success">مكتمل</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
