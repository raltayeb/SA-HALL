
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Booking, PaymentLog } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PriceTag } from '../ui/PriceTag';
import { Loader2, Plus, History, Trash2, CalendarDays, CreditCard } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onUpdate: () => void;
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({ isOpen, onClose, booking, onUpdate }) => {
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: 0, method: 'cash', notes: '' });
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from('payment_logs').select('*').eq('booking_id', booking.id).order('created_at', { ascending: false });
    setLogs(data as PaymentLog[] || []);
    setLoading(false);
  };

  useEffect(() => { if (isOpen) fetchLogs(); }, [isOpen, booking.id]);

  const handleAddPayment = async () => {
    if (newPayment.amount <= 0) return;
    setAdding(true);
    
    // 1. Insert Log
    const { error: logError } = await supabase.from('payment_logs').insert([{
        booking_id: booking.id,
        vendor_id: booking.vendor_id,
        amount: newPayment.amount,
        payment_method: newPayment.method,
        notes: newPayment.notes
    }]);

    if (!logError) {
        // 2. Update Booking Totals
        const newPaidAmount = (booking.paid_amount || 0) + newPayment.amount;
        let newStatus = booking.payment_status;
        if (newPaidAmount >= booking.total_amount) newStatus = 'paid';
        else if (newPaidAmount > 0) newStatus = 'partial';

        await supabase.from('bookings').update({ 
            paid_amount: newPaidAmount,
            payment_status: newStatus
        }).eq('id', booking.id);

        toast({ title: 'تم تسجيل الدفعة', variant: 'success' });
        setNewPayment({ amount: 0, method: 'cash', notes: '' });
        fetchLogs();
        onUpdate(); // Refresh parent booking list
    } else {
        toast({ title: 'خطأ', description: logError.message, variant: 'destructive' });
    }
    setAdding(false);
  };

  const totalPaid = logs.reduce((sum, log) => sum + Number(log.amount), 0);
  const remaining = Math.max(0, booking.total_amount - totalPaid);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="سجل الدفعات المالية">
        <div className="space-y-6 text-right">
            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                <div className="text-center flex-1 border-l border-gray-200">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">الإجمالي</p>
                    <PriceTag amount={booking.total_amount} className="justify-center text-lg text-gray-900" />
                </div>
                <div className="text-center flex-1 border-l border-gray-200">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">المدفوع</p>
                    <PriceTag amount={totalPaid} className="justify-center text-lg text-green-600" />
                </div>
                <div className="text-center flex-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">المتبقي</p>
                    <PriceTag amount={remaining} className="justify-center text-lg text-red-500" />
                </div>
            </div>

            {/* Add Payment Form */}
            {remaining > 0 && (
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-3">
                    <h4 className="text-xs font-black text-primary flex items-center gap-2"><Plus className="w-4 h-4" /> تسجيل دفعة جديدة</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <Input type="number" placeholder="المبلغ" value={newPayment.amount || ''} onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})} className="bg-white" />
                        <select className="w-full h-11 rounded-xl border px-3 text-sm font-bold bg-white" value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})}>
                            <option value="cash">كاش / نقدي</option>
                            <option value="card">شبكة / بطاقة</option>
                            <option value="transfer">تحويل بنكي</option>
                        </select>
                    </div>
                    <Input placeholder="ملاحظات (مثال: دفعة أولى)" value={newPayment.notes} onChange={e => setNewPayment({...newPayment, notes: e.target.value})} className="bg-white" />
                    <Button onClick={handleAddPayment} disabled={adding || newPayment.amount <= 0} className="w-full h-10 rounded-xl font-bold">
                        {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ الدفعة'}
                    </Button>
                </div>
            )}

            {/* Logs List */}
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><History className="w-4 h-4" /> سجل العمليات</h4>
                {loading ? <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div> : logs.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 font-bold py-4">لا توجد دفعات مسجلة.</p>
                ) : logs.map(log => (
                    <div key={log.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                        <div>
                            <div className="flex items-center gap-2">
                                <PriceTag amount={log.amount} className="text-sm font-black text-gray-900" />
                                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-bold">
                                    {log.payment_method === 'cash' ? 'نقدي' : log.payment_method === 'card' ? 'بطاقة' : 'تحويل'}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" /> {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}
                            </p>
                            {log.notes && <p className="text-[10px] text-primary mt-1 font-bold">{log.notes}</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </Modal>
  );
};
