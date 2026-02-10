
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Modal } from '../ui/Modal';
import { Booking, PaymentLog, StoreOrder, Expense, ExternalInvoice } from '../../types';
import { PriceTag } from '../ui/PriceTag';
import { Button } from '../ui/Button';
import { 
  Calendar, User, FileText, CheckCircle2, AlertCircle, 
  History, Building2, ShoppingBag, Package, Hash, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

// Re-define LedgerItem interface locally or import if centralized
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

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: LedgerItem | null;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({ isOpen, onClose, transaction }) => {
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (isOpen && transaction?.type === 'income_booking' && transaction.data?.id) {
      const fetchLogs = async () => {
        setLoadingLogs(true);
        const { data } = await supabase
          .from('payment_logs')
          .select('*')
          .eq('booking_id', transaction.data.id)
          .order('created_at', { ascending: false });
        setLogs(data as PaymentLog[] || []);
        setLoadingLogs(false);
      };
      fetchLogs();
    } else {
        setLogs([]);
    }
  }, [isOpen, transaction]);

  if (!transaction) return null;

  const data = transaction.data;

  // Render Content based on Type
  const renderDetails = () => {
    // 1. BOOKING
    if (transaction.type === 'income_booking') {
        const booking = data as Booking;
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <span className="text-xs font-bold text-gray-400 block mb-1">العميل</span>
                        <div className="font-black text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            {booking.guest_name || booking.client?.full_name || 'ضيف'}
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <span className="text-xs font-bold text-gray-400 block mb-1">المكان / الخدمة</span>
                        <div className="font-black text-gray-900 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary" />
                            {booking.halls?.name || booking.chalets?.name || 'خدمة'}
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="border-t border-gray-100 pt-6">
                    <h4 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                        <History className="w-4 h-4 text-gray-400" /> سجل الدفعات والأحداث
                    </h4>
                    
                    <div className="space-y-0 relative border-r-2 border-gray-100 mr-2">
                        {loadingLogs ? (
                            <p className="text-xs text-gray-400 pr-4">جاري تحميل السجل...</p>
                        ) : logs.length === 0 ? (
                            <div className="pr-4 py-2 relative">
                                <div className="absolute top-3 -right-[5px] w-2 h-2 bg-gray-300 rounded-full"></div>
                                <p className="text-xs text-gray-400">لا يوجد سجل دفعات (الدفع عند الوصول أو لم يتم بعد).</p>
                            </div>
                        ) : (
                            logs.map((log, idx) => (
                                <div key={log.id} className="pr-6 pb-6 relative last:pb-0">
                                    <div className="absolute top-1.5 -right-[5px] w-2.5 h-2.5 bg-green-500 rounded-full ring-4 ring-white"></div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-black text-gray-900">
                                                {log.payment_method === 'card' ? 'دفع إلكتروني' : log.payment_method === 'transfer' ? 'تحويل بنكي' : 'دفعة نقدية'}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {format(new Date(log.created_at), 'dd MMMM yyyy - hh:mm a', { locale: arSA })}
                                            </p>
                                            {log.notes && <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded-lg inline-block">{log.notes}</p>}
                                        </div>
                                        <PriceTag amount={log.amount} className="text-sm font-black text-green-600" />
                                    </div>
                                </div>
                            ))
                        )}
                        {/* Initial Creation Event */}
                        <div className="pr-6 pt-6 relative">
                             <div className="absolute top-7 -right-[5px] w-2.5 h-2.5 bg-primary/30 rounded-full ring-4 ring-white"></div>
                             <p className="text-xs font-bold text-gray-500">تم إنشاء الحجز</p>
                             <p className="text-[10px] text-gray-400">{format(new Date(booking.created_at || new Date()), 'dd MMMM yyyy', { locale: arSA })}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. STORE PURCHASE
    if (transaction.type === 'store_purchase') {
        const order = data as StoreOrder;
        return (
            <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="w-5 h-5 text-orange-500" />
                        <div>
                            <span className="text-xs font-bold text-gray-400 block">عدد المنتجات</span>
                            <span className="font-black text-gray-900">{order.items.length} منتج</span>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-xl text-xs font-black ${order.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                        {order.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
                    </div>
                </div>

                <div>
                    <h4 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" /> المنتجات المشتراة
                    </h4>
                    <div className="space-y-2">
                        {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                                <span className="text-sm font-bold text-gray-700">{item.name} <span className="text-gray-400 text-xs">x{item.qty}</span></span>
                                <span className="text-sm font-black text-gray-900">{item.price * item.qty} ر.س</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // 3. EXPENSE & INVOICE
    return (
        <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 text-center">
                <p className="text-xs font-bold text-gray-400 mb-2">الوصف</p>
                <p className="text-lg font-black text-gray-900 leading-relaxed">{transaction.description}</p>
                {data.notes && <p className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200">{data.notes}</p>}
            </div>
            
            <div className="flex justify-between items-center px-4">
                <span className="text-sm font-bold text-gray-500">التصنيف</span>
                <span className="text-sm font-black text-primary bg-primary/5 px-3 py-1 rounded-lg">{transaction.category}</span>
            </div>
        </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل المعاملة" className="max-w-xl">
        <div className="text-right font-tajawal pb-4">
            
            {/* Header Summary */}
            <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-6">
                <div>
                    <p className="text-xs font-bold text-gray-400 flex items-center gap-1 mb-1">
                        <Hash className="w-3 h-3" /> رقم المرجع: {transaction.id.slice(0, 8)}
                    </p>
                    <p className="text-xs font-bold text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {format(new Date(transaction.date), 'dd MMMM yyyy', { locale: arSA })}
                    </p>
                </div>
                <div className="text-left">
                    <PriceTag amount={transaction.amount} className={`text-2xl font-black ${transaction.type.startsWith('income') ? 'text-green-600' : 'text-red-500'}`} />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${transaction.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {transaction.status === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                    </span>
                </div>
            </div>

            {renderDetails()}

            <div className="mt-8 pt-6 border-t border-gray-100">
                <Button variant="outline" onClick={onClose} className="w-full h-12 rounded-xl font-bold border-gray-200">
                    إغلاق
                </Button>
            </div>
        </div>
    </Modal>
  );
};
