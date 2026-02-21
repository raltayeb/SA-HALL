
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Invoice, Expense } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PriceTag } from '../components/ui/PriceTag';
import { useToast } from '../context/ToastContext';
import { InvoiceModal } from '../components/Invoice/InvoiceModal';
import { ExpenseModal } from '../components/Expense/ExpenseModal';
import {
  FileText, Plus, Download, TrendingUp, TrendingDown,
  Calculator, Receipt, CreditCard, Calendar, Search
} from 'lucide-react';

interface VendorAccountingProps {
  user: UserProfile;
}

export const VendorAccounting: React.FC<VendorAccountingProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses' | 'zakat'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const { toast } = useToast();

  // Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    vatCollected: 0,
    vatPaid: 0,
    zakatDue: 0
  });

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invoicesData, expensesData] = await Promise.all([
        supabase
          .from('invoices')
          .select('*')
          .eq('vendor_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('expenses')
          .select('*')
          .eq('vendor_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      setInvoices(invoicesData.data || []);
      setExpenses(expensesData.data || []);
      calculateStats(invoicesData.data || [], expensesData.data || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'خطأ', description: 'فشل تحميل البيانات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (invoices: Invoice[], expenses: Expense[]) => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.total_amount, 0);
    const vatCollected = invoices.reduce((sum, inv) => sum + inv.vat_amount, 0);
    const vatPaid = expenses.reduce((sum, exp) => sum + exp.vat_amount, 0);
    const netIncome = totalRevenue - totalExpenses;
    const zakatDue = netIncome > 0 ? netIncome * 0.025 : 0; // 2.5% Zakat

    setStats({
      totalRevenue,
      totalExpenses,
      vatCollected,
      vatPaid,
      zakatDue
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-200">
        <div>
          <h2 className="text-3xl font-black text-primary">الفواتير والحسابات</h2>
          <p className="text-sm text-gray-500 font-bold mt-1">إدارة الفواتير والمصروفات والزكاة</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="rounded-xl h-12 px-6 font-bold gap-2"
          >
            <Plus className="w-4 h-4" />
            فاتورة جديدة
          </Button>
          <Button
            onClick={() => setIsExpenseModalOpen(true)}
            variant="outline"
            className="rounded-xl h-12 px-6 font-bold gap-2 border-gray-200"
          >
            <Plus className="w-4 h-4" />
            مصروف جديد
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-500">الإيرادات</span>
          </div>
          <PriceTag amount={stats.totalRevenue} className="text-xl font-black text-green-600" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-500">المصروفات</span>
          </div>
          <PriceTag amount={stats.totalExpenses} className="text-xl font-black text-red-600" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-500">ضريبة القيمة المضافة</span>
          </div>
          <div className="text-sm font-black text-blue-600">
            <div className="flex justify-between">
              <span>المحصلة: {stats.vatCollected.toFixed(2)}</span>
              <span>المدفوعة: {stats.vatPaid.toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-400 font-bold mt-1">
              المستحق: {(stats.vatCollected - stats.vatPaid).toFixed(2)} ر.س
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600">
              <Calculator className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-500">الزكاة</span>
          </div>
          <PriceTag amount={stats.zakatDue} className="text-xl font-black text-yellow-600" />
          <p className="text-[10px] text-gray-400 font-bold mt-1">2.5% من صافي الدخل</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-500">صافي الربح</span>
          </div>
          <PriceTag amount={stats.totalRevenue - stats.totalExpenses} className="text-xl font-black text-primary" />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-[2rem] border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex-1 px-6 py-4 text-sm font-bold transition-colors ${
              activeTab === 'invoices'
                ? 'bg-primary/5 text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4 inline-block ml-2" />
            الفواتير ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 px-6 py-4 text-sm font-bold transition-colors ${
              activeTab === 'expenses'
                ? 'bg-primary/5 text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Receipt className="w-4 h-4 inline-block ml-2" />
            المصروفات ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab('zakat')}
            className={`flex-1 px-6 py-4 text-sm font-bold transition-colors ${
              activeTab === 'zakat'
                ? 'bg-primary/5 text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Calculator className="w-4 h-4 inline-block ml-2" />
            الزكاة والضريبة
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'invoices' && (
            <div className="space-y-3">
              {invoices.length === 0 ? (
                <p className="text-center text-gray-400 font-bold py-8">لا توجد فواتير بعد</p>
              ) : (
                invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-200">
                        <FileText className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{invoice.customer_name}</p>
                        <p className="text-xs text-gray-500 font-bold">{invoice.invoice_number} • {invoice.issue_date}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <PriceTag amount={invoice.total_amount} className="text-lg font-black text-primary" />
                      <span className={`text-xs font-bold ${invoice.payment_status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                        {invoice.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="space-y-3">
              {expenses.length === 0 ? (
                <p className="text-center text-gray-400 font-bold py-8">لا توجد مصروفات بعد</p>
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-200">
                        <Receipt className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{expense.supplier_name}</p>
                        <p className="text-xs text-gray-500 font-bold">{expense.category} • {expense.expense_date}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <PriceTag amount={expense.total_amount} className="text-lg font-black text-red-600" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'zakat' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-100">
                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-yellow-600" />
                  حساب الزكاة
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl">
                    <p className="text-xs text-gray-500 font-bold mb-1">صافي الدخل</p>
                    <p className="text-xl font-black text-gray-900">{(stats.totalRevenue - stats.totalExpenses).toFixed(2)} ر.س</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl">
                    <p className="text-xs text-gray-500 font-bold mb-1">نسبة الزكاة</p>
                    <p className="text-xl font-black text-gray-900">2.5%</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border-2 border-yellow-200">
                    <p className="text-xs text-yellow-600 font-bold mb-1">الزكاة المستحقة</p>
                    <p className="text-xl font-black text-yellow-600">{stats.zakatDue.toFixed(2)} ر.س</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  ضريبة القيمة المضافة
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl">
                    <p className="text-xs text-gray-500 font-bold mb-1">ضريبة محصلة</p>
                    <p className="text-xl font-black text-blue-600">{stats.vatCollected.toFixed(2)} ر.س</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl">
                    <p className="text-xs text-gray-500 font-bold mb-1">ضريبة مدفوعة</p>
                    <p className="text-xl font-black text-blue-600">{stats.vatPaid.toFixed(2)} ر.س</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border-2 border-blue-200">
                    <p className="text-xs text-blue-600 font-bold mb-1">صافي الضريبة المستحقة</p>
                    <p className="text-xl font-black text-blue-600">{(stats.vatCollected - stats.vatPaid).toFixed(2)} ر.س</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={fetchData}
        user={user}
      />
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={fetchData}
        user={user}
      />
    </div>
  );
};
