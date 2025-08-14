import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Buffer } from "node:buffer";
import { Resend } from "npm:resend@2.0.0";
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const handler = async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const formData = await req.formData();
    const name = formData.get("name");
    const phone = formData.get("phone");
    const address = formData.get("address");
    const notes = formData.get("notes");
    // Convert files directly to Base64
    const files = formData.getAll("files");
    const attachments = [];
    for (const file of files){
      if (!(file instanceof File)) continue;
      const arrayBuffer = await file.arrayBuffer();
      const base64Content = Buffer.from(arrayBuffer).toString("base64");
      attachments.push({
        filename: file.name,
        content: base64Content
      });
    }
    const emailResponse = await resend.emails.send({
      from: "OrthoLife <info@updates.ortho.life>",
      to: "info@ortho.life",
      reply_to: "info@ortho.life",
      subject: `New Prescription Upload - ${name}`,
      html: `
        <h2>New Prescription Upload</h2>

        <h3>Patient Details:</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Notes:</strong> ${notes}</p>

        <p><em>This prescription was uploaded through the OrthoLife pharmacy portal.</em></p>
      `,
      attachments: attachments
    });
    //console.log("Prescription email sent successfully:", emailResponse);
    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error in send-prescription-email function:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
};
serve(handler);
