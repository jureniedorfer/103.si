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

const createSubmissionId = () => {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const logContactFailure = (submissionId, reason, details = {}) => {
  console.error("contact_form_failure", {
    submissionId,
    reason,
    ...details
  });
};

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getRedirectUrl = (request, language, status, submissionId = "") => {
  const url = new URL(request.url);
  url.pathname = language === "sl" ? "/sl/contact.html" : "/contact.html";
  const params = new URLSearchParams({ form: status });

  if (status === "error" && submissionId) {
    params.set("ref", submissionId);
  }

  url.search = `?${params.toString()}`;
  url.hash = "";

  return url.toString();
};

const redirectToContact = (request, language, status, submissionId) =>
  Response.redirect(getRedirectUrl(request, language, status, submissionId), 303);

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
  const submissionId = createSubmissionId();
  let formData;

  try {
    formData = await request.formData();
  } catch (error) {
    logContactFailure(submissionId, "invalid_form_data", {
      message: error instanceof Error ? error.message : String(error)
    });
    return redirectToContact(request, "en", "error", submissionId);
  }

  const language = getField(formData, "language") === "sl" ? "sl" : "en";
  const honeypot = getField(formData, "company");

  if (honeypot) {
    console.warn("contact_form_honeypot", { submissionId, language });
    return redirectToContact(request, language, "success");
  }

  const name = getField(formData, "name");
  const email = getField(formData, "email");
  const inquiry = getField(formData, "inquiry");
  const message = getField(formData, "message");

  if (!name || !isValidEmail(email) || !inquiry || !message) {
    logContactFailure(submissionId, "validation_failed", {
      hasName: Boolean(name),
      hasValidEmail: isValidEmail(email),
      hasInquiry: Boolean(inquiry),
      hasMessage: Boolean(message),
      language
    });
    return redirectToContact(request, language, "error", submissionId);
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_FROM_EMAIL) {
    logContactFailure(submissionId, "missing_environment", {
      hasResendApiKey: Boolean(env.RESEND_API_KEY),
      hasContactFromEmail: Boolean(env.CONTACT_FROM_EMAIL),
      hasContactToEmail: Boolean(env.CONTACT_TO_EMAIL),
      language
    });
    return redirectToContact(request, language, "error", submissionId);
  }

  const recipient = env.CONTACT_TO_EMAIL || "hello@103.si";
  const emailContent = buildEmail({ name, email, inquiry, message, language });

  let response;

  try {
    response = await fetch(RESEND_ENDPOINT, {
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
  } catch (error) {
    logContactFailure(submissionId, "resend_request_failed", {
      message: error instanceof Error ? error.message : String(error),
      language
    });
    return redirectToContact(request, language, "error", submissionId);
  }

  if (!response.ok) {
    const responseText = await response.text();

    logContactFailure(submissionId, "resend_response_not_ok", {
      resendStatus: response.status,
      resendStatusText: response.statusText,
      resendResponse: responseText.slice(0, 500),
      language
    });
    return redirectToContact(request, language, "error", submissionId);
  }

  console.info("contact_form_success", {
    submissionId,
    resendStatus: response.status,
    language
  });

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
