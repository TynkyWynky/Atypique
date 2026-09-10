(function () {
  var STORAGE_KEY = "specialeke-locale";
  var SITE_ORIGIN = "https://specialeke.com";
  var DEFAULT_SOCIAL_IMAGE = SITE_ORIGIN + "/images/SpecialekeLogo.png";
  var OG_LOCALE_MAP = {
    en: "en_US",
    fr: "fr_BE",
    nl: "nl_BE",
  };
  var i18nApi = null;
  function getI18nConfig() {
    return window.SPECIALEKE_I18N || null;
  }

  function getSupportedLocales() {
    var config = getI18nConfig();
    if (
      config &&
      Array.isArray(config.supportedLocales) &&
      config.supportedLocales.length
    ) {
      return config.supportedLocales.slice();
    }
    return ["en"];
  }

  function getDefaultLocale() {
    var config = getI18nConfig();
    return config && config.defaultLocale ? config.defaultLocale : "en";
  }

  function normalizeLocale(locale) {
    if (!locale) {
      return null;
    }

    var supportedLocales = getSupportedLocales();
    var normalized = String(locale).trim().toLowerCase();
    if (supportedLocales.indexOf(normalized) !== -1) {
      return normalized;
    }

    var shortLocale = normalized.split("-")[0];
    if (supportedLocales.indexOf(shortLocale) !== -1) {
      return shortLocale;
    }

    return null;
  }

  function getNestedValue(source, path) {
    return path.split(".").reduce(function (current, part) {
      if (!current || typeof current !== "object") {
        return undefined;
      }
      return current[part];
    }, source);
  }

  function getTranslation(locale, key) {
    var config = getI18nConfig();
    if (!config || !config.locales) {
      return null;
    }

    var requestedLocale = config.locales[locale];
    var translation = requestedLocale
      ? getNestedValue(requestedLocale, key)
      : undefined;
    if (typeof translation === "string") {
      return translation;
    }

    var fallbackLocale = getDefaultLocale();
    if (locale !== fallbackLocale && config.locales[fallbackLocale]) {
      translation = getNestedValue(config.locales[fallbackLocale], key);
      if (typeof translation === "string") {
        return translation;
      }
    }

    return null;
  }

  function readStoredLocale() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function storeLocale(locale) {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch (error) {
      return null;
    }
    return locale;
  }

  function detectBrowserLocale() {
    var candidates = [];

    if (Array.isArray(window.navigator.languages)) {
      candidates = candidates.concat(window.navigator.languages);
    }

    if (window.navigator.language) {
      candidates.push(window.navigator.language);
    }

    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = normalizeLocale(candidates[i]);
      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  function detectPreferredLocale() {
    var queryLocale = null;

    try {
      queryLocale = normalizeLocale(
        new URLSearchParams(window.location.search).get("lang"),
      );
    } catch (error) {
      queryLocale = null;
    }

    if (queryLocale) {
      storeLocale(queryLocale);
      return queryLocale;
    }

    return (
      normalizeLocale(readStoredLocale()) ||
      detectBrowserLocale() ||
      getDefaultLocale()
    );
  }

  function getCurrentPagePath() {
    var pathname = window.location.pathname || "/";
    if (pathname === "/index.html") {
      return "/";
    }
    return pathname;
  }

  function buildLocalizedUrl(locale) {
    var nextLocale = normalizeLocale(locale) || getDefaultLocale();
    var url = new URL(getCurrentPagePath(), SITE_ORIGIN + "/");

    url.search = "";
    if (nextLocale !== getDefaultLocale()) {
      url.searchParams.set("lang", nextLocale);
    }

    return url.toString();
  }

  function buildLocalizedHistoryPath(locale) {
    var url = new URL(window.location.href);
    url.searchParams.set("lang", normalizeLocale(locale) || getDefaultLocale());
    return url.pathname + url.search + url.hash;
  }

  function buildLocalizedPathUrl(path, locale) {
    var nextLocale = normalizeLocale(locale) || getDefaultLocale();
    var normalizedPath = path === "/index.html" ? "/" : path;
    var url = new URL(normalizedPath, SITE_ORIGIN + "/");

    url.search = "";
    if (nextLocale !== getDefaultLocale()) {
      url.searchParams.set("lang", nextLocale);
    }

    return url.toString();
  }

  function getMetaTag(selector) {
    return document.querySelector(selector);
  }

  function getMetaContent(selector) {
    var tag = getMetaTag(selector);
    return tag ? tag.getAttribute("content") || "" : "";
  }

  function setHref(selector, value) {
    var element = document.querySelector(selector);
    if (element) {
      element.setAttribute("href", value);
    }
  }

  function setContent(selector, value) {
    var element = getMetaTag(selector);
    if (element) {
      element.setAttribute("content", value);
    }
  }

  function updateAlternateLinks(locale) {
    var defaultUrl = buildLocalizedUrl(getDefaultLocale());
    var currentLocale = normalizeLocale(locale) || getDefaultLocale();

    getSupportedLocales().forEach(function (supportedLocale) {
      var alternate = document.querySelector(
        'link[rel="alternate"][hreflang="' + supportedLocale + '"]',
      );
      if (alternate) {
        alternate.setAttribute("href", buildLocalizedUrl(supportedLocale));
      }
    });

    var xDefault = document.querySelector(
      'link[rel="alternate"][hreflang="x-default"]',
    );
    if (xDefault) {
      xDefault.setAttribute("href", defaultUrl);
    }

    setHref("#seo-canonical", buildLocalizedUrl(currentLocale));
  }

  function getTranslationText(locale, key, fallback) {
    var value = getTranslation(locale, key);
    return typeof value === "string" ? value : fallback;
  }

  function buildBreadcrumbItem(position, name, item) {
    return {
      "@type": "ListItem",
      position: position,
      name: name,
      item: item,
    };
  }

  function updateStructuredData(locale) {
    var pagePath = getCurrentPagePath();
    var pageUrl = buildLocalizedUrl(locale);
    var pageName = document.title;
    var pageDescription = getMetaContent('meta[name="description"]');
    var pageImage =
      getMetaContent('meta[property="og:image"]') || DEFAULT_SOCIAL_IMAGE;
    var websiteId = SITE_ORIGIN + "/#website";
    var organizationId = SITE_ORIGIN + "/#organization";
    var graph = [];
    var organizationDescription = getTranslationText(
      locale,
      "home.meta.description",
      "Specialeke is a digital studio building modern web apps, SaaS products, and conversion-focused websites.",
    );
    var pageType = "WebPage";
    var breadcrumbItems = [
      buildBreadcrumbItem(
        1,
        getTranslationText(locale, "shared.nav.home", "Home"),
        buildLocalizedPathUrl("/", locale),
      ),
    ];

    graph.push({
      "@type": "ProfessionalService",
      "@id": organizationId,
      name: "Specialeke",
      url: SITE_ORIGIN + "/",
      logo: {
        "@type": "ImageObject",
        url: DEFAULT_SOCIAL_IMAGE,
      },
      image: pageImage,
      description: organizationDescription,
      email: "atypique.professional@gmail.com",
      sameAs: [
        "https://www.instagram.com/specialeke.enterprise/",
        "https://www.linkedin.com/company/specialeke-enterprise/",
      ],
      areaServed: ["BE", "NL", "FR", "EU"],
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "sales",
          email: "atypique.professional@gmail.com",
          availableLanguage: getSupportedLocales(),
        },
      ],
      knowsAbout: [
        "Web development",
        "UX design",
        "UI design",
        "Front-end development",
        "SEO-ready website structure",
        "SaaS product design",
      ],
    });

    graph.push({
      "@type": "WebSite",
      "@id": websiteId,
      url: SITE_ORIGIN + "/",
      name: "Specialeke",
      description: organizationDescription,
      inLanguage: locale,
      publisher: {
        "@id": organizationId,
      },
    });

    if (pagePath === "/about.html") {
      pageType = "AboutPage";
      breadcrumbItems.push(
        buildBreadcrumbItem(
          2,
          getTranslationText(locale, "shared.nav.about", "About Us"),
          buildLocalizedPathUrl("/about.html", locale),
        ),
      );
    } else if (pagePath === "/services.html") {
      pageType = "WebPage";
      breadcrumbItems.push(
        buildBreadcrumbItem(
          2,
          getTranslationText(locale, "shared.nav.services", "Services"),
          buildLocalizedPathUrl("/services.html", locale),
        ),
      );
      graph.push({
        "@type": "OfferCatalog",
        "@id": SITE_ORIGIN + "/services.html#catalog",
        name: getTranslationText(
          locale,
          "design.servicesTitle",
          "From idea to launch, with zero guesswork.",
        ),
        itemListElement: [
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: getTranslationText(
                locale,
                "design.websites",
                "Web Development",
              ),
              description: getTranslationText(
                locale,
                "design.websitesBody",
                "High-performing websites and business platforms that stay maintainable after launch.",
              ),
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: getTranslationText(locale, "design.ux", "UI/UX Design"),
              description: getTranslationText(
                locale,
                "design.uxBody",
                "Clear interfaces and interaction flows tailored to your users and business model.",
              ),
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: getTranslationText(
                locale,
                "design.products",
                "Product Interfaces",
              ),
              description: getTranslationText(
                locale,
                "design.productsBody",
                "Cross-device design systems and front-end experiences with strong usability.",
              ),
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: getTranslationText(
                locale,
                "design.development",
                "Growth Support",
              ),
              description: getTranslationText(
                locale,
                "design.developmentBody",
                "SEO-ready structure, conversion-oriented pages and practical optimization loops.",
              ),
            },
          },
        ],
      });
    } else if (pagePath === "/products.html") {
      pageType = "CollectionPage";
      breadcrumbItems.push(
        buildBreadcrumbItem(
          2,
          getTranslationText(locale, "shared.nav.work", "Work"),
          buildLocalizedPathUrl("/products.html", locale),
        ),
      );
      graph.push({
        "@type": "ItemList",
        "@id": SITE_ORIGIN + "/products.html#portfolio",
        name: getTranslationText(
          locale,
          "products.header.title",
          "Selected projects built for clarity, usability, and momentum.",
        ),
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            item: {
              "@type": "CreativeWork",
              name: "Eventium",
              url: SITE_ORIGIN + "/products.html#eventium",
              description: getTranslationText(
                locale,
                "products.eventium.summary",
                "Eventium is a discovery platform that helps people find concerts, nightlife, and local events.",
              ),
            },
          },
          {
            "@type": "ListItem",
            position: 2,
            item: {
              "@type": "CreativeWork",
              name: "Chiro Negenmanneke",
              url: SITE_ORIGIN + "/products.html#chiro-negenmanneke",
              description: getTranslationText(
                locale,
                "products.chiro.summary",
                "Chiro Negenmanneke is a community website built to help parents, members, and volunteers quickly access practical information.",
              ),
            },
          },
          {
            "@type": "ListItem",
            position: 3,
            item: {
              "@type": "CreativeWork",
              name: "Au Fil du Sport",
              url: SITE_ORIGIN + "/products.html#au-fil-du-sport",
              description: getTranslationText(
                locale,
                "products.aufil.summary",
                "A website for a small sportswear and textile personalisation business, with a catalogue and a tailored enquiry form.",
              ),
            },
          },
        ],
      });
    } else if (pagePath === "/contact.html") {
      pageType = "ContactPage";
      breadcrumbItems.push(
        buildBreadcrumbItem(
          2,
          getTranslationText(locale, "shared.nav.contact", "Contact"),
          buildLocalizedPathUrl("/contact.html", locale),
        ),
      );
    }

    var pageNode = {
      "@type": pageType,
      "@id": pageUrl + "#webpage",
      url: pageUrl,
      name: pageName,
      description: pageDescription,
      inLanguage: locale,
      isPartOf: {
        "@id": websiteId,
      },
      about: {
        "@id": organizationId,
      },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: pageImage,
      },
    };

    if (pagePath !== "/") {
      pageNode.breadcrumb = {
        "@id": pageUrl + "#breadcrumb",
      };
    }

    graph.push(pageNode);

    if (pagePath !== "/") {
      graph.push({
        "@type": "BreadcrumbList",
        "@id": pageUrl + "#breadcrumb",
        itemListElement: breadcrumbItems,
      });
    }

    if (pagePath === "/contact.html") {
      graph.push({
        "@type": "ContactPoint",
        "@id": pageUrl + "#contact-point",
        contactType: "sales",
        email: "atypique.professional@gmail.com",
        availableLanguage: getSupportedLocales(),
      });
    }

    var schemaScript = document.getElementById("dynamic-structured-data");
    if (!schemaScript) {
      schemaScript = document.createElement("script");
      schemaScript.type = "application/ld+json";
      schemaScript.id = "dynamic-structured-data";
      document.head.appendChild(schemaScript);
    }

    schemaScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": graph,
    });
  }

  function updateSeoSignals(locale) {
    var nextLocale = normalizeLocale(locale) || getDefaultLocale();

    updateAlternateLinks(nextLocale);
    setContent("#meta-og-url", buildLocalizedUrl(nextLocale));
    setContent(
      "#meta-og-locale",
      OG_LOCALE_MAP[nextLocale] || OG_LOCALE_MAP.en,
    );
    updateStructuredData(nextLocale);
  }

  function applyTranslatedValue(element, binding, value) {
    if (binding.mode === "text") {
      element.textContent = value;
      return;
    }

    if (binding.mode === "html") {
      element.innerHTML = value;
      return;
    }

    if (binding.mode === "value") {
      element.value = value;
    }

    element.setAttribute(binding.attribute, value);
  }

  function applyTranslations(locale) {
    var bindings = [
      { selector: "[data-i18n]", datasetKey: "i18n", mode: "text" },
      { selector: "[data-i18n-html]", datasetKey: "i18nHtml", mode: "html" },
      {
        selector: "[data-i18n-placeholder]",
        datasetKey: "i18nPlaceholder",
        mode: "attribute",
        attribute: "placeholder",
      },
      {
        selector: "[data-i18n-aria-label]",
        datasetKey: "i18nAriaLabel",
        mode: "attribute",
        attribute: "aria-label",
      },
      {
        selector: "[data-i18n-content]",
        datasetKey: "i18nContent",
        mode: "attribute",
        attribute: "content",
      },
      {
        selector: "[data-i18n-value]",
        datasetKey: "i18nValue",
        mode: "value",
        attribute: "value",
      },
      {
        selector: "[data-i18n-alt]",
        datasetKey: "i18nAlt",
        mode: "attribute",
        attribute: "alt",
      },
      {
        selector: "[data-i18n-title]",
        datasetKey: "i18nTitle",
        mode: "attribute",
        attribute: "title",
      },
    ];

    document.documentElement.lang = locale;

    bindings.forEach(function (binding) {
      document.querySelectorAll(binding.selector).forEach(function (element) {
        var key = element.dataset[binding.datasetKey];
        var translation = getTranslation(locale, key);
        if (typeof translation === "string") {
          applyTranslatedValue(element, binding, translation);
        }
      });
    });

    document.querySelectorAll("[data-locale]").forEach(function (link) {
      var targetLocale = link.getAttribute("data-locale");
      var target = new URL(window.location.href);
      target.searchParams.set("lang", targetLocale);
      link.setAttribute("href", target.pathname + target.search + target.hash);
      if (targetLocale === locale) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    document.querySelectorAll("a[href]").forEach(function (link) {
      var href = link.getAttribute("href");
      if (link.hasAttribute("data-locale") || href.charAt(0) === "#") return;
      var target = new URL(href, window.location.href);
      if (
        target.origin === window.location.origin &&
        /(?:\.html|\/)$/.test(target.pathname)
      ) {
        target.searchParams.set("lang", locale);
        link.setAttribute(
          "href",
          target.pathname + target.search + target.hash,
        );
      }
    });

    updateSeoSignals(locale);
  }

  function translate(key, fallback) {
    if (!i18nApi || typeof i18nApi.getText !== "function") {
      return fallback || "";
    }

    var value = i18nApi.getText(key);
    if (typeof value === "string") {
      return value;
    }

    return fallback || "";
  }

  function setupI18n() {
    var currentLocale = detectPreferredLocale();

    function setLocale(locale, shouldPersist) {
      var nextLocale = normalizeLocale(locale) || getDefaultLocale();
      currentLocale = nextLocale;
      if (shouldPersist !== false) {
        storeLocale(nextLocale);
      }
      applyTranslations(nextLocale);
      if (window.history && typeof window.history.replaceState === "function") {
        window.history.replaceState(
          null,
          "",
          buildLocalizedHistoryPath(nextLocale),
        );
      }
      return nextLocale;
    }

    document.querySelectorAll("[data-locale]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        setLocale(link.getAttribute("data-locale"));
      });
    });

    setLocale(currentLocale, false);

    return {
      getLocale: function () {
        return currentLocale;
      },
      getText: function (key) {
        return getTranslation(currentLocale, key);
      },
      setLocale: function (locale) {
        return setLocale(locale);
      },
    };
  }

  function setupNavbar() {
    var nav = document.getElementById("navLinks");
    var toggle = document.querySelector(".hamburger");
    var navbar = document.querySelector(".navbar");
    if (!nav || !toggle || !navbar) return;
    document.body.classList.add("nav-ready");

    function closeMenu(restoreFocus) {
      nav.classList.remove("active");
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      if (restoreFocus) toggle.focus();
    }

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      nav.classList.toggle("active", open);
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      if (open) nav.querySelector("a").focus();
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu(false);
      });
    });
    document.addEventListener("keydown", function (event) {
      if (
        event.key === "Escape" &&
        toggle.getAttribute("aria-expanded") === "true"
      )
        closeMenu(true);
    });
    document.addEventListener("click", function (event) {
      if (!navbar.contains(event.target)) closeMenu(false);
    });
    navbar.addEventListener("focusout", function (event) {
      if (event.relatedTarget && !navbar.contains(event.relatedTarget))
        closeMenu(false);
    });
    window
      .matchMedia("(min-width: 761px)")
      .addEventListener("change", function () {
        closeMenu(false);
      });
  }

  function setupCurrentYear() {
    var year = document.getElementById("currentYear");
    if (year) year.textContent = String(new Date().getFullYear());
    var clock = document.querySelector(".local-time");
    if (clock) {
      var updateClock = function () {
        clock.textContent = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Brussels",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date());
      };
      updateClock();
      window.setInterval(updateClock, 60000);
    }
  }

  function setupContactForm() {
    var form = document.getElementById("contactForm");
    if (!form) return;
    var status = document.getElementById("formStatus");
    var submit = document.getElementById("submitBtn");
    var fields = [
      form.elements.name,
      form.elements.email,
      form.elements.message,
    ];

    function setStatus(key, type) {
      status.textContent = key ? translate(key) : "";
      status.className = "form-status" + (type ? " " + type : "");
      if (key) status.setAttribute("data-i18n", key);
      else status.removeAttribute("data-i18n");
    }

    fields.forEach(function (field) {
      field.addEventListener("input", function () {
        field.removeAttribute("aria-invalid");
      });
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (submit.disabled || form.elements["bot-field"].value) return;
      var checks = [
        fields[0].value.trim().length >= 2 && fields[0].value.length <= 80,
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields[1].value.trim()) &&
          fields[1].value.length <= 120,
        fields[2].value.trim().length >= 20 && fields[2].value.length <= 3000,
      ];
      var keys = ["validationName", "validationEmail", "validationMessage"];
      fields.forEach(function (field) {
        field.removeAttribute("aria-invalid");
      });
      for (var i = 0; i < checks.length; i += 1) {
        if (!checks[i]) {
          fields[i].setAttribute("aria-invalid", "true");
          setStatus("contact.form." + keys[i], "error");
          fields[i].focus();
          return;
        }
      }
      setStatus("");
      submit.disabled = true;
      submit.setAttribute("data-i18n", "contact.form.sending");
      submit.textContent = translate("contact.form.sending", "Sending...");
      form.setAttribute("aria-busy", "true");
      var data = new FormData(form);
      data.set("form-name", form.getAttribute("name"));
      var controller = new AbortController();
      var timeout = window.setTimeout(function () {
        controller.abort();
      }, 15000);
      try {
        var response = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(data).toString(),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Form delivery failed");
        form.reset();
        // Reset restores the HTML default; keep the email subject in the chosen language.
        form.elements._subject.value = translate("contact.form.subject");
        setStatus("contact.form.success", "success");
      } catch {
        setStatus("contact.form.error", "error");
      } finally {
        window.clearTimeout(timeout);
        submit.disabled = false;
        submit.setAttribute("data-i18n", "contact.form.submit");
        submit.textContent = translate("contact.form.submit", "Send Message");
        form.removeAttribute("aria-busy");
      }
    });
  }

  function setupAnalytics() {
    var domain = document.body.getAttribute("data-analytics-domain");
    if (!domain) {
      return;
    }

    var script = document.createElement("script");
    script.defer = true;
    script.setAttribute("data-domain", domain);
    script.src = "https://plausible.io/js/script.js";
    document.head.appendChild(script);
  }

  document.addEventListener("DOMContentLoaded", function () {
    i18nApi = setupI18n();
    setupNavbar();
    setupCurrentYear();
    setupContactForm();
    setupAnalytics();
  });
})();
