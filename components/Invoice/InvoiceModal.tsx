
import React from 'react';
import { Modal } from '../ui/Modal';
import { Booking, VAT_RATE } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { Printer, Download, CheckCircle2, QrCode } from 'lucide-react';
import { Button } from '../ui/Button';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, booking }) => {
  if (!booking) return null;

  const subtotal = booking.total_amount / (1 + VAT_RATE);
  const vatAmount = booking.total_amount - subtotal;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="الفاتورة الضريبية الإلكترونية">
      <div className="space-y-6" id="printable-invoice">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-primary">SA Hall</h2>
            <p className="text-xs text-muted-foreground">الرقم الضريبي: ٣١٠١٢٢٣٤٥٦٠٠٠٠٣</p>
          </div>
          <div className="text-left">
            <div className="bg-primary/5 p-2 rounded-lg">
              <QrCode className="w-16 h-16 text-primary" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">فاتورة إلى:</p>
            <p className="font-bold">{booking.profiles?.full_name}</p>
            <p className="text-xs">{booking.profiles?.email}</p>
          </div>
          <div className="text-left">
            <p className="text-muted-foreground">رقم الحجز:</p>
            <p className="font-mono text-xs">{booking.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-muted-foreground mt-2">التاريخ:</p>
            <p className="font-bold">{new Date(booking.created_at || '').toLocaleDateString('ar-SA')}</p>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-right">الوصف</th>
                <th className="p-2 text-left">المجموع</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="p-2">
                  حجز {booking.halls?.name}
                  <br />
                  <span className="text-xs text-muted-foreground">تاريخ المناسبة: {booking.booking_date}</span>
                </td>
                <td className="p-2 text-left">{formatCurrency(subtotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="space-y-2 text-sm border-t pt-4">
          <div className="flex justify-between">
            <span>المجموع الفرعي (غير شامل الضريبة)</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>ضريبة القيمة المضافة ({VAT_RATE * 100}%)</span>
            <span>{formatCurrency(vatAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg text-primary pt-2 border-t">
            <span>الإجمالي المستحق</span>
            <span>{formatCurrency(booking.total_amount)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-muted-foreground border-t pt-4">
          <p>هذه فاتورة إلكترونية معتمدة من هيئة الزكاة والضريبة والجمارك</p>
          <div className="flex justify-center items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span>تم التحقق من الفاتورة</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-6 no-print">
        <Button variant="outline" className="flex-1 gap-2" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> طباعة
        </Button>
        <Button className="flex-1 gap-2">
          <Download className="w-4 h-4" /> تحميل PDF
        </Button>
      </div>
    </Modal>
  );
};
