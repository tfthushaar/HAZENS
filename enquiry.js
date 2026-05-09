(function () {
  const FIELD_LABELS = {
    fullName: 'Name',
    email: 'Email',
    phone: 'Phone / WhatsApp',
    company: 'Company',
    city: 'City / Project Location',
    projectType: 'Project Type',
    interest: 'Product Interest',
    quantity: 'Approx. Quantity',
    timeline: 'Project Timeline',
    budget: 'Budget Range',
    message: 'Project Notes',
    sourcePage: 'Source Page',
    pageUrl: 'Page URL',
    submittedAt: 'Submitted At',
  };

  const formMarkup = `
    <div class="enquiry-backdrop" data-enquiry-backdrop aria-hidden="true">
      <section class="enquiry-modal" role="dialog" aria-modal="true" aria-labelledby="enquiry-title">
        <div class="enquiry-head">
          <div>
            <div class="enquiry-kicker">Project Enquiry</div>
            <h2 class="enquiry-title" id="enquiry-title">Begin the conversation.</h2>
          </div>
          <button class="enquiry-close" type="button" data-enquiry-close>Close</button>
        </div>
        <form class="enquiry-form" data-enquiry-form>
          <div class="enquiry-grid">
            <label class="enquiry-field">
              <span class="enquiry-label">Name *</span>
              <input class="enquiry-input" name="fullName" autocomplete="name" required>
            </label>
            <label class="enquiry-field">
              <span class="enquiry-label">Email *</span>
              <input class="enquiry-input" name="email" type="email" autocomplete="email" required>
            </label>
            <label class="enquiry-field">
              <span class="enquiry-label">Phone / WhatsApp *</span>
              <input class="enquiry-input" name="phone" autocomplete="tel" required>
            </label>
            <label class="enquiry-field">
              <span class="enquiry-label">Company</span>
              <input class="enquiry-input" name="company" autocomplete="organization">
            </label>
            <label class="enquiry-field">
              <span class="enquiry-label">City / Project Location *</span>
              <input class="enquiry-input" name="city" autocomplete="address-level2" required>
            </label>
            <label class="enquiry-field">
              <span class="enquiry-label">Project Type *</span>
              <select class="enquiry-select" name="projectType" required>
                <option value="">Select</option>
                <option>Residential</option>
                <option>Commercial</option>
                <option>Hospitality</option>
                <option>Retail</option>
                <option>Outdoor / Landscape</option>
                <option>Other</option>
              </select>
            </label>
            <label class="enquiry-field">
              <span class="enquiry-label">Product Interest</span>
              <select class="enquiry-select" name="interest">
                <option value="">Select</option>
                <option>General Lighting</option>
                <option>Focus & Adjustable</option>
                <option>Wallwashers</option>
                <option>Kitchen & Utility</option>
                <option>Outdoor & IP Rated</option>
                <option>Track Systems</option>
                <option>Profiles</option>
                <option>Wall & Surface Lighting</option>
                <option>Staircase Lighting</option>
                <option>Decorative / Designer</option>
                <option>Pendants & Suspended</option>
                <option>Full catalogue consultation</option>
              </select>
            </label>
            <label class="enquiry-field">
              <span class="enquiry-label">Approx. Quantity</span>
              <input class="enquiry-input" name="quantity" inputmode="numeric" placeholder="e.g. 24 fixtures">
            </label>
            <label class="enquiry-field">
              <span class="enquiry-label">Project Timeline</span>
              <select class="enquiry-select" name="timeline">
                <option value="">Select</option>
                <option>Immediate</option>
                <option>Within 1 month</option>
                <option>1-3 months</option>
                <option>3-6 months</option>
                <option>Planning stage</option>
              </select>
            </label>
            <label class="enquiry-field">
              <span class="enquiry-label">Budget Range</span>
              <input class="enquiry-input" name="budget" placeholder="Optional">
            </label>
            <label class="enquiry-field full">
              <span class="enquiry-label">Project Notes</span>
              <textarea class="enquiry-textarea" name="message" placeholder="Tell us about the space, products, drawings, or lighting effect you are looking for."></textarea>
            </label>
          </div>
          <div class="enquiry-actions">
            <button class="enquiry-submit" type="submit">Submit Enquiry</button>
            <div class="enquiry-note" data-enquiry-status></div>
          </div>
        </form>
      </section>
    </div>
  `;

  const getEndpoint = () => String(window.HAZEN_ENQUIRY_ENDPOINT || '').trim();
  const getMode = () => String(window.HAZEN_ENQUIRY_MODE || 'cors').trim();

  function toPayload(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    data.sourcePage = document.title || 'Hazen Website';
    data.pageUrl = window.location.href;
    data.submittedAt = new Date().toISOString();
    return data;
  }

  function setStatus(modal, message, type) {
    const status = modal.querySelector('[data-enquiry-status]');
    if (!status) return;
    status.textContent = message;
    status.classList.remove('success', 'error');
    if (type) status.classList.add(type);
  }

  function openModal(modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('enquiry-open');
    window.setTimeout(() => {
      const first = modal.querySelector('input, select, textarea, button');
      if (first) first.focus({ preventScroll: true });
    }, 60);
  }

  function closeModal(modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('enquiry-open');
  }

  async function submitEnquiry(modal, form) {
    const endpoint = getEndpoint();
    const submit = form.querySelector('.enquiry-submit');
    if (!endpoint) {
      setStatus(modal, 'Spreadsheet endpoint is not connected yet. Add the deployed sheet URL in enquiry-config.js.', 'error');
      return;
    }

    const payload = toPayload(form);
    const body = JSON.stringify({
      labels: FIELD_LABELS,
      ...payload,
    });

    submit.disabled = true;
    setStatus(modal, 'Sending enquiry...', '');
    try {
      await fetch(endpoint, {
        method: 'POST',
        mode: getMode(),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body,
      });
      form.reset();
      setStatus(modal, 'Enquiry sent. Your details have been added to the spreadsheet.', 'success');
    } catch (error) {
      setStatus(modal, 'Could not send right now. Please check the spreadsheet endpoint and try again.', 'error');
    } finally {
      submit.disabled = false;
    }
  }

  function init() {
    document.body.insertAdjacentHTML('beforeend', formMarkup);
    const modal = document.querySelector('[data-enquiry-backdrop]');
    const form = document.querySelector('[data-enquiry-form]');
    if (!modal || !form) return;

    document.addEventListener('click', event => {
      const opener = event.target.closest('[data-enquiry-open]');
      if (opener) {
        event.preventDefault();
        setStatus(modal, '', '');
        openModal(modal);
        return;
      }

      if (event.target.closest('[data-enquiry-close]') || event.target === modal) {
        closeModal(modal);
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal.classList.contains('open')) {
        closeModal(modal);
      }
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      submitEnquiry(modal, form);
    });

    window.HazenEnquiry = {
      open: () => openModal(modal),
      close: () => closeModal(modal),
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
