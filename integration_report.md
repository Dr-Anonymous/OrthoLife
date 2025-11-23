Integration Report for `send-whatsapp`

This report identifies potential integration points in the codebase where the new `send-whatsapp` function can be utilized to send notifications to patients.

1. **Appointment Booking**
   - **File:** `supabase/functions/book-appointment/index.ts`
   - **Trigger:** Successful creation of a Google Calendar event.
   - **Data Available:** Patient Name, Phone, Appointment Date/Time, Service Type.
   - **Action:** Send a confirmation message (e.g., "Your appointment for [Service] is confirmed for [Date] at [Time].").
   - **Notes:** Currently, it generates a `wa.me` link string. This logic can be augmented to automatically send the message.

2. **Prescription Generation**
   - **File:** `supabase/functions/create-docs-prescription/index.ts`
   - **Trigger:** Successful generation of the Google Doc prescription.
   - **Data Available:** Patient Name, Phone, Prescription URL (`webViewLink`).
   - **Action:** Send the prescription link to the patient (e.g., "Dear [Name], your prescription is ready: [Link]").
   - **Notes:** The function already has access to `data.phone` and returns the `url`.

3. **Pharmacy & Diagnostics Orders**
   - **File:** `supabase/functions/send-order-email/index.ts`
   - **Trigger:** Successful email dispatch for a new order.
   - **Data Available:** Patient Name, Phone, Order Type (Pharmacy/Diagnostics), Items list, Total Amount.
   - **Action:** Send an order confirmation (e.g., "We received your [Pharmacy/Diagnostics] order for ₹[Total]. We will contact you shortly.").
   - **Notes:** This function is used by both `PharmacyPage.tsx` and `DiagnosticsPage.tsx`.

4. **Appointment Cancellation**
   - **File:** `supabase/functions/cancel-appointment/index.ts` (assuming existence/logic based on `AppointmentsCard.tsx` usage)
   - **Trigger:** Cancellation of an appointment.
   - **Data Available:** Needs verification if phone number is passed. `AppointmentsCard.tsx` calls it with `eventId`. If the backend fetches event details before deleting, it might have the description which contains the phone number, but passing it explicitly from frontend might be safer.
   - **Action:** Send cancellation acknowledgement.

5. **Frontend Manual Trigger**
   - **File:** `src/pages/Consultation.tsx`
   - **Trigger:** "Save Changes" or "Print" actions.
   - **Action:** The frontend can directly call `supabase.functions.invoke('send-whatsapp', ...)` to send ad-hoc updates or prescription links immediately after the UI updates, without waiting for a backend process.

6. **Prescription Upload**
   - **File:** `supabase/functions/send-prescription-email/index.ts`
   - **Trigger:** User uploads a prescription image.
   - **Action:** Notify the clinic (if the number is the doctor's) or acknowledge receipt to the patient.
