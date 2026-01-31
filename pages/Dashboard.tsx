import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, VAT_RATE } from '../types';
import { formatCurrency } from '../utils/currency';

interface DashboardProps {
  user: UserProfile;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    pendingBookings: 0,
    zatcaTax: 0
  });
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

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">إجمالي الحجوزات</h3>
            <span className="text-2xl">📅</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalBookings}</div>
          <p className="text-xs text-muted-foreground mt-1">حجوزات مسجلة في النظام</p>
        </div>

        {(user.role === 'vendor' || user.role === 'super_admin') && (
          <div className="rounded-xl border bg-card text-card-foreground p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">الإيرادات</h3>
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">شاملة ضريبة القيمة المضافة</p>
          </div>
        )}

        <div className="rounded-xl border bg-card text-card-foreground p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">قيد الانتظار</h3>
            <span className="text-2xl">⏳</span>
          </div>
          <div className="text-2xl font-bold">{stats.pendingBookings}</div>
          <p className="text-xs text-muted-foreground mt-1">طلبات تحتاج إلى تأكيد</p>
        </div>

        {(user.role === 'vendor' || user.role === 'super_admin') && (
          <div className="rounded-xl border bg-card text-card-foreground p-6 bg-primary/5 border-primary/20">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-primary">استحقاق الزكاة/الضريبة</h3>
              <span className="text-2xl">🏛️</span>
            </div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.zatcaTax)}</div>
            <p className="text-xs text-muted-foreground mt-1">تقدير ضريبة القيمة المضافة (15%)</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card text-card-foreground">
        <div className="p-6 flex flex-col space-y-1.5">
          <h3 className="font-semibold leading-none tracking-tight">نظرة عامة</h3>
          <p className="text-sm text-muted-foreground">مرحباً بك، {user.full_name}.</p>
        </div>
        <div className="p-6 pt-0">
          <div className="h-[200px] w-full flex items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/20">
            <p className="text-muted-foreground text-sm">مساحة الرسوم البيانية (قريباً)</p>
          </div>
        </div>
      </div>
    </div>
  );
};