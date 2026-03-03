(function () {
  function setupNavbar() {
    var navLinks = document.getElementById('navLinks');
    var hamburger = document.querySelector('.hamburger');
    var navbar = document.querySelector('.navbar');

    if (!navLinks || !hamburger) {
      return;
    }

    window.toggleMenu = function () {
      navLinks.classList.toggle('active');
      hamburger.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(navLinks.classList.contains('active')));
    };

    document.addEventListener('click', function (event) {
      if (!navLinks.classList.contains('active')) {
        return;
      }
      var clickedInsideMenu = navLinks.contains(event.target) || hamburger.contains(event.target);
      if (!clickedInsideMenu) {
        navLinks.classList.remove('active');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
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
        setStatus('Please enter a valid name (at least 2 characters).', 'error');
        nameField.focus();
        return false;
      }

      var email = emailField.value.trim();
      var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailPattern.test(email)) {
        setStatus('Please enter a valid email address.', 'error');
        emailField.focus();
        return false;
      }

      if (!messageField.value.trim() || messageField.value.trim().length < 20) {
        setStatus('Please provide at least 20 characters in your message.', 'error');
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
      submitBtn.textContent = 'Sending...';

      var formData = new FormData(form);
      formData.set('form-name', form.getAttribute('name'));

      if (formData.get('bot-field')) {
        submitBtn.classList.remove('is-loading');
        submitBtn.textContent = 'Send Message';
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
          setStatus('Thanks. Your message was sent successfully.', 'success');
        })
        .catch(function () {
          setStatus('Something went wrong. Email us directly at atypique.professional@gmail.com.', 'error');
        })
        .finally(function () {
          submitBtn.classList.remove('is-loading');
          submitBtn.textContent = 'Send Message';
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
    setupNavbar();
    setupCurrentYear();
    setupRevealAnimations();
    setupContactForm();
    setupAnalytics();
  });
})();
