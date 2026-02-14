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
 * Validates if a phone number is a valid 10-digit number after sanitization.
 * @param phone The phone number string to validate.
 * @returns True if valid, false otherwise.
 */
export const isValidPhoneNumber = (phone: string): boolean => {
    const sanitized = sanitizePhoneNumber(phone);
    return sanitized.length === 10;
};

/**
 * Formats a 10-digit phone number as (XXX) XXX-XXXX or similar if needed.
 * Currently just returns the 10-digit number.
 * @param phone The phone number string to format.
 * @returns Formatted phone number string.
 */
export const formatPhoneNumber = (phone: string): string => {
    const sanitized = sanitizePhoneNumber(phone);
    if (sanitized.length === 10) {
        return sanitized; // Or apply formatting like `${sanitized.slice(0, 3)}-${sanitized.slice(3, 6)}-${sanitized.slice(6)}`;
    }
    return phone;
};
