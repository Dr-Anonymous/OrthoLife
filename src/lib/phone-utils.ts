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

/**
 * Formats a 10-digit phone number as (XXX) XXX-XXXX or similar if needed.
 * Currently just returns the 10-digit number.
 * @param phone The phone number string to format.
 * @returns Formatted phone number string.
 */
export const formatPhoneNumber = (phone: string): string => {
    const sanitized = sanitizePhoneNumber(phone);
    if (sanitized.length >= 10) {
        return sanitized;
    }
    return phone;
};

/**
 * Formats a phone number for use in WhatsApp links.
 * If 10 digits, assumes it's an Indian number and prefixes with 91.
 * If > 10 digits, assumes it includes country code and returns as is (sanitized).
 * @param phone The phone number string to format.
 * @returns The phone number ready for WhatsApp URL.
 */
export const formatWhatsAppLink = (phone: string): string => {
    const sanitized = sanitizePhoneNumber(phone);
    if (sanitized.length === 10) {
        return `91${sanitized}`;
    }
    return sanitized;
};
