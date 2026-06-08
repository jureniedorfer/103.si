const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const revealItems = document.querySelectorAll(".reveal");

const GA_MEASUREMENT_ID = "G-HQ1991HZQD";
const COOKIE_CONSENT_KEY = "103_cookie_consent_v1";
const COOKIE_ACCEPTED = "accepted";
const COOKIE_DECLINED = "declined";

const setHeaderState = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
};

if (header) {
  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });
}

if (nav && navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    nav.classList.toggle("is-open", !isOpen);
    document.body.classList.toggle("nav-open", !isOpen);
  });

  nav.addEventListener("click", (event) => {
    if (!event.target.closest("a")) {
      return;
    }

    navToggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
    document.body.classList.remove("nav-open");
  });
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const analyticsIdIsConfigured = () =>
  /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID) && GA_MEASUREMENT_ID !== "G-XXXXXXXXXX";

const setGoogleAnalyticsDisabled = (isDisabled) => {
  if (!analyticsIdIsConfigured()) {
    return;
  }

  window[`ga-disable-${GA_MEASUREMENT_ID}`] = isDisabled;
};

const loadGoogleAnalytics = () => {
  if (window.__googleAnalyticsLoaded || !analyticsIdIsConfigured()) {
    return;
  }

  setGoogleAnalyticsDisabled(false);
  window.__googleAnalyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  const analyticsScript = document.createElement("script");
  analyticsScript.async = true;
  analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(analyticsScript);

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
};

const getCookieConsent = () => {
  try {
    return window.localStorage.getItem(COOKIE_CONSENT_KEY);
  } catch (error) {
    return null;
  }
};

const setCookieConsent = (value) => {
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch (error) {
    return;
  }
};

const initContactFormStatus = () => {
  const status = document.querySelector("[data-contact-form-status]");

  if (!status) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const formStatus = params.get("form");

  if (!formStatus) {
    return;
  }

  const isSlovenian = document.documentElement.lang.toLowerCase().startsWith("sl");
  const messages = isSlovenian
    ? {
        success: "Hvala. Sporočilo je bilo poslano.",
        error: "Sporočila ni bilo mogoče poslati. Poskusite znova ali pišite neposredno na hello@103.si."
      }
    : {
        success: "Thank you. Your message has been sent.",
        error: "The message could not be sent. Please try again or email hello@103.si directly."
      };

  if (formStatus === "success") {
    status.textContent = messages.success;
    status.classList.add("is-visible", "is-success");
  }

  if (formStatus === "error") {
    status.textContent = messages.error;
    status.classList.add("is-visible", "is-error");
  }
};

const initCookieNotice = () => {
  const isSlovenian = document.documentElement.lang.toLowerCase().startsWith("sl");
  const cookieCopy = isSlovenian
    ? {
        label: "Obvestilo o piškotkih",
        text: "Uporabljamo nujne piškotke za delovanje strani. Analitične piškotke Google Analytics uporabimo samo z vašim soglasjem.",
        accept: "Sprejmi analitiko",
        decline: "Zavrni",
        settings: "Nastavitve piškotkov",
        policy: "Politika zasebnosti in piškotkov",
        policyHref: "politika-zasebnosti-piskotov.html"
      }
    : {
        label: "Cookie notice",
        text: "We use necessary cookies for the site to work. Google Analytics cookies are used only if you give consent.",
        accept: "Accept analytics",
        decline: "Decline",
        settings: "Cookie settings",
        policy: "Privacy and Cookie Policy",
        policyHref: "privacy-cookie-policy.html"
      };

  const footerLegal = document.querySelector(".footer-legal");
  const settingsButton = document.createElement("button");
  settingsButton.className = "footer-cookie-settings";
  settingsButton.type = "button";
  settingsButton.textContent = cookieCopy.settings;

  if (footerLegal) {
    footerLegal.appendChild(settingsButton);
  }

  const notice = document.createElement("section");
  notice.className = "cookie-notice";
  notice.setAttribute("role", "dialog");
  notice.setAttribute("aria-label", cookieCopy.label);
  notice.innerHTML = `
    <div class="cookie-notice-copy">
      <p>${cookieCopy.text}</p>
      <a href="${cookieCopy.policyHref}">${cookieCopy.policy}</a>
    </div>
    <div class="cookie-notice-actions">
      <button class="button button-light" type="button" data-cookie-decline>${cookieCopy.decline}</button>
      <button class="button button-dark" type="button" data-cookie-accept>${cookieCopy.accept}</button>
    </div>
  `;

  const showNotice = () => {
    notice.classList.add("is-visible");
  };

  const hideNotice = () => {
    notice.classList.remove("is-visible");
  };

  notice.querySelector("[data-cookie-accept]").addEventListener("click", () => {
    setCookieConsent(COOKIE_ACCEPTED);
    loadGoogleAnalytics();
    hideNotice();
  });

  notice.querySelector("[data-cookie-decline]").addEventListener("click", () => {
    setCookieConsent(COOKIE_DECLINED);
    setGoogleAnalyticsDisabled(true);
    hideNotice();
  });

  settingsButton.addEventListener("click", showNotice);
  document.body.appendChild(notice);

  const savedConsent = getCookieConsent();

  if (savedConsent === COOKIE_ACCEPTED) {
    loadGoogleAnalytics();
    return;
  }

  if (savedConsent !== COOKIE_DECLINED) {
    showNotice();
  }
};

initContactFormStatus();
initCookieNotice();
