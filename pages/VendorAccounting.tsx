
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, Expense, ExternalInvoice, Hall, StoreOrder } from '../types';
import { PriceTag } from '../components/ui/PriceTag';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { TransactionDetailsModal } from '../components/Accounting/TransactionDetailsModal';
import { 
  Receipt, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  Wallet, Filter, Loader2, Calendar, Search, ExternalLink, Printer, User, Building2, ShoppingBag, ChevronLeft
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '../context/ToastContext';

interface VendorAccountingProps {
  user: UserProfile;
}

interface LedgerItem {
  id: string;
  type: 'income_booking' | 'income_invoice' | 'expense' | 'store_purchase';
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'unpaid';
  category?: string;
  data?: any;
}

export const VendorAccounting: React.FC<VendorAccountingProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'expenses' | 'invoices'>('ledger');
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [externalInvoices, setExternalInvoices] = useState<ExternalInvoice[]>([]);
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([]);
  const [assets, setAssets] = useState<{id: string, name: string}[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  const [dateFilter, setDateFilter] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('all');

  // Modal State
  const [selectedTransaction, setSelectedTransaction] = useState<LedgerItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
        const [bData, eData, iData, sData, hData, cData] = await Promise.all([
            supabase.from('bookings').select('*, halls(name), chalets(name), client:user_id(full_name)').eq('vendor_id', user.id).neq('status', 'cancelled'),
            supabase.from('expenses').select('*').eq('vendor_id', user.id).order('expense_date', { ascending: false }),
            supabase.from('external_invoices').select('*').eq('vendor_id', user.id).order('created_at', { ascending: false }),
            supabase.from('store_orders').select('*').eq('vendor_id', user.id),
            supabase.from('halls').select('id, name').eq('vendor_id', user.id),
            supabase.from('chalets').select('id, name').eq('vendor_id', user.id)
        ]);

        if (bData.data) setBookings(bData.data as any[]);
        if (eData.data) setExpenses(eData.data as Expense[]);
        if (iData.data) setExternalInvoices(iData.data as any[]);
        if (sData.data) setStoreOrders(sData.data as any[]);
        
        setAssets([...(hData.data || []), ...(cData.data || [])]);

    } catch (err) {
        console.error("Fetch Error:", err);
    } finally {
        setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const ledgerData = useMemo<LedgerItem[]>(() => {
    const startDate = startOfDay(new Date(dateFilter.start));
    const endDate = endOfDay(new Date(dateFilter.end));

    const checkDate = (dateStr: string) => {
        if (!dateStr) return false;
        const d = parseISO(dateStr); 
        return isWithinInterval(d, { start: startDate, end: endDate });
    };

    const items: LedgerItem[] = [];

    // 1. Income: Bookings
    bookings.forEach(b => {
        const assetId = b.hall_id || b.chalet_id;
        if (selectedAssetId !== 'all' && assetId !== selectedAssetId) return;
        
        if (checkDate(b.booking_date)) {
            items.push({
                id: b.id,
                type: 'income_booking',
                date: b.booking_date,
                description: `حجز: ${b.halls?.name || b.chalets?.name || 'أصل'} - ${b.guest_name || b.client?.full_name || 'عميل'}`,
                amount: b.total_amount,
                status: b.payment_status === 'paid' ? 'paid' : b.payment_status === 'partial' ? 'pending' : 'unpaid',
                category: 'حجوزات',
                data: b
            });
        }
    });

    // 2. Income: External Invoices
    externalInvoices.forEach(inv => {
        if (selectedAssetId !== 'all' && inv.hall_id && inv.hall_id !== selectedAssetId) return;
        const date = inv.created_at?.split('T')[0] || '';
        if (checkDate(date)) {
            items.push({
                id: inv.id,
                type: 'income_invoice',
                date: date,
                description: `فاتورة خارجية: ${inv.customer_name}`,
                amount: inv.total_amount,
                status: inv.status === 'paid' ? 'paid' : 'unpaid',
                category: 'خدمات خارجية',
                data: inv
            });
        }
    });

    // 3. Expenses: General
    if (selectedAssetId === 'all') { 
        expenses.forEach(exp => {
            if (checkDate(exp.expense_date)) {
                items.push({
                    id: exp.id,
                    type: 'expense',
                    date: exp.expense_date,
                    description: exp.title,
                    amount: exp.amount,
                    status: 'paid',
                    category: exp.category,
                    data: exp
                });
            }
        });
        
        // 4. Expenses: Store Purchases
        storeOrders.forEach(order => {
            const date = order.created_at.split('T')[0];
            if (checkDate(date)) {
                items.push({
                    id: order.id,
                    type: 'store_purchase',
                    date: date,
                    description: `شراء من المتجر (${order.items.length} منتجات)`,
                    amount: order.total_amount,
                    status: 'paid',
                    category: 'مشتريات',
                    data: order
                });
            }
        });
    }

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [bookings, expenses, externalInvoices, storeOrders, dateFilter, selectedAssetId]);

  const financials = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    ledgerData.forEach(item => {
        if (item.type === 'expense' || item.type === 'store_purchase') {
            totalExpense += Number(item.amount);
        } else {
            // Calculate actual income based on paid amount if booking
            if (item.type === 'income_booking') {
               totalIncome += Number(item.data.paid_amount || 0);
            } else if (item.status === 'paid') {
               totalIncome += Number(item.amount);
            }
        }
    });

    return { totalIncome, totalExpense, netProfit: totalIncome - totalExpense };
  }, [ledgerData]);

  const handleRowClick = (item: LedgerItem) => {
      setSelectedTransaction(item);
      setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans text-right">
      
      <div className="bg-white p-6 rounded-[2rem] border border-gray-200 flex flex-col lg:flex-row justify-between items-center gap-4">
         <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="bg-primary/5 p-3 rounded-xl text-primary"><Receipt className="w-6 h-6" /></div>
            <div>
               <h2 className="text-xl font-black text-gray-900">النظام المالي الموحد</h2>
               <div className="flex items-center gap-2 mt-1">
                   <p className="text-xs font-bold text-gray-400">تصفية حسب الأصل:</p>
                   <select 
                        className="bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold px-2 py-1 outline-none cursor-pointer min-w-[120px]"
                        value={selectedAssetId}
                        onChange={(e) => setSelectedAssetId(e.target.value)}
                   >
                        <option value="all">كافة الأصول</option>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                   </select>
               </div>
            </div>
         </div>

         <div className="flex items-center gap-3 w-full lg:w-auto bg-gray-50 p-2 rounded-xl border border-gray-200">
            <input type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} className="bg-transparent text-xs font-black outline-none w-auto cursor-pointer text-gray-700" />
            <span className="text-gray-400">-</span>
            <input type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} className="bg-transparent text-xs font-black outline-none w-auto cursor-pointer text-gray-700" />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-[2rem] border border-gray-200 space-y-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">الدخل المحصل</span>
            <div className="flex items-center justify-between">
               <PriceTag amount={financials.totalIncome} className="text-2xl font-black text-gray-900" />
               <div className="p-2 bg-green-50 text-green-600 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
            </div>
         </div>
         <div className="bg-white p-6 rounded-[2rem] border border-gray-200 space-y-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">المصروفات والمشتريات</span>
            <div className="flex items-center justify-between">
               <PriceTag amount={financials.totalExpense} className="text-2xl font-black text-red-600" />
               <div className="p-2 bg-red-50 text-red-600 rounded-xl"><TrendingDown className="w-5 h-5" /></div>
            </div>
         </div>
         <div className="bg-primary text-white p-6 rounded-[2rem] space-y-2">
            <span className="text-xs font-black text-white/80 uppercase tracking-widest relative z-10">صافي الربح</span>
            <div className="flex items-center justify-between relative z-10">
               <PriceTag amount={financials.netProfit} className="text-3xl font-black text-white" />
               <Wallet className="w-8 h-8 text-white/80" />
            </div>
         </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-[2rem] overflow-hidden flex flex-col min-h-[500px]">
         <div className="p-6 border-b border-gray-100 flex justify-between items-center">
             <h3 className="font-black text-lg">سجل المعاملات</h3>
             <div className="relative w-64">
                  <input placeholder="بحث في السجل..." className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-10 text-xs font-bold outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             </div>
         </div>
         <div className="flex-1 overflow-x-auto">
            <table className="w-full text-right text-sm">
               <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase tracking-widest">
                  <tr>
                     <th className="p-4">التاريخ</th>
                     <th className="p-4">الوصف</th>
                     <th className="p-4">النوع</th>
                     <th className="p-4">المبلغ</th>
                     <th className="p-4 w-10"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {ledgerData.filter(item => item.description.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                     <tr 
                        key={`${item.type}-${item.id}`} 
                        onClick={() => handleRowClick(item)}
                        className="hover:bg-gray-50 transition-all cursor-pointer group"
                     >
                        <td className="p-4 font-mono text-xs font-bold text-gray-500">{item.date}</td>
                        <td className="p-4 font-bold text-gray-900 group-hover:text-primary transition-colors">{item.description}</td>
                        <td className="p-4">
                           <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                               item.type.startsWith('income') ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                           }`}>
                               {item.type === 'income_booking' ? 'حجز' : item.type === 'store_purchase' ? 'مشتريات' : item.type === 'expense' ? 'مصروف' : 'فاتورة'}
                           </span>
                        </td>
                        <td className="p-4 font-black">
                           <span className={item.type.startsWith('income') ? 'text-green-600' : 'text-red-600'}>
                              {item.type.startsWith('income') ? '+' : '-'} {item.amount.toLocaleString()}
                           </span>
                        </td>
                        <td className="p-4">
                            <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      <TransactionDetailsModal 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
        transaction={selectedTransaction} 
      />
    </div>
  );
};
