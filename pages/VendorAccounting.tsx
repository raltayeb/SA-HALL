
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Booking, Expense, ExternalInvoice, VAT_RATE, EXPENSE_CATEGORIES } from '../types';
import { PriceTag } from '../components/ui/PriceTag';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { 
  Receipt, TrendingUp, Download, Calendar, ArrowUpRight, 
  CreditCard, Wallet, AlertCircle, CheckCircle2, FileText,
  PieChart, ArrowDownLeft, Plus, Trash2, Coins
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../context/ToastContext';

interface VendorAccountingProps {
  user: UserProfile;
}

export const VendorAccounting: React.FC<VendorAccountingProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'invoices'>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [externalInvoices, setExternalInvoices] = useState<ExternalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  
  // Forms
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ expense_date: new Date().toISOString().split('T')[0], category: 'other' });
  const [newInvoice, setNewInvoice] = useState({ customer_name: '', total_amount: 0, items_desc: '' });

  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const [bData, eData, iData] = await Promise.all([
        supabase.from('bookings').select('*, halls(name), profiles:user_id(full_name)').eq('vendor_id', user.id).neq('status', 'cancelled'),
        supabase.from('expenses').select('*').eq('vendor_id', user.id).order('expense_date', { ascending: false }),
        supabase.from('external_invoices').select('*').eq('vendor_id', user.id).order('created_at', { ascending: false })
    ]);

    setBookings(bData.data as Booking[] || []);
    setExpenses(eData.data as Expense[] || []);
    setExternalInvoices(iData.data as ExternalInvoice[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user.id]);

  // Stats Calculation
  const totalRevenueBookings = bookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
  const totalRevenueInvoices = externalInvoices.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const grossRevenue = totalRevenueBookings + totalRevenueInvoices;
  const netProfit = grossRevenue - totalExpenses;

  const handleAddExpense = async () => {
      if (!newExpense.title || !newExpense.amount) return;
      const { error } = await supabase.from('expenses').insert([{ ...newExpense, vendor_id: user.id }]);
      if (!error) {
          toast({ title: 'تم الحفظ', variant: 'success' });
          setIsExpenseModalOpen(false);
          fetchData();
          setNewExpense({ expense_date: new Date().toISOString().split('T')[0], category: 'other' });
      }
  };

  const handleAddInvoice = async () => {
      if (!newInvoice.customer_name || !newInvoice.total_amount) return;
      const vat = newInvoice.total_amount * 0.15; // Approximate for simple entry
      const { error } = await supabase.from('external_invoices').insert([{
          vendor_id: user.id,
          customer_name: newInvoice.customer_name,
          total_amount: newInvoice.total_amount,
          vat_amount: vat,
          items: [{ description: newInvoice.items_desc, total: newInvoice.total_amount }],
          status: 'unpaid'
      }]);
      if (!error) {
          toast({ title: 'تم إنشاء الفاتورة', variant: 'success' });
          setIsInvoiceModalOpen(false);
          fetchData();
          setNewInvoice({ customer_name: '', total_amount: 0, items_desc: '' });
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-border/50">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
             <Receipt className="w-6 h-6 text-primary" /> المركز المالي
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-bold opacity-80">إدارة شاملة للإيرادات، المصروفات، والفواتير.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'overview' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>نظرة عامة</button>
            <button onClick={() => setActiveTab('expenses')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'expenses' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>المصروفات</button>
            <button onClick={() => setActiveTab('invoices')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'invoices' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>فواتير خارجية</button>
        </div>
      </div>

      {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white p-6 rounded-[2rem] border border-border/60 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><TrendingUp className="w-6 h-6" /></div>
                        <span className="text-xs font-black text-gray-400 uppercase">إجمالي الدخل</span>
                    </div>
                    <PriceTag amount={grossRevenue} className="text-3xl font-black text-foreground" />
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-border/60 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><ArrowDownLeft className="w-6 h-6" /></div>
                        <span className="text-xs font-black text-gray-400 uppercase">المصروفات</span>
                    </div>
                    <PriceTag amount={totalExpenses} className="text-3xl font-black text-red-600" />
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-border/60 relative overflow-hidden group bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-primary text-white rounded-2xl"><Wallet className="w-6 h-6" /></div>
                        <span className="text-xs font-black text-primary uppercase">صافي الربح</span>
                    </div>
                    <PriceTag amount={netProfit} className="text-3xl font-black text-primary" />
                </div>
            </div>
            
            <div className="bg-white border border-border/60 rounded-[2.5rem] p-8">
                <h3 className="font-black text-lg mb-6">آخر الحجوزات (الإيرادات الأساسية)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold">
                            <tr>
                                <th className="p-4 rounded-r-xl">رقم الحجز</th>
                                <th className="p-4">العميل</th>
                                <th className="p-4">المبلغ</th>
                                <th className="p-4">التاريخ</th>
                                <th className="p-4 rounded-l-xl">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {bookings.slice(0, 5).map(b => (
                                <tr key={b.id}>
                                    <td className="p-4 font-mono text-xs">{b.id.slice(0,8)}</td>
                                    <td className="p-4 font-bold">{b.profiles?.full_name || 'زائر'}</td>
                                    <td className="p-4"><PriceTag amount={b.total_amount} /></td>
                                    <td className="p-4 text-xs">{format(new Date(b.booking_date), 'yyyy-MM-dd')}</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${b.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{b.payment_status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
      )}

      {activeTab === 'expenses' && (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <h3 className="font-black text-xl">سجل المصروفات</h3>
                  <Button onClick={() => setIsExpenseModalOpen(true)} className="rounded-xl h-10 gap-2"><Plus className="w-4 h-4" /> تسجيل مصروف</Button>
              </div>
              <div className="bg-white border border-border/60 rounded-[2.5rem] overflow-hidden">
                  <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold text-xs sticky top-0">
                            <tr>
                                <th className="p-5">البند / الوصف</th>
                                <th className="p-5">التصنيف</th>
                                <th className="p-5">المبلغ</th>
                                <th className="p-5">التاريخ</th>
                                <th className="p-5">ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {expenses.length === 0 ? <tr><td colSpan={5} className="p-10 text-center font-bold text-gray-400">لا توجد مصروفات مسجلة</td></tr> : 
                            expenses.map(e => (
                                <tr key={e.id} className="hover:bg-gray-50">
                                    <td className="p-5 font-bold text-gray-900">{e.title}</td>
                                    <td className="p-5"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">{e.category}</span></td>
                                    <td className="p-5"><PriceTag amount={e.amount} className="text-red-500" /></td>
                                    <td className="p-5 text-gray-500 font-mono text-xs">{e.expense_date}</td>
                                    <td className="p-5 text-gray-400 text-xs">{e.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'invoices' && (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <h3 className="font-black text-xl">فواتير الإيرادات الأخرى</h3>
                  <Button onClick={() => setIsInvoiceModalOpen(true)} className="rounded-xl h-10 gap-2"><Plus className="w-4 h-4" /> إنشاء فاتورة</Button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                  {externalInvoices.map(inv => (
                      <div key={inv.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                              <div>
                                  <h4 className="font-black text-lg">{inv.customer_name}</h4>
                                  <p className="text-xs text-gray-400 font-mono">#{inv.id.slice(0,8)}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-lg text-xs font-black ${inv.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                  {inv.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة'}
                              </span>
                          </div>
                          <div className="flex justify-between items-end border-t pt-3">
                              <div className="text-xs text-gray-500">
                                  {new Date(inv.created_at || '').toLocaleDateString('ar-SA')}
                              </div>
                              <PriceTag amount={inv.total_amount} className="text-xl" />
                          </div>
                      </div>
                  ))}
                  {externalInvoices.length === 0 && <div className="col-span-full py-10 text-center font-bold text-gray-400 border-2 border-dashed rounded-[2rem]">لا توجد فواتير خارجية</div>}
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
              <Button onClick={handleAddExpense} className="w-full h-12 rounded-xl font-bold mt-2">حفظ</Button>
          </div>
      </Modal>

      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title="إنشاء فاتورة إيراد">
          <div className="space-y-4 text-right">
              <Input label="اسم العميل / الجهة" value={newInvoice.customer_name} onChange={e => setNewInvoice({...newInvoice, customer_name: e.target.value})} className="h-12 rounded-xl" />
              <Input label="وصف الخدمة / المنتج" value={newInvoice.items_desc} onChange={e => setNewInvoice({...newInvoice, items_desc: e.target.value})} className="h-12 rounded-xl" />
              <Input label="المبلغ الإجمالي (شامل الضريبة)" type="number" value={newInvoice.total_amount || ''} onChange={e => setNewInvoice({...newInvoice, total_amount: Number(e.target.value)})} className="h-12 rounded-xl" />
              <Button onClick={handleAddInvoice} className="w-full h-12 rounded-xl font-bold mt-2">إصدار الفاتورة</Button>
          </div>
      </Modal>
    </div>
  );
};
