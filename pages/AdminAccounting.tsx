import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { PriceTag } from '../components/ui/PriceTag';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import {
  Banknote, ShoppingBag, Tag, Calendar, Download, Search,
  TrendingUp, TrendingDown, DollarSign, CreditCard
} from 'lucide-react';

interface Subscription {
  id: string;
  vendor_id: string;
  plan_name: string;
  amount: number;
  status: string;
  payment_type: string; // 'lifetime' or 'subscription'
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  customer_email?: string;
}

interface Revenue {
  date: string;
  amount: number;
  type: string;
  description: string;
}

export const AdminAccounting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'orders' | 'revenue'>('subscriptions');
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalSubscriptions: 0,
    totalOrders: 0,
    pendingRevenue: 0
  });

  useEffect(() => {
    fetchAccountingData();
  }, [activeTab]);

  const fetchAccountingData = async () => {
    setLoading(true);

    try {
      const [subsData, ordersData] = await Promise.all([
        supabase.from('vendor_subscriptions').select(`
          *,
          profiles (full_name, email)
        `).order('created_at', { ascending: false }),
        supabase.from('store_orders').select('*').order('created_at', { ascending: false })
      ]);

      setSubscriptions(subsData.data || []);
      setOrders(ordersData.data || []);

      // Calculate summary
      const totalSubs = subsData.data?.reduce((sum, s) => sum + (Number(s.amount) || 0), 0) || 0;
      const totalOrders = ordersData.data?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;

      setSummary({
        totalRevenue: totalSubs + totalOrders,
        totalSubscriptions: subsData.data?.length || 0,
        totalOrders: ordersData.data?.length || 0,
        pendingRevenue: subsData.data?.filter(s => s.status === 'pending').reduce((sum, s) => sum + (Number(s.amount) || 0), 0) || 0
      });

      // Generate revenue data
      const revenueData = [
        ...(subsData.data || []).map((s: any) => ({
          date: s.created_at,
          amount: Number(s.amount),
          type: 'subscription',
          description: `اشتراك - ${s.profiles?.full_name || 'غير معروف'}`
        })),
        ...(ordersData.data || []).map((o: any) => ({
          date: o.created_at,
          amount: Number(o.total_amount),
          type: 'order',
          description: `طلب متجر #${o.id.substring(0, 8)}`
        }))
      ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRevenue(revenueData);
    } catch (error) {
      console.error('Error fetching accounting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    if (!searchQuery) return true;
    return sub.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           sub.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    return order.customer_email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${
            trend > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
          }`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">الحسابات</h2>
          <p className="text-sm text-gray-500 mt-1">إدارة الاشتراكات والطلبات والإيرادات</p>
        </div>
        <Button variant="outline" className="gap-2 text-sm">
          <Download className="w-4 h-4" />
          تصدير تقرير
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الإيرادات"
          value={<PriceTag amount={summary.totalRevenue} className="text-xl font-bold" />}
          icon={Banknote}
          color="bg-green-50 text-green-600"
          trend={15.2}
        />
        <StatCard
          title="الاشتراكات"
          value={summary.totalSubscriptions}
          icon={Tag}
          color="bg-blue-50 text-blue-600"
          trend={8.5}
        />
        <StatCard
          title="طلبات المتجر"
          value={summary.totalOrders}
          icon={ShoppingBag}
          color="bg-purple-50 text-purple-600"
          trend={-2.3}
        />
        <StatCard
          title="معلق التحصيل"
          value={<PriceTag amount={summary.pendingRevenue} className="text-xl font-bold" />}
          icon={Calendar}
          color="bg-yellow-50 text-yellow-600"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'subscriptions'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                الاشتراكات
              </div>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'orders'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                طلبات المتجر
              </div>
            </button>
            <button
              onClick={() => setActiveTab('revenue')}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'revenue'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                الإيرادات
              </div>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={
                  activeTab === 'subscriptions' ? 'البحث بالاسم أو البريد...' :
                  activeTab === 'orders' ? 'البحث بالبريد...' :
                  'البحث...'
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none"
            >
              <option value="all">كل التواريخ</option>
              <option value="today">اليوم</option>
              <option value="week">هذا الأسبوع</option>
              <option value="month">هذا الشهر</option>
              <option value="year">هذه السنة</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">جاري التحميل...</p>
            </div>
          ) : activeTab === 'subscriptions' ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">المشترك</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الباقة</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">المبلغ</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">نوع الدفع</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">التاريخ</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center text-gray-500">
                      <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="font-semibold">لا توجد اشتراكات</p>
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {sub.profiles?.full_name || 'غير معروف'}
                          </p>
                          <p className="text-xs text-gray-500">{sub.profiles?.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-semibold text-gray-700">{sub.plan_name}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-gray-900">
                          {Number(sub.amount).toLocaleString()} ر.س
                        </p>
                      </td>
                      <td className="p-4">
                        <Badge variant={sub.payment_type === 'lifetime' ? 'success' : 'default'}>
                          {sub.payment_type === 'lifetime' ? 'مدى الحياة' : 'اشتراك شهري'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-700">
                          {new Date(sub.created_at).toLocaleDateString('ar-SA')}
                        </p>
                      </td>
                      <td className="p-4">
                        <Badge variant={
                          sub.status === 'active' ? 'success' :
                          sub.status === 'expired' ? 'destructive' : 'default'
                        }>
                          {sub.status === 'active' ? 'نشط' :
                           sub.status === 'expired' ? 'منتهي' : 'معلق'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'orders' ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">رقم الطلب</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">العميل</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">المبلغ</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">التاريخ</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center text-gray-500">
                      <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="font-semibold">لا توجد طلبات</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4">
                        <p className="text-sm font-semibold text-gray-900">#{index + 1000}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-700">{order.customer_email || '-'}</p>
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
                      <td className="p-4">
                        <Badge variant={
                          order.status === 'completed' ? 'success' :
                          order.status === 'cancelled' ? 'destructive' : 'default'
                        }>
                          {order.status === 'completed' ? 'مكتمل' :
                           order.status === 'cancelled' ? 'ملغي' : 'قيد المعالجة'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">التاريخ</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">النوع</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">الوصف</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {revenue.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-20 text-center text-gray-500">
                      <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="font-semibold">لا توجد إيرادات</p>
                    </td>
                  </tr>
                ) : (
                  revenue.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4">
                        <p className="text-sm text-gray-700">
                          {new Date(item.date).toLocaleDateString('ar-SA')}
                        </p>
                      </td>
                      <td className="p-4">
                        <Badge variant={item.type === 'subscription' ? 'default' : 'success'}>
                          {item.type === 'subscription' ? 'اشتراك' : 'طلب متجر'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-700">{item.description}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-gray-900">
                          {item.amount.toLocaleString()} ر.س
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
