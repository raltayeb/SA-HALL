
import React from 'react';
import { Modal } from '../ui/Modal';
import { Booking, VAT_RATE } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { Printer, Download, QrCode } from 'lucide-react';
import { Button } from '../ui/Button';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, booking }) => {
  if (!booking) return null;

  const isConsultation = booking.booking_type === 'consultation';
  const isPackageBooking = !!booking.package_name; // Check if a package was selected
  
  // Calculate Totals based on stored data or recalculate if needed
  // If it's a package booking, the base hall price is 0 (covered by the package item in items list)
  const rawSubtotal = isPackageBooking ? 0 : (booking.halls?.price_per_night || booking.services?.price || 0);
  
  // Add items total (includes package price if applicable)
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
    // Updated max-h to 65vh
    <Modal isOpen={isOpen} onClose={onClose} title={isConsultation ? "عرض سعر" : "الفاتورة"} className="max-w-md w-full mx-auto my-auto z-[2000] max-h-[65vh] flex flex-col">
      <div className="space-y-4 text-right pb-2 overflow-y-auto custom-scrollbar flex-1 px-1" id="printable-invoice">
        {/* Header Compact */}
        <div className="flex flex-col-reverse justify-between items-center border-b pb-4 gap-4 text-center">
          <div>
            <h2 className="text-xl font-black text-primary leading-none">{vendorName}</h2>
            <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-widest">{isConsultation ? 'عرض مبدئي' : 'فاتورة ضريبية'}</p>
            <p className="text-[10px] text-gray-900 font-bold mt-1">الرقم الضريبي: <span className="font-mono">{taxId}</span></p>
          </div>
          <div className="bg-primary/5 p-2 rounded-xl border border-primary/10">
             <QrCode className="w-12 h-12 text-primary" />
          </div>
        </div>

        {/* Info Compact */}
        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 text-xs">
          <div className="flex justify-between mb-2">
             <span className="text-gray-400 font-bold">العميل:</span>
             <span className="font-black text-gray-900">{booking.profiles?.full_name || booking.guest_name || 'عميل'}</span>
          </div>
          <div className="flex justify-between mb-2">
             <span className="text-gray-400 font-bold">رقم المرجع:</span>
             <span className="font-mono font-black text-primary">#{booking.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
             <span className="text-gray-400 font-bold">التاريخ:</span>
             <span className="font-bold font-mono">{new Date(booking.created_at || '').toLocaleDateString('ar-SA')}</span>
          </div>
        </div>

        {/* Table Compact */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 font-black text-[9px] uppercase">
              <tr>
                <th className="p-3 text-right">البيان</th>
                <th className="p-3 text-left">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {/* Main Hall/Service */}
              {(booking.halls || booking.services) && (
                  <tr>
                    <td className="p-3">
                      <div className="font-bold text-gray-900 line-clamp-1">{booking.halls?.name || booking.services?.name}</div>
                      <div className="text-[9px] text-gray-400 font-bold mt-0.5">{booking.booking_date}</div>
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-gray-900">
                        {isPackageBooking ? <span className="text-[9px] text-gray-400 font-medium">مشمول في الباقة</span> : formatCurrency(booking.halls?.price_per_night || booking.services?.price || 0)}
                    </td>
                  </tr>
              )}
              
              {/* Extra Items */}
              {booking.items && booking.items.map((item, idx) => (
                  <tr key={idx}>
                      <td className="p-3">
                          <div className="font-medium text-gray-700 flex items-center gap-1 line-clamp-1">
                              {item.name} <span className="text-[9px] text-gray-400">x{item.qty}</span>
                          </div>
                      </td>
                      <td className="p-3 text-left font-mono font-medium text-gray-900">{formatCurrency(item.price * item.qty)}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Details Compact */}
        <div className="space-y-2 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div className="flex justify-between text-gray-600 font-bold">
            <span>المجموع</span>
            <span className="font-mono">{formatCurrency(totalSubWithItems)}</span>
          </div>
          
          {!isConsultation && (
            <div className="flex justify-between text-gray-600 font-bold">
                <span>الضريبة (15%)</span>
                <span className="font-mono">{formatCurrency(vatAmount)}</span>
            </div>
          )}
          
          <div className="border-t border-gray-200 my-1 pt-2 flex justify-between items-center">
            <span className="font-black text-sm text-gray-900">الإجمالي</span>
            <div className="bg-primary text-white px-3 py-1 rounded-lg font-mono font-black text-sm shadow-sm">
               {formatCurrency(booking.total_amount)}
            </div>
          </div>

          {!isConsultation && (
            <div className="pt-2 space-y-1 border-t border-dashed border-gray-200">
                <div className="flex justify-between text-emerald-600 font-bold">
                    <span>المدفوع</span>
                    <span className="font-mono">{formatCurrency(paidAmount)}</span>
                </div>
                {remainingAmount > 0 && (
                    <div className="flex justify-between text-red-500 font-bold">
                        <span>المتبقي</span>
                        <span className="font-mono">{formatCurrency(remainingAmount)}</span>
                    </div>
                )}
            </div>
          )}
        </div>
        
        <div className="text-center pt-2">
            <p className="text-[9px] text-gray-400 font-bold">تم الإصدار إلكترونياً عبر منصة القاعة</p>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100 no-print mt-auto">
        <Button variant="outline" className="flex-1 gap-1 rounded-xl h-10 font-bold text-xs" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> طباعة
        </Button>
        <Button className="flex-1 gap-1 rounded-xl h-10 font-bold text-xs shadow-none">
          <Download className="w-4 h-4" /> PDF
        </Button>
      </div>
      <style>{`@media print { body * { visibility: hidden; } #printable-invoice, #printable-invoice * { visibility: visible; } #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; padding: 10px; border: none; } .no-print { display: none !important; } }`}</style>
    </Modal>
  );
};
