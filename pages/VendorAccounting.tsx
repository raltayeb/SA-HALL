
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, Expense, ExternalInvoice, EXPENSE_CATEGORIES } from '../types';
import { PriceTag } from '../components/ui/PriceTag';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { 
  Receipt, TrendingUp, TrendingDown, ArrowUpRight, 
  Wallet, Plus, Trash2, Filter, 
  BarChart3, FileText, CheckCircle2, Clock, Loader2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useToast } from '../context/ToastContext';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';

interface VendorAccountingProps {
  user: UserProfile;
}

export const VendorAccounting: React.FC<VendorAccountingProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'invoices'>('overview');
  
  // Data State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [externalInvoices, setExternalInvoices] = useState<ExternalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Date Filter State
  const [dateFilter, setDateFilter] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  
  // Forms
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ expense_date: new Date().toISOString().split('T')[0], category: 'other' });
  const [newInvoice, setNewInvoice] = useState({ customer_name: '', total_amount: 0, items_desc: '' });

  const { toast } = useToast();

  // --- 1. Robust Data Fetching ---
  const fetchData = useCallback(async () => {
    try {
        const [bData, eData, iData] = await Promise.all([
            supabase.from('bookings').select('*, halls(name)').eq('vendor_id', user.id).neq('status', 'cancelled'),
            supabase.from('expenses').select('*').eq('vendor_id', user.id).order('expense_date', { ascending: false }),
            supabase.from('external_invoices').select('*').eq('vendor_id', user.id).order('created_at', { ascending: false })
        ]);

        if (bData.data) setBookings(bData.data as Booking[]);
        if (eData.data) setExpenses(eData.data as Expense[]);
        if (iData.data) setExternalInvoices(iData.data as ExternalInvoice[]);
    } catch (err) {
        console.error("Fetch Error:", err);
    } finally {
        setLoading(false);
    }
  }, [user.id]);

  // --- 2. Realtime Subscription (Optimized) ---
  useEffect(() => {
    fetchData();

    // Listen to changes and update local state incrementally to avoid full reload flickering
    const channel = supabase.channel('accounting_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'expenses', filter: `vendor_id=eq.${user.id}` }, (payload) => {
          setExpenses(prev => [payload.new as Expense, ...prev]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'expenses', filter: `vendor_id=eq.${user.id}` }, (payload) => {
          setExpenses(prev => prev.filter(e => e.id !== payload.old.id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'external_invoices', filter: `vendor_id=eq.${user.id}` }, (payload) => {
          setExternalInvoices(prev => [payload.new as ExternalInvoice, ...prev]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'external_invoices', filter: `vendor_id=eq.${user.id}` }, (payload) => {
          setExternalInvoices(prev => prev.filter(i => i.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, user.id]);

  // --- 3. Strict Date Filtering Logic ---
  const filteredData = useMemo(() => {
    const startDate = startOfDay(new Date(dateFilter.start));
    const endDate = endOfDay(new Date(dateFilter.end));

    const checkDate = (dateStr: string) => {
        if (!dateStr) return false;
        const d = parseISO(dateStr); 
        return isWithinInterval(d, { start: startDate, end: endDate });
    };

    return {
        fBookings: bookings.filter(b => checkDate(b.booking_date)),
        fExpenses: expenses.filter(e => checkDate(e.expense_date)),
        fInvoices: externalInvoices.filter(i => checkDate(i.created_at?.split('T')[0] || ''))
    };
  }, [bookings, expenses, externalInvoices, dateFilter]);

  // --- 4. Analytics Calculations & Chart Data ---
  const stats = useMemo(() => {
    const { fBookings, fExpenses, fInvoices } = filteredData;

    const bookingRevenue = fBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
    const invoiceRevenue = fInvoices.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
    const totalRevenue = bookingRevenue + invoiceRevenue;
    
    const totalExpenses = fExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    const collectedBooking = fBookings.reduce((sum, b) => sum + (Number(b.paid_amount) || 0), 0);
    const collectedInvoice = fInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
    const totalCollected = collectedBooking + collectedInvoice;

    return { totalRevenue, totalExpenses, netProfit, totalCollected };
  }, [filteredData]);

  // Generate Daily Data for Charts
  const chartData = useMemo(() => {
    const start = parseISO(dateFilter.start);
    const end = parseISO(dateFilter.end);
    
    // Prevent huge loops if dates are invalid
    if (start > end) return [];

    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        
        const dayIncome = 
            bookings.filter(b => b.booking_date === dayStr).reduce((s, b) => s + (Number(b.total_amount)||0), 0) +
            externalInvoices.filter(i => i.created_at?.startsWith(dayStr)).reduce((s, i) => s + (Number(i.total_amount)||0), 0);
            
        const dayExpense = expenses.filter(e => e.expense_date === dayStr).reduce((s, e) => s + (Number(e.amount)||0), 0);

        return {
            name: format(day, 'dd MMM', { locale: arSA }),
            income: dayIncome,
            expense: dayExpense,
            profit: dayIncome - dayExpense
        };
    });
  }, [bookings, expenses, externalInvoices, dateFilter]);

  // --- 5. Handlers ---

  const handleAddExpense = async () => {
      if (!newExpense.title || !newExpense.amount) {
          toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال العنوان والمبلغ.', variant: 'destructive' });
          return;
      }
      setProcessing(true);
      const { error } = await supabase.from('expenses').insert([{ ...newExpense, vendor_id: user.id }]);
      setProcessing(false);
      
      if (!error) {
          toast({ title: 'تم الحفظ', variant: 'success' });
          setIsExpenseModalOpen(false);
          setNewExpense({ expense_date: new Date().toISOString().split('T')[0], category: 'other' });
      } else {
          toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      }
  };

  const handleAddInvoice = async () => {
      if (!newInvoice.customer_name || !newInvoice.total_amount) {
          toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال اسم العميل والمبلغ.', variant: 'destructive' });
          return;
      }
      setProcessing(true);
      const vat = newInvoice.total_amount * 0.15; 
      const { error } = await supabase.from('external_invoices').insert([{
          vendor_id: user.id,
          customer_name: newInvoice.customer_name,
          total_amount: newInvoice.total_amount,
          vat_amount: vat,
          items: [{ description: newInvoice.items_desc, total: newInvoice.total_amount }],
          status: 'unpaid'
      }]);
      setProcessing(false);

      if (!error) {
          toast({ title: 'تم إنشاء الفاتورة', variant: 'success' });
          setIsInvoiceModalOpen(false);
          setNewInvoice({ customer_name: '', total_amount: 0, items_desc: '' });
      } else {
          toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      }
  };

  const handleDelete = async (table: 'expenses' | 'external_invoices', id: string) => {
      if(!confirm('هل أنت متأكد من الحذف؟')) return;
      const { error } = await supabase.from(table).delete().eq('id', id);
      if(error) {
          toast({ title: 'خطأ', description: 'لم يتم الحذف، حاول مرة أخرى.', variant: 'destructive' });
      }
  };

  if (loading) return <div className="flex justify-center items-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
      
      {/* 1. Header & Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
             <Receipt className="w-8 h-8" /> النظام المحاسبي
          </h2>
          <p className="text-muted-foreground mt-1 font-bold text-sm">متابعة دقيقة للأداء المالي، الإيرادات، والمصروفات.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
            <div className="flex items-center bg-gray-50 p-2 rounded-2xl border border-gray-200">
                <Filter className="w-5 h-5 text-gray-400 mr-2" />
                <input 
                    type="date" 
                    value={dateFilter.start} 
                    onChange={e => setDateFilter({...dateFilter, start: e.target.value})}
                    className="bg-transparent border-none text-xs font-bold focus:ring-0 outline-none w-32 cursor-pointer text-gray-600"
                />
                <span className="text-gray-400 mx-2 font-bold">إلى</span>
                <input 
                    type="date" 
                    value={dateFilter.end} 
                    onChange={e => setDateFilter({...dateFilter, end: e.target.value})}
                    className="bg-transparent border-none text-xs font-bold focus:ring-0 outline-none w-32 cursor-pointer text-gray-600"
                />
            </div>
            
            <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                {['overview', 'expenses', 'invoices'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)} 
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        {tab === 'overview' ? 'نظرة عامة' : tab === 'expenses' ? 'المصروفات' : 'الفواتير'}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {activeTab === 'overview' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2">
            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm group hover:border-green-200 transition-all relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><TrendingUp className="w-6 h-6" /></div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">إجمالي الإيرادات</span>
                    </div>
                    <PriceTag amount={stats.totalRevenue} className="text-3xl font-bold text-gray-900 relative z-10" />
                    <p className="text-[10px] text-green-600 font-bold mt-1">السيولة المحصلة: {stats.totalCollected.toLocaleString()} ر.س</p>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm group hover:border-red-200 transition-all relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><TrendingDown className="w-6 h-6" /></div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">المصروفات</span>
                    </div>
                    <PriceTag amount={stats.totalExpenses} className="text-3xl font-bold text-red-600 relative z-10" />
                </div>

                <div className="bg-primary text-white p-6 rounded-[2.5rem] shadow-xl shadow-primary/20 relative overflow-hidden col-span-1 md:col-span-2">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="flex justify-between items-center relative z-10 h-full">
                        <div>
                            <p className="text-primary-foreground/80 font-bold text-sm mb-2 uppercase tracking-widest">صافي الربح (Net Profit)</p>
                            <PriceTag amount={stats.netProfit} className="text-5xl font-black text-white" iconSize={24} />
                        </div>
                        <div className="bg-white/20 backdrop-blur-md p-4 rounded-3xl">
                            <Wallet className="w-10 h-10 text-white" />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Logic-Corrected Chart */}
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="font-bold text-xl mb-8 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> التدفق النقدي اليومي</h3>
                    <div className="h-[300px]" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4B0082" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#4B0082" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#9CA3AF', fontWeight: 700}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 10, fill: '#9CA3AF', fontWeight: 700}} axisLine={false} tickLine={false} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)'}} />
                                <Area type="monotone" dataKey="income" stroke="#4B0082" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} name="الإيرادات" />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} name="المصروفات" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
                        <h3 className="font-bold text-sm text-gray-400 uppercase tracking-widest mb-4">إجراءات سريعة</h3>
                        <div className="space-y-3">
                            <button onClick={() => setIsExpenseModalOpen(true)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors">
                                <span>تسجيل مصروف</span>
                                <Plus className="w-5 h-5" />
                            </button>
                            <button onClick={() => setIsInvoiceModalOpen(true)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-green-50 text-green-600 font-bold hover:bg-green-100 transition-colors">
                                <span>فاتورة خارجية</span>
                                <FileText className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Mini Ledger */}
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-[260px]">
                        <h3 className="font-bold text-sm text-gray-400 uppercase tracking-widest mb-4">أحدث العمليات</h3>
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                            {filteredData.fBookings.slice(0, 3).map(b => (
                                <div key={b.id} className="flex justify-between items-center text-xs font-bold border-b border-gray-50 pb-2">
                                    <span className="text-green-600">+{b.paid_amount || 0}</span>
                                    <span className="text-gray-500">حجز {b.halls?.name}</span>
                                </div>
                            ))}
                            {filteredData.fExpenses.slice(0, 3).map(e => (
                                <div key={e.id} className="flex justify-between items-center text-xs font-bold border-b border-gray-50 pb-2">
                                    <span className="text-red-500">-{e.amount}</span>
                                    <span className="text-gray-500">{e.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
          </div>
      )}

      {activeTab === 'expenses' && (
          <div className="space-y-6 animate-in slide-in-from-left-4">
              <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xl text-gray-800">سجل المصروفات التفصيلي</h3>
                  <Button onClick={() => setIsExpenseModalOpen(true)} className="rounded-xl h-11 gap-2 font-bold shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> تسجيل مصروف</Button>
              </div>
              <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                  <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50/50 text-gray-500 font-bold text-xs uppercase tracking-widest sticky top-0">
                            <tr>
                                <th className="p-6">البند / الوصف</th>
                                <th className="p-6">التصنيف</th>
                                <th className="p-6">المبلغ</th>
                                <th className="p-6">التاريخ</th>
                                <th className="p-6">ملاحظات</th>
                                <th className="p-6 text-center">حذف</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredData.fExpenses.length === 0 ? <tr><td colSpan={6} className="p-12 text-center font-bold text-gray-400">لا توجد مصروفات في هذه الفترة</td></tr> : 
                            filteredData.fExpenses.map(e => (
                                <tr key={e.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="p-6 font-bold text-gray-900">{e.title}</td>
                                    <td className="p-6"><span className="bg-gray-100 px-3 py-1 rounded-lg text-xs font-bold text-gray-600">{e.category}</span></td>
                                    <td className="p-6"><PriceTag amount={e.amount} className="text-red-500 font-bold" /></td>
                                    <td className="p-6 text-gray-500 font-mono text-xs font-bold">{e.expense_date}</td>
                                    <td className="p-6 text-gray-400 text-xs">{e.notes || '-'}</td>
                                    <td className="p-6 text-center">
                                        <button onClick={() => handleDelete('expenses', e.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'invoices' && (
          <div className="space-y-6 animate-in slide-in-from-left-4">
              <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xl text-gray-800">فواتير الإيرادات الخارجية</h3>
                  <Button onClick={() => setIsInvoiceModalOpen(true)} className="rounded-xl h-11 gap-2 font-bold shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> فاتورة جديدة</Button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                  {filteredData.fInvoices.map(inv => (
                      <div key={inv.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col gap-4 group hover:border-primary/30 transition-all">
                          <div className="flex justify-between items-start">
                              <div>
                                  <h4 className="font-bold text-lg text-gray-900">{inv.customer_name}</h4>
                                  <p className="text-xs text-gray-400 font-mono font-bold mt-1">#{inv.id.slice(0,8)}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 ${inv.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                                  {inv.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                  {inv.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة'}
                              </span>
                          </div>
                          
                          <div className="bg-gray-50 p-3 rounded-xl">
                             {inv.items?.map((item: any, idx: number) => (
                                 <div key={idx} className="flex justify-between text-xs font-bold text-gray-600">
                                     <span>{item.description}</span>
                                     <span>{item.total}</span>
                                 </div>
                             ))}
                          </div>

                          <div className="flex justify-between items-end border-t border-gray-100 pt-4 mt-auto">
                              <div className="text-xs text-gray-400 font-bold">
                                  {new Date(inv.created_at || '').toLocaleDateString('ar-SA')}
                              </div>
                              <div className="flex items-center gap-4">
                                  <button onClick={() => handleDelete('external_invoices', inv.id)} className="text-red-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                  <PriceTag amount={inv.total_amount} className="text-xl font-bold text-primary" />
                              </div>
                          </div>
                      </div>
                  ))}
                  {filteredData.fInvoices.length === 0 && <div className="col-span-full py-20 text-center font-bold text-gray-400 border-2 border-dashed rounded-[2.5rem] opacity-60">لا توجد فواتير خارجية في هذه الفترة</div>}
              </div>
          </div>
      )}

      {/* Modals */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="تسجيل مصروف جديد">
          <div className="space-y-4 text-right">
              <Input label="عنوان المصروف" value={newExpense.title || ''} onChange={e => setNewExpense({...newExpense, title: e.target.value})} className="h-12 rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                  <Input label="المبلغ" type="number" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} className="h-12 rounded-xl" />
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500">التصنيف</label>
                      <select className="w-full h-12 border rounded-xl px-3 bg-white font-bold text-sm" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as any})}>
                          {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                  </div>
              </div>
              <Input label="ملاحظات" value={newExpense.notes || ''} onChange={e => setNewExpense({...newExpense, notes: e.target.value})} className="h-12 rounded-xl" />
              <Button onClick={handleAddExpense} disabled={processing} className="w-full h-12 rounded-xl font-bold mt-2 shadow-lg shadow-primary/20">
                  {processing ? <Loader2 className="animate-spin w-5 h-5" /> : 'حفظ المصروف'}
              </Button>
          </div>
      </Modal>

      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title="إنشاء فاتورة إيراد">
          <div className="space-y-4 text-right">
              <Input label="اسم العميل / الجهة" value={newInvoice.customer_name} onChange={e => setNewInvoice({...newInvoice, customer_name: e.target.value})} className="h-12 rounded-xl" />
              <Input label="وصف الخدمة / المنتج" value={newInvoice.items_desc} onChange={e => setNewInvoice({...newInvoice, items_desc: e.target.value})} className="h-12 rounded-xl" />
              <Input label="المبلغ الإجمالي (شامل الضريبة)" type="number" value={newInvoice.total_amount || ''} onChange={e => setNewInvoice({...newInvoice, total_amount: Number(e.target.value)})} className="h-12 rounded-xl" />
              <Button onClick={handleAddInvoice} disabled={processing} className="w-full h-12 rounded-xl font-bold mt-2 shadow-lg shadow-primary/20">
                  {processing ? <Loader2 className="animate-spin w-5 h-5" /> : 'إصدار الفاتورة'}
              </Button>
          </div>
      </Modal>
    </div>
  );
};
