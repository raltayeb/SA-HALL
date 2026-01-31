
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Subscription, UserProfile } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PriceTag } from '../components/ui/PriceTag';
import { ShieldCheck, Search, Clock, Plus, Filter, UserCog } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const VendorSubscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const fetchSubscriptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, profiles:vendor_id(full_name, business_name, email)')
      .order('end_date', { ascending: true });

    if (!error && data) {
      setSubscriptions(data as any[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="success">نشط</Badge>;
      case 'expired': return <Badge variant="destructive">منتهي</Badge>;
      case 'trial': return <Badge variant="warning">تجريبي</Badge>;
      default: return <Badge>غير معروف</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'enterprise': return <Badge className="bg-purple-500 text-white border-none">المؤسسات</Badge>;
      case 'pro': return <Badge className="bg-primary text-white border-none">الاحترافية</Badge>;
      default: return <Badge variant="outline">الأساسية</Badge>;
    }
  };

  const filtered = subscriptions.filter(s => 
    s.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.profiles?.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            إدارة اشتراكات البائعين
          </h2>
          <p className="text-sm text-muted-foreground">متابعة باقات البائعين وحالات الدفع النشطة.</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> إضافة باقة مخصصة
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="بحث باسم البائع أو النشاط..." 
            className="bg-transparent border-none focus:outline-none text-sm w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon"><Filter className="w-4 h-4" /></Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-4 font-medium">البائع / النشاط التجاري</th>
                <th className="p-4 font-medium">نوع الباقة</th>
                <th className="p-4 font-medium">الحالة</th>
                <th className="p-4 font-medium">تاريخ الانتهاء</th>
                <th className="p-4 font-medium">إجمالي المدفوع</th>
                <th className="p-4 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center animate-pulse">جاري جلب البيانات...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-20 text-center text-muted-foreground">لا توجد اشتراكات مسجلة</td></tr>
              ) : (
                filtered.map(sub => (
                  <tr key={sub.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4">
                      <div className="font-bold">{sub.profiles?.business_name || 'نشاط غير مسمى'}</div>
                      <div className="text-[10px] text-muted-foreground">{sub.profiles?.full_name}</div>
                    </td>
                    <td className="p-4">{getPlanBadge(sub.plan_type)}</td>
                    <td className="p-4">{getStatusBadge(sub.status)}</td>
                    <td className="p-4 flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(sub.end_date).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="p-4"><PriceTag amount={sub.amount_paid} className="text-sm" /></td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm" className="h-8 gap-1">
                        <UserCog className="w-3.5 h-3.5" /> إدارة
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
