
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, Expense, ExternalInvoice, EXPENSE_CATEGORIES, Hall, VendorClient } from '../types';
import { PriceTag } from '../components/ui/PriceTag';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PaymentHistoryModal } from '../components/Booking/PaymentHistoryModal';
import { 
  Receipt, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  Wallet, Plus, Trash2, Filter, Building2,
  CheckCircle2, Clock, Loader2, Calendar, Search, ArrowDown, ExternalLink, Printer, Download, User
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '../context/ToastContext';

interface VendorAccountingProps {
  user: UserProfile;
}

// Helper type for the unified ledger
interface LedgerItem {
  id: string;
  type: 'income_booking' | 'income_invoice' | 'expense';
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'unpaid';
  category?: string;
  referenceId?: string; // e.g. Booking ID
  data?: any; // Full object
}

export const VendorAccounting: React.FC<VendorAccountingProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'expenses' | 'invoices'>('ledger');
  
  // Data State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [externalInvoices, setExternalInvoices] = useState<ExternalInvoice[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [clients, setClients] = useState<VendorClient[]>([]); // New Clients Data
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Filters
  const [dateFilter, setDateFilter] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHallId, setSelectedHallId] = useState<string>('all');

  // Refs for Date Pickers
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<LedgerItem | null>(null);
  
  // Forms
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ expense_date: new Date().toISOString().split('T')[0], category: 'other' });
  const [newInvoice, setNewInvoice] = useState({ 
      client_id: '', 
      hall_id: '', 
      total_amount: 0, 
      items_desc: '' 
  });

  const { toast } = useToast();

  // --- 1. Fetching & Realtime ---
  const fetchData = useCallback(async () => {
    try {
        const [bData, eData, iData, hData, cData] = await Promise.all([
            supabase.from('bookings').select('*, halls(name), client:user_id(full_name)').eq('vendor_id', user.id).neq('status', 'cancelled'),
            supabase.from('expenses').select('*').eq('vendor_id', user.id).order('expense_date', { ascending: false }),
            supabase.from('external_invoices').select('*, clients:client_id(full_name), halls:hall_id(name)').eq('vendor_id', user.id).order('created_at', { ascending: false }),
            supabase.from('halls').select('*').eq('vendor_id', user.id),
            supabase.from('vendor_clients').select('*').eq('vendor_id', user.id)
        ]);

        if (bData.data) setBookings(bData.data as any[]);
        if (eData.data) setExpenses(eData.data as Expense[]);
        if (iData.data) setExternalInvoices(iData.data as any[]);
        if (hData.data) setHalls(hData.data as Hall[]);
        if (cData.data) setClients(cData.data as VendorClient[]);
    } catch (err) {
        console.error("Fetch Error:", err);
    } finally {
        setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('accounting_unified')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `vendor_id=eq.${user.id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'external_invoices', filter: `vendor_id=eq.${user.id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `vendor_id=eq.${user.id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_clients', filter: `vendor_id=eq.${user.id}` }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, user.id]);

  // --- 2. Unified Ledger Logic with Hall Filter ---
  const ledgerData = useMemo<LedgerItem[]>(() => {
    const startDate = startOfDay(new Date(dateFilter.start));
    const endDate = endOfDay(new Date(dateFilter.end));

    const checkDate = (dateStr: string) => {
        if (!dateStr) return false;
        const d = parseISO(dateStr); 
        return isWithinInterval(d, { start: startDate, end: endDate });
    };

    const items: LedgerItem[] = [];

    // 1. Bookings -> Income (Filtered by Hall)
    bookings.forEach(b => {
        if (selectedHallId !== 'all' && b.hall_id !== selectedHallId) return;
        if (checkDate(b.booking_date)) {
            items.push({
                id: b.id,
                type: 'income_booking',
                date: b.booking_date,
                description: `حجز: ${b.halls?.name || 'قاعة'} - ${b.client?.full_name || b.guest_name || 'عميل'}`,
                amount: b.total_amount,
                status: b.payment_status === 'paid' ? 'paid' : b.payment_status === 'partial' ? 'pending' : 'unpaid',
                category: 'حجوزات',
                referenceId: b.id,
                data: b
            });
        }
    });

    // 2. External Invoices -> Income
    externalInvoices.forEach(inv => {
        if (selectedHallId !== 'all' && inv.hall_id && inv.hall_id !== selectedHallId) return;
        
        const date = inv.created_at?.split('T')[0] || '';
        if (checkDate(date)) {
            items.push({
                id: inv.id,
                type: 'income_invoice',
                date: date,
                description: `فاتورة: ${inv.clients?.full_name || inv.customer_name}`,
                amount: inv.total_amount,
                status: inv.status === 'paid' ? 'paid' : 'unpaid',
                category: 'خدمات خارجية',
                referenceId: inv.id,
                data: inv
            });
        }
    });

    // 3. Expenses -> Expense
    if (selectedHallId === 'all') { // Expenses usually general unless tagged (future improvement)
        expenses.forEach(exp => {
            if (checkDate(exp.expense_date)) {
                items.push({
                    id: exp.id,
                    type: 'expense',
                    date: exp.expense_date,
                    description: exp.title,
                    amount: exp.amount,
                    status: 'paid', // Expenses are usually paid out
                    category: exp.category,
                    referenceId: exp.id,
                    data: exp
                });
            }
        });
    }

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [bookings, expenses, externalInvoices, dateFilter, selectedHallId]);

  // --- 3. Financial Calculations ---
  const financials = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let receivedCash = 0;
    let pendingCash = 0;

    ledgerData.forEach(item => {
        if (item.type === 'expense') {
            totalExpense += Number(item.amount);
        } else {
            totalIncome += Number(item.amount);
            
            if (item.type === 'income_booking' && item.data?.paid_amount !== undefined) {
                receivedCash += Number(item.data.paid_amount);
                pendingCash += Math.max(0, Number(item.amount) - Number(item.data.paid_amount));
            } else {
                if (item.status === 'paid') receivedCash += Number(item.amount);
                else pendingCash += Number(item.amount);
            }
        }
    });

    return { totalIncome, totalExpense, netProfit: totalIncome - totalExpense, receivedCash, pendingCash, cashFlow: receivedCash - totalExpense };
  }, [ledgerData]);

  // --- Handlers ---
  const handleDelete = async (table: 'expenses' | 'external_invoices', id: string) => {
      if(!confirm('هل أنت متأكد من الحذف؟')) return;
      await supabase.from(table).delete().eq('id', id);
      toast({ title: 'تم الحذف', variant: 'success' });
  };

  const handleSaveExpense = async () => {
      if (!newExpense.title || !newExpense.amount) return;
      setProcessing(true);
      const { error } = await supabase.from('expenses').insert([{ ...newExpense, vendor_id: user.id }]);
      setProcessing(false);
      if (!error) {
          toast({ title: 'تم تسجيل المصروف', variant: 'success' });
          setIsExpenseModalOpen(false);
          setNewExpense({ expense_date: new Date().toISOString().split('T')[0], category: 'other' });
      }
  };

  const handleSaveInvoice = async () => {
      if (!newInvoice.client_id || !newInvoice.total_amount) return;
      setProcessing(true);
      
      const clientName = clients.find(c => c.id === newInvoice.client_id)?.full_name || 'عميل';
      const vat = newInvoice.total_amount * 0.15; 
      
      const { error } = await supabase.from('external_invoices').insert([{
          vendor_id: user.id,
          customer_name: clientName, // Fallback/Legacy
          client_id: newInvoice.client_id,
          hall_id: newInvoice.hall_id || null,
          total_amount: newInvoice.total_amount,
          vat_amount: vat,
          items: [{ description: newInvoice.items_desc, total: newInvoice.total_amount }],
          status: 'unpaid'
      }]);
      setProcessing(false);
      if (!error) {
          toast({ title: 'تم إصدار الفاتورة', variant: 'success' });
          setIsInvoiceModalOpen(false);
          setNewInvoice({ client_id: '', hall_id: '', total_amount: 0, items_desc: '' });
      }
  };

  if (loading) return <div className="flex justify-center items-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans text-right">
      
      {/* 1. Top Control Bar */}
      <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
         <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="bg-primary/5 p-3 rounded-2xl text-primary"><Receipt className="w-6 h-6" /></div>
            <div>
               <h2 className="text-xl font-black text-gray-900">النظام المالي الموحد</h2>
               <div className="flex items-center gap-2 mt-1">
                   <p className="text-xs font-bold text-gray-400">تصفية حسب القاعة:</p>
                   <select 
                        className="bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold px-2 py-1 outline-none cursor-pointer min-w-[120px]"
                        value={selectedHallId}
                        onChange={(e) => setSelectedHallId(e.target.value)}
                   >
                        <option value="all">كافة القاعات</option>
                        {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                   </select>
               </div>
            </div>
         </div>

         {/* Date Filters */}
         <div className="flex items-center gap-3 w-full lg:w-auto bg-gray-50 p-2 rounded-2xl border border-gray-200">
            <button onClick={() => startDateRef.current?.showPicker()} className="p-2 bg-primary text-white rounded-xl shadow-sm"><Calendar className="w-5 h-5" /></button>
            <div className="flex items-center gap-2">
               <input ref={startDateRef} type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} className="bg-transparent text-xs font-black outline-none w-auto cursor-pointer text-gray-700" onClick={(e) => e.currentTarget.showPicker()}/>
               <span className="text-gray-400">-</span>
               <input ref={endDateRef} type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} className="bg-transparent text-xs font-black outline-none w-auto cursor-pointer text-gray-700" onClick={(e) => e.currentTarget.showPicker()}/>
            </div>
         </div>

         {/* Action Buttons */}
         <div className="flex gap-2 w-full lg:w-auto">
            <Button onClick={() => setIsExpenseModalOpen(true)} variant="outline" className="flex-1 lg:flex-none border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold gap-2 rounded-xl h-11">
               <ArrowUpRight className="w-4 h-4" /> مصروف
            </Button>
            <Button onClick={() => setIsInvoiceModalOpen(true)} variant="outline" className="flex-1 lg:flex-none border-green-100 text-green-600 hover:bg-green-50 hover:text-green-700 font-bold gap-2 rounded-xl h-11">
               <ArrowDownLeft className="w-4 h-4" /> فاتورة
            </Button>
         </div>
      </div>

      {/* 2. Financial Summary Cards (Existing code unchanged, just ensuring layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">إجمالي الدخل</span>
            <div className="flex items-center justify-between">
               <PriceTag amount={financials.totalIncome} className="text-2xl font-black text-gray-900" />
               <div className="p-2 bg-green-50 text-green-600 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
            </div>
            <div className="text-[10px] font-bold text-gray-400">
               محصل: <span className="text-green-600">{financials.receivedCash.toLocaleString()}</span> • آجل: <span className="text-orange-500">{financials.pendingCash.toLocaleString()}</span>
            </div>
         </div>
         <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">المصروفات</span>
            <div className="flex items-center justify-between">
               <PriceTag amount={financials.totalExpense} className="text-2xl font-black text-red-600" />
               <div className="p-2 bg-red-50 text-red-600 rounded-xl"><TrendingDown className="w-5 h-5" /></div>
            </div>
         </div>
         <div className="bg-primary text-white p-6 rounded-[2rem] shadow-xl shadow-primary/20 space-y-2 lg:col-span-1 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <span className="text-xs font-black text-white/80 uppercase tracking-widest relative z-10">صافي الربح</span>
            <div className="flex items-center justify-between relative z-10">
               <PriceTag amount={financials.netProfit} className="text-3xl font-black text-white" />
               <Wallet className="w-8 h-8 text-white/80" />
            </div>
         </div>
         <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-2 lg:col-span-1">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">السيولة</span>
            <div className="flex items-center justify-between">
               <PriceTag amount={financials.cashFlow} className={`text-2xl font-black ${financials.cashFlow >= 0 ? 'text-blue-600' : 'text-red-500'}`} />
               <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><ArrowDown className="w-5 h-5" /></div>
            </div>
         </div>
      </div>

      {/* 3. Main Ledger Table */}
      <div className="w-full">
         <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
               <div className="flex gap-2 bg-gray-50 p-1 rounded-xl w-full sm:w-auto">
                  <button onClick={() => setActiveTab('ledger')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'ledger' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>الكل</button>
                  <button onClick={() => setActiveTab('expenses')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'expenses' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>مصروفات</button>
                  <button onClick={() => setActiveTab('invoices')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'invoices' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>إيرادات</button>
               </div>
               <div className="relative w-full sm:w-64">
                  <input placeholder="بحث في المعاملات..." className="w-full h-10 bg-gray-50 border-none rounded-xl px-10 text-xs font-bold focus:ring-1 ring-primary/20 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               </div>
            </div>

            <div className="flex-1 overflow-x-auto">
               <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50/50 text-gray-500 font-bold text-[10px] uppercase tracking-widest sticky top-0">
                     <tr>
                        <th className="p-4 w-[15%]">التاريخ</th>
                        <th className="p-4 w-[35%]">الوصف / البيان</th>
                        <th className="p-4 w-[15%]">التصنيف</th>
                        <th className="p-4 w-[15%]">الحالة</th>
                        <th className="p-4 w-[15%]">المبلغ</th>
                        <th className="p-4 w-[5%]"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {ledgerData
                        .filter(item => activeTab === 'ledger' || (activeTab === 'expenses' && item.type === 'expense') || (activeTab === 'invoices' && item.type.startsWith('income')))
                        .filter(item => item.description.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((item) => (
                        <tr 
                            key={`${item.type}-${item.id}`} 
                            onClick={() => setSelectedTransaction(item)}
                            className={`cursor-pointer hover:bg-gray-50 transition-colors group ${item.type === 'expense' ? 'bg-red-50/5' : ''}`}
                        >
                           <td className="p-4 font-mono text-xs font-bold text-gray-500">{item.date}</td>
                           <td className="p-4">
                              <div className="font-bold text-gray-900">{item.description}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5 font-mono">#{item.id.slice(0, 8)}</div>
                           </td>
                           <td className="p-4">
                              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[10px] font-bold">{item.category}</span>
                           </td>
                           <td className="p-4">
                              {item.status === 'paid' && <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg w-fit"><CheckCircle2 className="w-3 h-3" /> مدفوع</span>}
                              {item.status === 'pending' && <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg w-fit"><Clock className="w-3 h-3" /> جزئي</span>}
                              {item.status === 'unpaid' && <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg w-fit"><Clock className="w-3 h-3" /> آجل</span>}
                           </td>
                           <td className="p-4">
                              <span className={`font-black text-sm flex items-center gap-1 ${item.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                                 {item.type === 'expense' ? '-' : '+'}
                                 {item.amount.toLocaleString()}
                              </span>
                           </td>
                           <td className="p-4 text-center">
                              <ExternalLink className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                           </td>
                        </tr>
                     ))}
                     {ledgerData.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-gray-400 font-bold">لا توجد بيانات مالية مطابقة</td></tr>}
                  </tbody>
               </table>
            </div>
         </div>
      </div>

      {/* Expense Modal */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="تسجيل مصروف جديد">
          <div className="space-y-4 text-right">
              <Input label="عنوان المصروف" value={newExpense.title || ''} onChange={e => setNewExpense({...newExpense, title: e.target.value})} className="h-12 rounded-xl font-bold" />
              <div className="grid grid-cols-2 gap-4">
                  <Input label="المبلغ" type="number" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} className="h-12 rounded-xl font-bold" />
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500">التصنيف</label>
                      <select className="w-full h-12 border rounded-xl px-3 bg-white font-bold text-sm" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as any})}>
                          {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                  </div>
              </div>
              <Button onClick={handleSaveExpense} disabled={processing} className="w-full h-12 rounded-xl font-bold mt-2 shadow-lg shadow-primary/20">
                  {processing ? <Loader2 className="animate-spin w-5 h-5" /> : 'حفظ المصروف'}
              </Button>
          </div>
      </Modal>

      {/* New Invoice Modal with Client & Hall Select */}
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title="إضافة إيراد خارجي" className="max-w-lg">
          <div className="space-y-4 text-right">
              <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><User className="w-3.5 h-3.5" /> العميل</label>
                  <select 
                    className="w-full h-12 border rounded-xl px-3 bg-white font-bold text-sm" 
                    value={newInvoice.client_id} 
                    onChange={e => setNewInvoice({...newInvoice, client_id: e.target.value})}
                  >
                      <option value="">اختر العميل...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
              </div>
              <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> القاعة (اختياري)</label>
                  <select 
                    className="w-full h-12 border rounded-xl px-3 bg-white font-bold text-sm" 
                    value={newInvoice.hall_id} 
                    onChange={e => setNewInvoice({...newInvoice, hall_id: e.target.value})}
                  >
                      <option value="">غير مرتبط بقاعة محددة</option>
                      {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
              </div>
              <Input label="وصف الفاتورة" value={newInvoice.items_desc} onChange={e => setNewInvoice({...newInvoice, items_desc: e.target.value})} className="h-12 rounded-xl font-bold" />
              <Input label="المبلغ الإجمالي" type="number" value={newInvoice.total_amount || ''} onChange={e => setNewInvoice({...newInvoice, total_amount: Number(e.target.value)})} className="h-12 rounded-xl font-bold" />
              <Button onClick={handleSaveInvoice} disabled={processing} className="w-full h-12 rounded-xl font-bold mt-2 shadow-lg shadow-primary/20">
                  {processing ? <Loader2 className="animate-spin w-5 h-5" /> : 'حفظ الفاتورة'}
              </Button>
          </div>
      </Modal>

      {/* Detailed Transaction View (Printable) */}
      {selectedTransaction && (
          selectedTransaction.type === 'income_booking' ? (
              <PaymentHistoryModal 
                isOpen={!!selectedTransaction} 
                onClose={() => setSelectedTransaction(null)} 
                booking={selectedTransaction.data} 
                onUpdate={fetchData}
                readOnly={false}
              />
          ) : (
              <Modal isOpen={!!selectedTransaction} onClose={() => setSelectedTransaction(null)} title="تفاصيل المعاملة" className="max-w-2xl">
                  <div className="space-y-6 text-right" id="printable-tx">
                      <div className="flex justify-between items-center border-b pb-4">
                          <h3 className="font-black text-xl">{user.business_name}</h3>
                          <div className="text-center">
                              <p className="text-[10px] text-gray-400 uppercase font-bold">رقم المرجع</p>
                              <p className="font-mono font-bold text-sm">#{selectedTransaction.id.slice(0,8).toUpperCase()}</p>
                          </div>
                      </div>

                      <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex flex-col items-center justify-center space-y-2">
                          <p className="text-xs font-bold text-gray-400 mb-1">{selectedTransaction.type === 'expense' ? 'سند صرف (مصروفات)' : 'سند قبض (إيراد)'}</p>
                          <PriceTag amount={selectedTransaction.amount} className={`justify-center text-4xl font-black ${selectedTransaction.type === 'expense' ? 'text-red-500' : 'text-green-600'}`} />
                      </div>

                      <div className="grid grid-cols-2 gap-6 text-sm">
                          <div className="space-y-1">
                              <span className="font-bold text-gray-400 text-xs">الوصف / البيان</span>
                              <p className="font-black text-gray-900">{selectedTransaction.description}</p>
                          </div>
                          <div className="space-y-1">
                              <span className="font-bold text-gray-400 text-xs">التاريخ</span>
                              <p className="font-bold text-gray-900">{selectedTransaction.date}</p>
                          </div>
                          <div className="space-y-1">
                              <span className="font-bold text-gray-400 text-xs">التصنيف</span>
                              <p className="font-bold text-gray-900">{selectedTransaction.category}</p>
                          </div>
                          {selectedTransaction.type === 'income_invoice' && (
                              <div className="space-y-1">
                                  <span className="font-bold text-gray-400 text-xs">حالة الدفع</span>
                                  <span className={`font-bold ${selectedTransaction.status === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                                      {selectedTransaction.status === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                                  </span>
                              </div>
                          )}
                          {selectedTransaction.data.hall_id && (
                              <div className="space-y-1">
                                  <span className="font-bold text-gray-400 text-xs">القاعة المرتبطة</span>
                                  <p className="font-bold text-gray-900">{selectedTransaction.data.halls?.name}</p>
                              </div>
                          )}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex gap-2 pt-6 border-t border-gray-100 no-print">
                          <Button variant="outline" onClick={() => window.print()} className="flex-1 rounded-xl font-bold gap-2"><Printer className="w-4 h-4" /> طباعة</Button>
                          <Button 
                            variant="destructive" 
                            className="flex-1 rounded-xl font-bold"
                            onClick={() => {
                                handleDelete(selectedTransaction.type === 'expense' ? 'expenses' : 'external_invoices', selectedTransaction.id);
                                setSelectedTransaction(null);
                            }}
                          >
                              <Trash2 className="w-4 h-4 ml-2" /> حذف
                          </Button>
                      </div>
                  </div>
                  <style>{`@media print { body * { visibility: hidden; } #printable-tx, #printable-tx * { visibility: visible; } #printable-tx { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; } .no-print { display: none !important; } }`}</style>
              </Modal>
          )
      )}
    </div>
  );
};
