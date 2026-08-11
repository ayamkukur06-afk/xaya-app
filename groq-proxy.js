/* =========================================================
   groq-proxy.js — Netlify Streaming Function
   Tugasnya cuma satu: terima request dari frontend XAYA,
   teruskan ke Groq API dengan menambahkan API key di sini
   (server side), lalu alirkan balik responsnya (termasuk
   respons streaming/SSE) ke browser.

   API key TIDAK PERNAH ada di kode frontend maupun di repo
   GitHub — key ini dibaca dari environment variable Netlify
   (GROQ_API_KEY), yang diisi lewat dashboard Netlify, bukan
   lewat file di repo.
   ========================================================= */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY belum diset di environment variable Netlify." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let bodyText;
  try {
    bodyText = await req.text();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Body request tidak valid." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  let groqRes;
  try {
    groqRes = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: bodyText
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Gagal menghubungi Groq API." }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }

  /* Teruskan body apa adanya (mendukung streaming SSE dan JSON biasa)
     dan teruskan juga status code + content-type dari Groq. */
  return new Response(groqRes.body, {
    status: groqRes.status,
    headers: {
      "Content-Type": groqRes.headers.get("content-type") || "application/json",
      "Cache-Control": "no-cache"
    }
  });
};

export const config = {
  path: "/.netlify/functions/groq-proxy"
};
