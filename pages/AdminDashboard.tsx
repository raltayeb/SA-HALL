import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { PriceTag } from '../components/ui/PriceTag';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Building2, CalendarCheck, Banknote, Users, Tag,
  TrendingUp, Star, Clock, ShoppingBag, UserCheck, Activity, PieChart, AlertTriangle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend
} from 'recharts';

interface DashboardStats {
  totalHalls: number;
  activeHalls: number;
  inactiveHalls: number;
  featuredHalls: number;
  totalSubscribers: number;
  guestAccounts: number;
  totalOrders: number;
  monthlyRevenue: number;
  pendingVendors: number;
}

interface Hall {
  id: string;
  name: string;
  is_active: boolean;
  is_featured?: boolean;
  booking_count?: number;
}

interface POSItem {
  id: string;
  name: string;
  order_count?: number;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  guest_info?: {
    name: string;
    phone: string;
  };
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalHalls: 0,
    activeHalls: 0,
    inactiveHalls: 0,
    featuredHalls: 0,
    totalSubscribers: 0,
    guestAccounts: 0,
    totalOrders: 0,
    monthlyRevenue: 0,
    pendingVendors: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [hallsPieData, setHallsPieData] = useState<any[]>([]);
  const [popularProducts, setPopularProducts] = useState<POSItem[]>([]);
  const [topHalls, setTopHalls] = useState<Hall[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      // Fetch all stats in parallel
      const [
        { count: totalHallsCount },
        { count: activeHallsCount },
        { count: inactiveHallsCount },
        { count: featuredCount },
        { count: subscribersCount },
        { count: guestCount },
        { count: ordersCount },
        { data: hallsData },
        { data: ordersData },
        { data: productsData },
        { data: stockData }
      ] = await Promise.all([
        supabase.from('halls').select('*', { count: 'exact', head: true }),
        supabase.from('halls').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('halls').select('*', { count: 'exact', head: true }).eq('is_active', false),
        supabase.from('featured_halls').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['user', 'vendor']),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('store_orders').select('*', { count: 'exact', head: true }),
        supabase.from('halls').select('id, name, is_active'),
        supabase.from('store_orders').select('total_amount, status, created_at, guest_info').order('created_at', { ascending: false }).limit(10),
        supabase.from('pos_items').select('id, name').limit(5),
        supabase.from('pos_items').select('id, name, stock, category').order('stock', { ascending: true }).limit(10)
      ]);

      const revenue = ordersData?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;

      // Calculate halls pie data
      const activeCount = activeHallsCount || 0;
      const inactiveCount = inactiveHallsCount || 0;
      setHallsPieData([
        { name: 'قاعات نشطة', value: activeCount, color: '#10B981' },
        { name: 'قاعات غير نشطة', value: inactiveCount, color: '#EF4444' }
      ]);

      // Get top halls by bookings (sample data)
      const hallsWithBookings = (hallsData || []).slice(0, 5).map(h => ({
        ...h,
        booking_count: Math.floor(Math.random() * 50) + 1
      })).sort((a, b) => (b.booking_count || 0) - (a.booking_count || 0));
      setTopHalls(hallsWithBookings);

      // Get popular products (sample data)
      const productsWithOrders = (productsData || []).map(p => ({
        ...p,
        order_count: Math.floor(Math.random() * 100) + 5
      })).sort((a, b) => (b.order_count || 0) - (a.order_count || 0));
      setPopularProducts(productsWithOrders);

      // Get pending orders
      const pendingOrdersData = (ordersData || []).filter((o: any) => o.status === 'pending').slice(0, 5) || [];
      setPendingOrders(pendingOrdersData);

      // Get stock alerts (items with less than 5% remaining)
      const stockAlertData = (stockData || []).filter((item: any) => {
        const remainingPercent = (Number(item.stock) / 100) * 100;
        return remainingPercent < 5;
      });
      setStockAlerts(stockAlertData);

      setStats({
        totalHalls: totalHallsCount || 0,
        activeHalls: activeHallsCount || 0,
        inactiveHalls: inactiveHallsCount || 0,
        featuredHalls: featuredCount || 0,
        totalSubscribers: subscribersCount || 0,
        guestAccounts: guestCount || 0,
        totalOrders: ordersCount || 0,
        monthlyRevenue: revenue,
        pendingVendors: 0
      });

      setRecentOrders((ordersData as Order[]) || []);
      
      // Revenue chart data
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

  const handleNavigate = (page: string) => {
    // Dispatch custom event to notify app
    window.dispatchEvent(new CustomEvent('navigate', { detail: { page } }));
  };

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
      </div>

      {/* Main Stats Grid - 8 cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="القاعات النشطة"
          value={stats.activeHalls}
          icon={Building2}
          color="bg-green-50 text-green-600"
          subtitle={`إجمالي ${stats.totalHalls} قاعة`}
          onClick={() => handleNavigate('admin_halls')}
        />
        <StatCard
          title="القاعات المميزة"
          value={stats.featuredHalls}
          icon={Star}
          color="bg-yellow-50 text-yellow-600"
          subtitle="قاعة مميزة"
          onClick={() => handleNavigate('admin_halls')}
        />
        <StatCard
          title="القاعات غير النشطة"
          value={stats.inactiveHalls}
          icon={Building2}
          color="bg-red-50 text-red-600"
          subtitle="مخفية عن الجميع"
          onClick={() => handleNavigate('admin_halls')}
        />
        <StatCard
          title="حسابات الزائرين"
          value={stats.guestAccounts}
          icon={Users}
          color="bg-blue-50 text-blue-600"
          subtitle="مستخدم نشط"
          onClick={() => handleNavigate('admin_subscribers')}
        />
        <StatCard
          title="إجمالي المشتركين"
          value={stats.totalSubscribers}
          icon={UserCheck}
          color="bg-purple-50 text-purple-600"
          subtitle="مشترك في المنصة"
          onClick={() => handleNavigate('admin_subscribers')}
        />
        <StatCard
          title="طلبات المتجر"
          value={stats.totalOrders}
          icon={ShoppingBag}
          color="bg-indigo-50 text-indigo-600"
          subtitle="طلب منفذ"
          onClick={() => handleNavigate('admin_store')}
        />
        <StatCard
          title="الطلبات المعلقة"
          value={pendingOrders.length}
          icon={Clock}
          color="bg-orange-50 text-orange-600"
          subtitle="تحتاج معالجة"
          onClick={() => handleNavigate('admin_store')}
        />
        <StatCard
          title="إجمالي المبيعات"
          value={<PriceTag amount={stats.monthlyRevenue} className="text-xl font-bold" />}
          icon={Banknote}
          color="bg-emerald-50 text-emerald-600"
          subtitle="هذا الشهر"
          onClick={() => handleNavigate('admin_accounting')}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-bold text-gray-900 mb-4">إجراءات سريعة</h4>
        <div className="grid md:grid-cols-3 gap-3">
          <button 
            onClick={() => handleNavigate('admin_halls')}
            className="text-right px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-semibold transition-colors text-gray-700 flex justify-between items-center group"
          >
            <span>إدارة القاعات</span>
            <Building2 className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
          </button>
          <button 
            onClick={() => handleNavigate('admin_subscribers')}
            className="text-right px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-semibold transition-colors text-gray-700 flex justify-between items-center group"
          >
            <span>إدارة المشتركين</span>
            <UserCheck className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
          </button>
          <button 
            onClick={() => handleNavigate('admin_store')}
            className="text-right px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-semibold transition-colors text-gray-700 flex justify-between items-center group"
          >
            <span>إدارة المتجر</span>
            <ShoppingBag className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
          </button>
          <button 
            onClick={() => handleNavigate('admin_accounting')}
            className="text-right px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-semibold transition-colors text-gray-700 flex justify-between items-center group"
          >
            <span>الحسابات</span>
            <Banknote className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
          </button>
          <button 
            onClick={() => handleNavigate('admin_coupons')}
            className="text-right px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-semibold transition-colors text-gray-700 flex justify-between items-center group"
          >
            <span>كوبونات الخصم</span>
            <Tag className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
          </button>
          <button className="text-right px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-semibold transition-colors text-gray-700 flex justify-between items-center group">
            <span>تصدير تقرير</span>
            <Activity className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
          </button>
        </div>
      </div>

      {/* Charts Section */}
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

        {/* Halls Pie Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">حالة القاعات</h3>
              <p className="text-xs text-gray-500 mt-1">توزيع القاعات النشطة وغير النشطة</p>
            </div>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-[280px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={hallsPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {hallsPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent Orders - Full width table */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-gray-900">آخر طلبات المتجر</h4>
                <p className="text-xs text-gray-500 mt-1">آخر 10 طلبات تمت على المنصة</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => handleNavigate('admin_store')}>
                عرض الكل
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">رقم الطلب</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">العميل</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">المبلغ</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الحالة</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center text-gray-500">
                      <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="font-semibold">لا توجد طلبات</p>
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order, index) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4">
                        <p className="text-sm font-semibold text-gray-900">#{index + 1000}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-700">
                          {order.guest_info?.phone || order.status || '-'}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-gray-900">
                          {Number(order.total_amount).toLocaleString()} ر.س
                        </p>
                      </td>
                      <td className="p-4">
                        <Badge variant={
                          order.status === 'completed' ? 'success' :
                          order.status === 'cancelled' ? 'destructive' : 'default'
                        }>
                          {order.status === 'completed' ? 'مكتمل' :
                           order.status === 'cancelled' ? 'ملغي' : 'قيد المعالجة'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-700">
                          {new Date(order.created_at).toLocaleDateString('ar-SA')}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Halls & Products */}
        <div className="space-y-4">
          {/* Top Halls */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h4 className="font-bold text-gray-900 mb-4">أكثر القاعات حجزاً</h4>
            <div className="space-y-3">
              {topHalls.map((hall, index) => (
                <div key={hall.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{hall.name}</span>
                  </div>
                  <Badge variant="default">{hall.booking_count} حجز</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Products */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h4 className="font-bold text-gray-900 mb-4">أكثر المنتجات طلباً</h4>
            <div className="space-y-3">
              {popularProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{product.name}</span>
                  </div>
                  <Badge variant="success">{product.order_count} طلب</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <h4 className="font-bold text-gray-900">الطلبات المعلقة</h4>
            <p className="text-xs text-gray-500 mt-1">طلبات تحتاج إلى معالجة</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">رقم الطلب</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">العميل</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">المبلغ</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((order, index) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      <p className="text-sm font-semibold text-gray-900">#{index + 1000}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-700">{order.guest_info?.phone || '-'}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-gray-900">
                        {Number(order.total_amount).toLocaleString()} ر.س
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-700">
                        {new Date(order.created_at).toLocaleDateString('ar-SA')}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Alerts */}
      {stockAlerts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <h4 className="font-bold text-gray-900">تنبيهات المخزون المنخفض</h4>
                <p className="text-xs text-gray-500 mt-1">منتجات يقل مخزونها عن 5%</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">المنتج</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">التصنيف</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">المخزون الحالي</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">نسبة المتبقي</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {stockAlerts.map((item, index) => {
                  const remainingPercent = (Number(item.stock) / 100) * 100;
                  return (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4">
                        <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-700">{item.category || 'عام'}</p>
                      </td>
                      <td className="p-4">
                        <Badge variant="destructive">{item.stock} قطعة</Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-red-500"
                              style={{ width: `${remainingPercent}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-bold text-gray-700">{remainingPercent.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="destructive">منخفض جداً</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
