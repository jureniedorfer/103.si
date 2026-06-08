const MAX_FIELD_LENGTH = 3000;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

const getField = (formData, name) => {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, MAX_FIELD_LENGTH);
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getRedirectUrl = (request, language, status) => {
  const url = new URL(request.url);
  url.pathname = language === "sl" ? "/sl/contact.html" : "/contact.html";
  url.search = `?form=${status}`;
  url.hash = "";

  return url.toString();
};

const redirectToContact = (request, language, status) =>
  Response.redirect(getRedirectUrl(request, language, status), 303);

const buildEmail = ({ name, email, inquiry, message, language }) => {
  const rows = [
    ["Language", language],
    ["Name", name],
    ["Email", email],
    ["Inquiry type", inquiry],
    ["Message", message]
  ];

  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n\n");
  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" valign="top" style="padding:8px;border-bottom:1px solid #ddd;">${escapeHtml(label)}</th><td style="padding:8px;border-bottom:1px solid #ddd;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  return {
    subject: `New 103.si enquiry: ${inquiry}`,
    text,
    html: `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">${htmlRows}</table>`
  };
};

const handleContactSubmission = async (request, env) => {
  let formData;

  try {
    formData = await request.formData();
  } catch (error) {
    return redirectToContact(request, "en", "error");
  }

  const language = getField(formData, "language") === "sl" ? "sl" : "en";
  const honeypot = getField(formData, "company");

  if (honeypot) {
    return redirectToContact(request, language, "success");
  }

  const name = getField(formData, "name");
  const email = getField(formData, "email");
  const inquiry = getField(formData, "inquiry");
  const message = getField(formData, "message");

  if (!name || !isValidEmail(email) || !inquiry || !message) {
    return redirectToContact(request, language, "error");
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_FROM_EMAIL) {
    return redirectToContact(request, language, "error");
  }

  const recipient = env.CONTACT_TO_EMAIL || "hello@103.si";
  const emailContent = buildEmail({ name, email, inquiry, message, language });

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM_EMAIL,
      to: [recipient],
      reply_to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    })
  });

  if (!response.ok) {
    return redirectToContact(request, language, "error");
  }

  return redirectToContact(request, language, "success");
};

export default {
  fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", {
          status: 405,
          headers: {
            Allow: "POST"
          }
        });
      }

      return handleContactSubmission(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
