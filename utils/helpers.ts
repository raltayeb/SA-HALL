
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

export const isValidSaudiPhone = (phone: string): boolean => {
  const cleaned = normalizeNumbers(phone).replace(/\D/g, '');
  // Regex for Saudi Mobile: Starts with 05, followed by 8 digits. Total 10.
  // Or starts with 5, followed by 8 digits. Total 9.
  const regex = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
  return regex.test(cleaned);
};

export const checkPasswordStrength = (password: string) => {
  return {
    length: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    hasLetter: /[a-zA-Z\u0600-\u06FF]/.test(password) // English or Arabic letters
  };
};
