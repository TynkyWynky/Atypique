(function () {
  var STORAGE_KEY = 'atypique-locale';
  var i18nApi = null;

  function getI18nConfig() {
    return window.ATYPIQUE_I18N || null;
  }

  function getSupportedLocales() {
    var config = getI18nConfig();
    if (config && Array.isArray(config.supportedLocales) && config.supportedLocales.length) {
      return config.supportedLocales.slice();
    }
    return ['en'];
  }

  function getDefaultLocale() {
    var config = getI18nConfig();
    return config && config.defaultLocale ? config.defaultLocale : 'en';
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

    var shortLocale = normalized.split('-')[0];
    if (supportedLocales.indexOf(shortLocale) !== -1) {
      return shortLocale;
    }

    return null;
  }

  function getNestedValue(source, path) {
    return path.split('.').reduce(function (current, part) {
      if (!current || typeof current !== 'object') {
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
    var translation = requestedLocale ? getNestedValue(requestedLocale, key) : undefined;
    if (typeof translation === 'string') {
      return translation;
    }

    var fallbackLocale = getDefaultLocale();
    if (locale !== fallbackLocale && config.locales[fallbackLocale]) {
      translation = getNestedValue(config.locales[fallbackLocale], key);
      if (typeof translation === 'string') {
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
      queryLocale = normalizeLocale(new URLSearchParams(window.location.search).get('lang'));
    } catch (error) {
      queryLocale = null;
    }

    if (queryLocale) {
      storeLocale(queryLocale);
      return queryLocale;
    }

    return normalizeLocale(readStoredLocale()) || detectBrowserLocale() || getDefaultLocale();
  }

  function applyTranslatedValue(element, binding, value) {
    if (binding.mode === 'text') {
      element.textContent = value;
      return;
    }

    if (binding.mode === 'html') {
      element.innerHTML = value;
      return;
    }

    if (binding.mode === 'value') {
      element.value = value;
    }

    element.setAttribute(binding.attribute, value);
  }

  function applyTranslations(locale) {
    var bindings = [
      { selector: '[data-i18n]', datasetKey: 'i18n', mode: 'text' },
      { selector: '[data-i18n-html]', datasetKey: 'i18nHtml', mode: 'html' },
      { selector: '[data-i18n-placeholder]', datasetKey: 'i18nPlaceholder', mode: 'attribute', attribute: 'placeholder' },
      { selector: '[data-i18n-aria-label]', datasetKey: 'i18nAriaLabel', mode: 'attribute', attribute: 'aria-label' },
      { selector: '[data-i18n-content]', datasetKey: 'i18nContent', mode: 'attribute', attribute: 'content' },
      { selector: '[data-i18n-value]', datasetKey: 'i18nValue', mode: 'value', attribute: 'value' },
      { selector: '[data-i18n-alt]', datasetKey: 'i18nAlt', mode: 'attribute', attribute: 'alt' },
      { selector: '[data-i18n-title]', datasetKey: 'i18nTitle', mode: 'attribute', attribute: 'title' }
    ];

    document.documentElement.lang = locale;

    bindings.forEach(function (binding) {
      document.querySelectorAll(binding.selector).forEach(function (element) {
        var key = element.dataset[binding.datasetKey];
        var translation = getTranslation(locale, key);
        if (typeof translation === 'string') {
          applyTranslatedValue(element, binding, translation);
        }
      });
    });

    var languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      languageSelect.value = locale;
    }
  }

  function translate(key, fallback) {
    if (!i18nApi || typeof i18nApi.getText !== 'function') {
      return fallback || '';
    }

    var value = i18nApi.getText(key);
    if (typeof value === 'string') {
      return value;
    }

    return fallback || '';
  }

  function setupI18n() {
    var currentLocale = detectPreferredLocale();
    var languageSelect = document.getElementById('languageSelect');

    function setLocale(locale, shouldPersist) {
      var nextLocale = normalizeLocale(locale) || getDefaultLocale();
      currentLocale = nextLocale;
      if (shouldPersist !== false) {
        storeLocale(nextLocale);
      }
      applyTranslations(nextLocale);
      return nextLocale;
    }

    if (languageSelect) {
      languageSelect.addEventListener('change', function (event) {
        setLocale(event.target.value);
      });
    }

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
      }
    };
  }

  function setupNavbar() {
    var navLinks = document.getElementById('navLinks');
    var hamburger = document.querySelector('.hamburger');
    var navbar = document.querySelector('.navbar');
    var navActions = document.querySelector('.nav-actions');

    if (!navLinks || !hamburger) {
      return;
    }

    function closeMenu() {
      navLinks.classList.remove('active');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }

    window.toggleMenu = function () {
      navLinks.classList.toggle('active');
      hamburger.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(navLinks.classList.contains('active')));
    };

    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', function (event) {
      if (!navLinks.classList.contains('active')) {
        return;
      }

      var clickedInsideMenu =
        navLinks.contains(event.target) ||
        hamburger.contains(event.target) ||
        (navActions && navActions.contains(event.target));

      if (!clickedInsideMenu) {
        closeMenu();
      }
    });

    var lastScrollTop = 0;
    if (navbar) {
      window.addEventListener('scroll', function () {
        var currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        if (currentScroll > lastScrollTop && currentScroll > 80) {
          navbar.classList.add('hidden');
        } else {
          navbar.classList.remove('hidden');
        }
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
      });
    }
  }

  function setupCurrentYear() {
    var yearEl = document.getElementById('currentYear');
    if (yearEl) {
      yearEl.textContent = String(new Date().getFullYear());
    }
  }

  function setupRevealAnimations() {
    var animatedEls = document.querySelectorAll('.animate-up, .animate-fade-in');
    if (!animatedEls.length || !('IntersectionObserver' in window)) {
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.12 });

    animatedEls.forEach(function (el) {
      observer.observe(el);
    });
  }

  function setupContactForm() {
    var form = document.getElementById('contactForm');
    if (!form) {
      return;
    }

    var statusEl = document.getElementById('formStatus');
    var submitBtn = document.getElementById('submitBtn');
    var nameField = form.querySelector('input[name="name"]');
    var emailField = form.querySelector('input[name="email"]');
    var messageField = form.querySelector('textarea[name="message"]');

    function setStatus(message, type) {
      if (!statusEl) {
        return;
      }
      statusEl.textContent = message;
      statusEl.classList.remove('success', 'error');
      if (type) {
        statusEl.classList.add(type);
      }
    }

    function encode(data) {
      return Object.keys(data)
        .map(function (key) {
          return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
        })
        .join('&');
    }

    function validate() {
      if (!nameField.value.trim() || nameField.value.trim().length < 2) {
        setStatus(translate('contact.form.validationName', 'Please enter a valid name (at least 2 characters).'), 'error');
        nameField.focus();
        return false;
      }

      var email = emailField.value.trim();
      var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailPattern.test(email)) {
        setStatus(translate('contact.form.validationEmail', 'Please enter a valid email address.'), 'error');
        emailField.focus();
        return false;
      }

      if (!messageField.value.trim() || messageField.value.trim().length < 20) {
        setStatus(translate('contact.form.validationMessage', 'Please provide at least 20 characters in your message.'), 'error');
        messageField.focus();
        return false;
      }

      setStatus('');
      return true;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!validate()) {
        return;
      }

      submitBtn.classList.add('is-loading');
      submitBtn.textContent = translate('contact.form.sending', 'Sending...');

      var formData = new FormData(form);
      formData.set('form-name', form.getAttribute('name'));

      if (formData.get('bot-field')) {
        submitBtn.classList.remove('is-loading');
        submitBtn.textContent = translate('contact.form.submit', 'Send Message');
        return;
      }

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encode(Object.fromEntries(formData.entries()))
      })
        .then(function (res) {
          if (!res.ok) {
            throw new Error('Request failed');
          }
          form.reset();
          setStatus(translate('contact.form.success', 'Thanks. Your message was sent successfully.'), 'success');
        })
        .catch(function () {
          setStatus(
            translate('contact.form.error', 'Something went wrong. Email us directly at atypique.professional@gmail.com.'),
            'error'
          );
        })
        .finally(function () {
          submitBtn.classList.remove('is-loading');
          submitBtn.textContent = translate('contact.form.submit', 'Send Message');
        });
    });
  }

  function setupAnalytics() {
    var domain = document.body.getAttribute('data-analytics-domain');
    if (!domain) {
      return;
    }

    var script = document.createElement('script');
    script.defer = true;
    script.setAttribute('data-domain', domain);
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);
  }

  document.addEventListener('DOMContentLoaded', function () {
    i18nApi = setupI18n();
    setupNavbar();
    setupCurrentYear();
    setupRevealAnimations();
    setupContactForm();
    setupAnalytics();
  });
})();
