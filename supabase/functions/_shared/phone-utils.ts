/**
 * Sanitizes a phone number by removing all non-numeric characters.
 * @param phone The phone number string to sanitize.
 * @returns A string containing only the numeric characters.
 */
export const sanitizePhoneNumber = (phone: string): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
};

/**
 * Validates if a phone number is a valid number (10-15 digits) after sanitization.
 * @param phone The phone number string to validate.
 * @returns True if valid, false otherwise.
 */
export const isValidPhoneNumber = (phone: string): boolean => {
    const sanitized = sanitizePhoneNumber(phone);
    return sanitized.length >= 10 && sanitized.length <= 15;
};
