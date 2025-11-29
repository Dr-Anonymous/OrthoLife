import { Resend } from "npm:resend@3.5.0";
import { sendWhatsAppMessage } from "./whatsapp.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface PatientData {
  name: string;
  phone: string;
  address: string;
}

export interface OrderNotificationParams {
  orderType: string;
  patientData: PatientData;
  items: OrderItem[];
  total: number;
}

export const sendOrderNotification = async ({
  orderType,
  patientData,
  items,
  total
}: OrderNotificationParams) => {
  const itemsList = items.map((item) => `- ${item.name} x${item.quantity} - ₹${item.price * item.quantity}`).join('\n');
  const subject = orderType === 'pharmacy' ? 'New Pharmacy Order' : 'New Diagnostics Booking';
  
  const toEmails = orderType === 'pharmacy' ? [
    "gangrenesoul@gmail.com",
    "pharmacy@orthosam.com"
  ] : [
    "gangrenesoul@gmail.com",
    "diagnostics@orthosam.com"
  ];

  // Send email
  const emailResponse = await resend.emails.send({
    from: "OrthoLife <info@updates.ortho.life>",
    to: toEmails,
    reply_to: "info@ortho.life",
    subject: `${subject} - ${patientData.name}`,
    html: `
      <h2>${subject}</h2>
      
      <h3>Patient Details:</h3>
      <p><strong>Name:</strong> ${patientData.name}</p>
      <p><strong>Phone:</strong> ${patientData.phone}</p>
      <p><strong>Address:</strong> ${patientData.address}</p>
      
      <h3>${orderType === 'pharmacy' ? 'Medicines Ordered:' : 'Tests Booked:'}</h3>
      <pre>${itemsList}</pre>
      
      <p><strong>Total Amount:</strong> ₹${total}</p>
      
      <p><em>This order was placed through the OrthoLife ${orderType} portal.</em></p>
    `
  });

  // Send WhatsApp notification
  const waMessage = `👋\nWe received your ${orderType} order for ₹${total}.\nHere are the details-\n\n${itemsList}\n\nWe will contact you shortly.`;
  await sendWhatsAppMessage(patientData.phone, waMessage);

  return emailResponse;
};
