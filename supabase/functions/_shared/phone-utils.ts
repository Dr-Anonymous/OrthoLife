/**
 * Sanitizes a phone number by removing all non-numeric characters and taking the last 10 digits.
 * @param phone The phone number string to sanitize.
 * @returns A string containing the last 10 numeric characters.
 */
export const sanitizePhoneNumber = (phone: string): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, '').slice(-10);
};

/**
 * Validates if a phone number is a valid 10-digit number.
 * @param phone The phone number string to validate.
 * @returns True if valid, false otherwise.
 */
export const isValidPhoneNumber = (phone: string): boolean => {
    const sanitized = sanitizePhoneNumber(phone);
    return sanitized.length === 10;
};
