
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, VAT_RATE } from '../types';
import { PriceTag } from '../components/ui/PriceTag';
import { Button } from '../components/ui/Button';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { 
  Receipt, TrendingUp, Download, Calendar, ArrowUpRight, 
  CreditCard, Wallet, AlertCircle, CheckCircle2, FileText,
  PieChart, ArrowDownLeft
} from 'lucide-react';
import { format } from 'date-fns';

interface VendorAccountingProps {
  user: UserProfile;
}

export const VendorAccounting: React.FC<VendorAccountingProps> = ({ user }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Booking | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Financial Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalVAT: 0,
    platformFees: 0,
    netProfit: 0,
    pendingPayouts: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data } = await supabase
        .from('bookings')
        .select('*, halls(name), profiles:user_id(full_name)')
        .eq('vendor_id', user.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (data) {
        const _bookings = data as Booking[];
        setBookings(_bookings);

        // Calculate Stats
        const totalRev = _bookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
        const totalVat = totalRev * (VAT_RATE / (1 + VAT_RATE)); 
        const commissionRate = 0.10; // Default 10%
        const platformFees = (totalRev - totalVat) * commissionRate;
        const netProfit = totalRev - totalVat - platformFees;
        
        const pending = _bookings
            .filter(b => b.payment_status === 'paid' && b.status === 'completed') 
            .reduce((sum, b) => sum + (Number(b.paid_amount) || 0), 0);

        setStats({
          totalRevenue: totalRev,
          totalVAT: totalVat,
          platformFees: platformFees,
          netProfit: netProfit,
          pendingPayouts: pending * 0.9 
        });
      }
      setLoading(false);
    };

    fetchData();
  }, [user.id]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-border/50">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
             <Receipt className="w-6 h-6 text-primary" /> الفواتير والحسابات
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-bold opacity-80">متابعة الأداء المالي، الفواتير الضريبية، ومستحقاتك المالية.</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="gap-2 h-12 rounded-xl border-border font-bold">
              <Download className="w-4 h-4" /> تصدير التقرير
           </Button>
           <Button className="gap-2 h-12 rounded-xl bg-primary text-white font-bold shadow-none">
              <Wallet className="w-4 h-4" /> طلب سحب رصيد
           </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-[2rem] border border-border/60 space-y-3 relative overflow-hidden group hover:border-primary/30 transition-all">
           <div className="flex items-center justify-between">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">إجمالي الإيرادات</span>
              <div className="p-2.5 bg-primary/5 rounded-xl text-primary group-hover:scale-110 transition-transform"><TrendingUp className="w-5 h-5" /></div>
           </div>
           <PriceTag amount={stats.totalRevenue} className="text-3xl font-black text-foreground" />
           <p className="text-[10px] text-muted-foreground font-bold bg-gray-50 w-fit px-2 py-1 rounded-lg">شامل الضريبة</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-border/60 space-y-3 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
           <div className="flex items-center justify-between">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">صافي الأرباح</span>
              <div className="p-2.5 bg-emerald-500/5 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform"><Wallet className="w-5 h-5" /></div>
           </div>
           <PriceTag amount={stats.netProfit} className="text-3xl font-black text-emerald-600" />
           <p className="text-[10px] text-muted-foreground font-bold bg-emerald-50 text-emerald-700 w-fit px-2 py-1 rounded-lg">الأرباح الفعلية</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-border/60 space-y-3 relative overflow-hidden group hover:border-orange-500/30 transition-all">
           <div className="flex items-center justify-between">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">ضريبة القيمة المضافة</span>
              <div className="p-2.5 bg-orange-500/5 rounded-xl text-orange-600 group-hover:scale-110 transition-transform"><PieChart className="w-5 h-5" /></div>
           </div>
           <PriceTag amount={stats.totalVAT} className="text-3xl font-black text-orange-600" />
           <p className="text-[10px] text-muted-foreground font-bold bg-orange-50 text-orange-700 w-fit px-2 py-1 rounded-lg">مستحقة للدولة</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-border/60 space-y-3 relative overflow-hidden group hover:border-blue-500/30 transition-all">
           <div className="flex items-center justify-between">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">عمولة المنصة</span>
              <div className="p-2.5 bg-blue-500/5 rounded-xl text-blue-600 group-hover:scale-110 transition-transform"><CreditCard className="w-5 h-5" /></div>
           </div>
           <PriceTag amount={stats.platformFees} className="text-3xl font-black text-blue-600" />
           <p className="text-[10px] text-muted-foreground font-bold bg-blue-50 text-blue-700 w-fit px-2 py-1 rounded-lg">رسوم الخدمة (10%)</p>
        </div>
      </div>

      {/* Transactions / Invoices Table */}
      <div className="bg-white border border-border/60 rounded-[2.5rem] overflow-hidden">
         <div className="p-8 border-b border-border/60 flex items-center justify-between">
            <h3 className="font-black text-lg flex items-center gap-3 text-foreground">
               <FileText className="w-5 h-5 text-primary" /> سجل الفواتير والعمليات
            </h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
               <thead className="bg-gray-50/50 text-muted-foreground font-black uppercase text-[10px] tracking-wider">
                  <tr>
                     <th className="p-6">رقم الفاتورة</th>
                     <th className="p-6">التاريخ</th>
                     <th className="p-6">العميل</th>
                     <th className="p-6">القيمة الإجمالية</th>
                     <th className="p-6">حالة الدفع</th>
                     <th className="p-6 text-center">الإجراءات</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border/60">
                  {loading ? (
                     <tr><td colSpan={6} className="p-10 text-center animate-pulse font-bold text-gray-400">جاري تحميل البيانات...</td></tr>
                  ) : bookings.length === 0 ? (
                     <tr><td colSpan={6} className="p-16 text-center text-muted-foreground font-bold">لا توجد عمليات مالية مسجلة.</td></tr>
                  ) : bookings.map((b) => (
                     <tr key={b.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="p-6 font-mono font-bold text-primary">#{b.id.slice(0, 8).toUpperCase()}</td>
                        <td className="p-6 font-bold text-gray-600">{format(new Date(b.created_at || b.booking_date), 'dd/MM/yyyy')}</td>
                        <td className="p-6 font-bold text-foreground">{b.profiles?.full_name || 'عميل خارجي'}</td>
                        <td className="p-6"><PriceTag amount={b.total_amount} className="font-black text-foreground" /></td>
                        <td className="p-6">
                           <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${
                              b.payment_status === 'paid' ? 'bg-green-500/10 text-green-600' :
                              b.payment_status === 'partial' ? 'bg-yellow-500/10 text-yellow-600' :
                              'bg-red-500/10 text-red-600'
                           }`}>
                              {b.payment_status === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                              {b.payment_status === 'paid' ? 'مدفوع' : b.payment_status === 'partial' ? 'جزئي' : 'غير مدفوع'}
                           </span>
                        </td>
                        <td className="p-6 text-center">
                           <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => { setSelectedInvoice(b); setIsInvoiceOpen(true); }}
                              className="text-primary hover:text-primary hover:bg-primary/5 h-9 px-4 rounded-xl gap-2 font-bold"
                           >
                              عرض <ArrowUpRight className="w-4 h-4" />
                           </Button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {selectedInvoice && (
         <InvoiceModal 
            isOpen={isInvoiceOpen} 
            onClose={() => setIsInvoiceOpen(false)} 
            booking={selectedInvoice} 
         />
      )}
    </div>
  );
};
