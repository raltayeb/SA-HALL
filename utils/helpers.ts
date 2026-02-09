
export const normalizeNumbers = (str: string | undefined | null): string => {
  if (!str) return '';
  const map: { [key: string]: string } = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  return str.replace(/[٠-٩]/g, (match) => map[match]);
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = normalizeNumbers(phone).replace(/\D/g, '');
  // Ensure Saudi format if needed, simplistic version:
  if (cleaned.startsWith('05') && cleaned.length === 10) return cleaned;
  if (cleaned.startsWith('5') && cleaned.length === 9) return '0' + cleaned;
  return cleaned; 
};
