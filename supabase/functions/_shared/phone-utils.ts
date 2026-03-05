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
 * Gets a searchable version of a phone number (last 10 digits).
 * Useful for finding patients when a country code is provided.
 */
export const getSearchablePhone = (phone: string): string => {
    const sanitized = sanitizePhoneNumber(phone);
    return sanitized.length > 10 ? sanitized.slice(-10) : sanitized;
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
