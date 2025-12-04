import { sendWhatsAppMessage } from './whatsapp.ts';

export const sendOrderNotification = async (order: any, type: 'placed' | 'processed' | 'shipped' | 'delivered') => {
    console.log(`Sending ${type} notification for order ${order.id} to user ${order.user_id}`);

    try {
        const itemsList = Array.isArray(order.items)
            ? order.items.map((item: any) => `${item.name || item.displayName} x${item.quantity} ${item.orderType === 'pack' ? 'pack' : item.orderType === 'unit' ? 'unit' : ''}`).join(', ')
            : 'Items';

        let message = '';
        if (type === 'placed') {
            message = `Your order #${order.id.slice(0, 8)} has been placed successfully.\nItems: ${itemsList}\nTotal: ₹${Math.round(order.total_amount)}`;
        } else if (type === 'processed') {
            message = `Your subscription order #${order.id.slice(0, 8)} has been processed.\nItems: ${itemsList}\nTotal: ₹${Math.round(order.total_amount)}`;
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

import { Resend } from "npm:resend@2.0.0";

export const sendOrderEmail = async (order: any, type: 'pharmacy' | 'diagnostics') => {
    console.log(`Sending ${type} email for order ${order.id}`);
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    try {
        const itemsHtml = Array.isArray(order.items)
            ? order.items.map((item: any) => `<li>${item.name || item.displayName} x${item.quantity} ${item.orderType === 'pack' ? 'pack' : item.orderType === 'unit' ? 'unit' : ''} - ₹${Math.round(item.price * item.quantity)}</li>`).join('')
            : `<li>${order.items.length} items</li>`;

        const subject = type === 'pharmacy'
            ? `New Pharmacy Order #${order.id.slice(0, 8)}`
            : `New Diagnostics Booking #${order.id.slice(0, 8)}`;

        const html = `
      <h2>${subject}</h2>
      <p><strong>User ID/Phone:</strong> ${order.user_id}</p>
      ${order.delivery_info ? `<p><strong>Delivery Address:</strong> ${order.delivery_info.address}</p>` : ''}
      <p><strong>Total Amount:</strong> ₹${Math.round(order.total_amount)}</p>
      
      <h3>Items:</h3>
      <ul>
        ${itemsHtml}
      </ul>

      <p><strong>Status:</strong> ${order.status}</p>
      <p><em>This is an automated notification from OrthoLife.</em></p>
    `;

        const emailResponse = await resend.emails.send({
            from: "OrthoLife <info@updates.ortho.life>",
            to: "info@ortho.life",
            reply_to: "info@ortho.life",
            subject: subject,
            html: html,
        });

        console.log("Order email sent successfully:", emailResponse);
        return emailResponse;

    } catch (error) {
        console.error("Error sending order email:", error);
        // Don't throw, just log
    }
};
