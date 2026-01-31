export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
  }).format(amount);
};

export const calculateVat = (amount: number) => {
  return amount * 0.15;
};