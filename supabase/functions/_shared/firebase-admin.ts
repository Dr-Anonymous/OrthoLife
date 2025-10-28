// supabase/functions/_shared/firebase-admin.ts
import admin from "https://esm.sh/firebase-admin@11.11.1?no-check";

// Ensure the app is only initialized once
if (admin.apps.length === 0) {
  try {
    const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n");
    const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");

    if (!privateKey || !clientEmail || !projectId) {
      throw new Error("Missing Firebase Admin SDK credentials in environment variables.");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.error("Firebase admin initialization error:", error.message);
  }
}

export { admin };
