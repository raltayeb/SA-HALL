
import React from 'react';
import { Modal } from '../ui/Modal';
import { Booking, VAT_RATE } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { Printer, Download, CheckCircle2, QrCode, Tag, Package } from 'lucide-react';
import { Button } from '../ui/Button';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, booking }) => {
  if (!booking) return null;

  const isConsultation = booking.booking_type === 'consultation';
  
  // Calculate Totals based on stored data or recalculate if needed
  const rawSubtotal = (booking.halls?.price_per_night || 0) + (booking.services?.price || 0);
  // Add items total
  const itemsTotal = booking.items ? booking.items.reduce((sum, i) => sum + (i.price * i.qty), 0) : 0;
  
  const totalSubWithItems = rawSubtotal + itemsTotal;
  const discountAmount = Number(booking.discount_amount || 0);
  const taxableAmount = Math.max(0, totalSubWithItems - discountAmount);
  const vatAmount = isConsultation ? 0 : taxableAmount * VAT_RATE;
  
  const paidAmount = booking.paid_amount || 0;
  const remainingAmount = Math.max(0, booking.total_amount - paidAmount);

  const vendorName = booking.vendor?.business_name || booking.profiles?.business_name || 'SA Hall';
  const taxId = booking.vendor?.pos_config?.tax_id || booking.profiles?.pos_config?.tax_id || 'غير متوفر';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isConsultation ? "طلب استشارة / عرض سعر" : "الفاتورة الضريبية الإلكترونية"} className="max-w-xl">
      <div className="space-y-6 text-right" id="printable-invoice">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-6">
          <div>
            <h2 className="text-2xl font-black text-primary leading-none">{vendorName}</h2>
            <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-widest">{isConsultation ? 'عرض مبدئي' : 'المرفق السياحي المعتمد'}</p>
            <p className="text-xs text-gray-900 font-bold mt-1">الرقم الضريبي: <span className="font-mono">{taxId}</span></p>
          </div>
          <div className="text-left flex flex-col items-center gap-2">
            <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10">
              <QrCode className="w-20 h-20 text-primary" />
            </div>
            <span className="text-[9px] font-black text-primary bg-primary/5 px-3 py-1 rounded-full uppercase">
                {isConsultation ? 'Consultation' : 'ZATCA Verified'}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-6 text-sm bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
          <div className="space-y-1">
            <p className="text-gray-400 text-[10px] font-black uppercase">العميل</p>
            <p className="font-black text-gray-900 text-lg">{booking.profiles?.full_name || booking.guest_name || 'عميل'}</p>
            <p className="text-xs font-bold text-gray-500">{booking.profiles?.phone_number || booking.guest_phone}</p>
          </div>
          <div className="text-left space-y-1 border-r border-gray-200 pr-6">
            <p className="text-gray-400 text-[10px] font-black uppercase">المرجع</p>
            <p className="font-mono text-sm font-black text-primary">#ORD-{booking.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-gray-400 text-[10px] font-black uppercase mt-4">التاريخ</p>
            <p className="font-bold font-mono text-xs">{new Date(booking.created_at || '').toLocaleDateString('ar-SA')}</p>
          </div>
        </div>

        {/* Table */}
        <div className="border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 font-black text-[10px] uppercase">
              <tr>
                <th className="p-4 text-right">الوصف والبيان</th>
                <th className="p-4 text-left">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {/* Main Hall/Service */}
              {(booking.halls || booking.services) && (
                  <tr>
                    <td className="p-4">
                      <div className="font-black text-gray-900">{booking.halls?.name || booking.services?.name}</div>
                      <div className="text-[10px] text-gray-400 font-bold mt-1">تاريخ الحجز: {booking.booking_date}</div>
                    </td>
                    <td className="p-4 text-left font-mono font-bold text-gray-900">
                        {formatCurrency(booking.halls?.price_per_night || booking.services?.price || 0)}
                    </td>
                  </tr>
              )}
              
              {/* Extra Items */}
              {booking.items && booking.items.map((item, idx) => (
                  <tr key={idx}>
                      <td className="p-4">
                          <div className="font-bold text-gray-800 flex items-center gap-2">
                              {item.type === 'product' ? <Package className="w-3 h-3 text-gray-400" /> : <Tag className="w-3 h-3 text-gray-400" />}
                              {item.name} <span className="text-[10px] text-gray-400">x{item.qty}</span>
                          </div>
                      </td>
                      <td className="p-4 text-left font-mono font-bold text-gray-900">{formatCurrency(item.price * item.qty)}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Details */}
        <div className="space-y-4 text-sm bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
          <div className="flex justify-between text-gray-600 font-bold text-xs uppercase tracking-widest">
            <span>المجموع الفرعي</span>
            <span className="font-mono">{formatCurrency(totalSubWithItems)}</span>
          </div>
          
          {discountAmount > 0 && (
              <div className="flex justify-between text-red-600 font-black text-xs">
                <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> خصم ({booking.applied_coupon})</span>
                <span className="font-mono">-{formatCurrency(discountAmount)}</span>
              </div>
          )}

          {!isConsultation && (
            <div className="flex justify-between text-gray-600 font-bold text-xs uppercase tracking-widest">
                <span>ضريبة القيمة المضافة (15%)</span>
                <span className="font-mono">{formatCurrency(vatAmount)}</span>
            </div>
          )}
          
          <div className="border-t border-gray-200 my-2 pt-4 flex justify-between items-center">
            <span className="font-black text-lg text-gray-900 uppercase">الإجمالي {isConsultation ? '(تقديري)' : 'المستحق'}</span>
            <div className="bg-primary text-white px-6 py-2 rounded-2xl font-mono font-black text-xl shadow-lg shadow-primary/20">
               {formatCurrency(booking.total_amount)}
            </div>
          </div>

          {!isConsultation && (
            <div className="pt-4 space-y-2 border-t border-dashed border-gray-200">
                <div className="flex justify-between text-emerald-600 font-black text-sm">
                    <span>المبلغ المدفوع</span>
                    <span className="font-mono">{formatCurrency(paidAmount)}</span>
                </div>
                {remainingAmount > 0 && (
                    <div className="flex justify-between text-red-500 font-black text-sm">
                        <span>الرصيد المتبقي</span>
                        <span className="font-mono">{formatCurrency(remainingAmount)}</span>
                    </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center space-y-2 border-t border-gray-100 pt-6">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
              {isConsultation ? 'هذا المستند للعرض فقط ولا يعتبر فاتورة ضريبية' : 'هذه فاتورة إلكترونية معتمدة - لا تحتاج لختم'}
          </p>
          <div className="flex justify-center items-center gap-2 text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-black">E-INVOICE GENERATED BY HALL SAUDI</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-8 no-print">
        <Button variant="outline" className="flex-1 gap-2 rounded-2xl h-14 font-black text-gray-600 hover:bg-gray-50 border-2" onClick={() => window.print()}>
          <Printer className="w-5 h-5" /> طباعة
        </Button>
        <Button className="flex-1 gap-2 rounded-2xl h-14 font-black shadow-xl shadow-primary/20">
          <Download className="w-5 h-5" /> تحميل PDF
        </Button>
      </div>
      <style>{`@media print { body * { visibility: hidden; } #printable-invoice, #printable-invoice * { visibility: visible; } #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; border: none; } .no-print { display: none !important; } }`}</style>
    </Modal>
  );
};
