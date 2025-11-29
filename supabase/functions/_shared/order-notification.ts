import { sendWhatsAppMessage } from './whatsapp.ts';

export const sendOrderNotification = async (order: any, type: 'placed' | 'processed' | 'shipped' | 'delivered') => {
    console.log(`Sending ${type} notification for order ${order.id} to user ${order.user_id}`);

    try {
        const itemsList = Array.isArray(order.items)
            ? order.items.map((item: any) => `${item.name || item.displayName} x${item.quantity}`).join(', ')
            : 'Items';

        let message = '';
        if (type === 'placed') {
            message = `Your order #${order.id.slice(0, 8)} has been placed successfully.\nItems: ${itemsList}\nTotal: ₹${order.total_amount}`;
        } else if (type === 'processed') {
            message = `Your subscription order #${order.id.slice(0, 8)} has been processed.\nItems: ${itemsList}\nTotal: ₹${order.total_amount}`;
        } else {
            message = `Update for order #${order.id.slice(0, 8)}: ${type}`;
        }

        // Assuming user_id is the phone number as per design
        const phoneNumber = order.user_id;

        if (phoneNumber) {
            await sendWhatsAppMessage(phoneNumber, message);
            console.log('WhatsApp notification sent successfully');
        } else {
            console.log('No phone number found for user, skipping WhatsApp notification');
        }

    } catch (error) {
        console.error('Error sending notification:', error);
    }
};
