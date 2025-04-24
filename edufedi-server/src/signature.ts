import { exportJwk, importJwk } from "@fedify/fedify";

export async function createSignature(activity: object, actor: any): Promise<string> {
    if (!actor?.private_key) {
      throw new Error("Missing private key for signing");
    }
    
    const privateKey = await importJwk(
      JSON.parse(actor.private_key), 
      "private"
    );
  
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(activity))
  );
  
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    digest
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
