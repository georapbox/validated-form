/**
 * NOTE ABOUT VALIDATION IN TESTS
 *
 * We intentionally do NOT use native constraints like `required`, `type="email"`,
 * or `pattern` to make controls invalid.
 *
 * Native browser validation differs across engines and environments
 * (headless vs real browser, localization of messages, timing of invalid events).
 *
 * Instead we use `setCustomValidity()` to:
 * - deterministically control validity state
 * - provide stable validation messages
 * - avoid implicit `invalid` events unless explicitly triggered
 *
 * This keeps tests reliable and browser-agnostic.
 */

import { expect, fixture, fixtureCleanup, html } from '@open-wc/testing';
import sinon from 'sinon';
import { ValidatedForm } from '../src/validated-form.js';

ValidatedForm.define();

function setInvalid(control, message = 'Required') {
  control.setCustomValidity(message);
}

function setValid(control) {
  control.setCustomValidity('');
}

function triggerInvalid(control) {
  control.checkValidity?.();
}

function errorEl(root, name) {
  return root.querySelector(`[data-error-for="${CSS.escape(name)}"]`);
}

function dispatchSubmitWithoutNavigation(form) {
  let preventedByComponent = false;

  const stopper = e => {
    preventedByComponent = e.defaultPrevented;
    e.preventDefault(); // always stop actual navigation
  };

  form.addEventListener('submit', stopper);

  const evt = new SubmitEvent('submit', { cancelable: true, bubbles: true });
  form.dispatchEvent(evt);

  form.removeEventListener('submit', stopper);

  return preventedByComponent;
}

describe('validated-form', () => {
  afterEach(() => {
    fixtureCleanup();
    sinon.restore();
  });

  describe('properties - attribures', () => {
    // noFocus
    it('reflects property "noFocus" to attribute "no-focus"', async () => {
      const el = await fixture(html`<validated-form></validated-form>`);
      el.noFocus = true;
      expect(el.hasAttribute('no-focus')).to.be.true;
      el.noFocus = false;
      expect(el.hasAttribute('no-focus')).to.be.false;
    });

    it('reflects attribute "no-focus" to property "noFocus"', async () => {
      const el = await fixture(html`<validated-form no-focus></validated-form>`);
      expect(el.noFocus).to.be.true;
    });

    // report
    it('reflects property "report" to attribute "report"', async () => {
      const el = await fixture(html`<validated-form></validated-form>`);
      el.report = 'first';
      expect(el.getAttribute('report')).to.equal('first');
      el.report = 'all';
      expect(el.getAttribute('report')).to.equal('all');
    });

    it('reflects attribute "report" to property "report"', async () => {
      const el = await fixture(html`<validated-form report="first"></validated-form>`);
      expect(el.report).to.equal('first');
    });
  });

  describe('wiring / setup', () => {
    it('sets form.noValidate = true when a form exists', async () => {
      const el = await fixture(html`
        <validated-form>
          <form>
            <input name="a" />
          </form>
        </validated-form>
      `);

      const form = el.querySelector('form');
      expect(form !== null).to.be.true;
      expect(form.noValidate).to.be.true;
    });

    it('does nothing when no <form> is present', async () => {
      const el = await fixture(html`<validated-form></validated-form>`);
      expect(() => el.validate()).not.to.throw();
      expect(() => el.resetValidation()).not.to.throw();
      expect(el.isValid()).to.be.true;
    });
  });

  describe('validate() / submit flow', () => {
    it('validate() returns false and creates an error element for an invalid control', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');
      setInvalid(input, 'A is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      const err = errorEl(el, 'a');
      expect(err !== null).to.be.true;
      expect(err.textContent).to.equal('A is invalid');
      expect(err.hasAttribute('hidden')).to.be.false;

      expect(input.hasAttribute('data-invalid')).to.be.true;
    });

    it('on successful submit it clears all errors', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" />
            <button type="submit">Submit</button>
          </form>
        </validated-form>
      `);

      const form = el.querySelector('form');
      const input = el.querySelector('input');

      // First submit: invalid -> component prevents + shows error
      setInvalid(input, 'A is invalid');
      const prevented1 = dispatchSubmitWithoutNavigation(form);

      expect(prevented1).to.be.true;

      const err = errorEl(el, 'a');
      expect(err !== null).to.be.true;
      expect(err.textContent).to.equal('A is invalid');
      expect(err.hasAttribute('hidden')).to.be.false;
      expect(input.hasAttribute('data-invalid')).to.be.true;

      // Second submit: valid -> component should NOT prevent, but errors should clear
      setValid(input);
      const prevented2 = dispatchSubmitWithoutNavigation(form);

      expect(prevented2).to.be.false;

      expect(err.textContent).to.equal('');
      expect(err.hasAttribute('hidden')).to.be.true;
      expect(input.hasAttribute('data-invalid')).to.be.false;
    });

    it('report="first" only shows the first invalid control', async () => {
      const el = await fixture(html`
        <validated-form report="first" no-focus>
          <form>
            <input name="a" />
            <input name="b" />
          </form>
        </validated-form>
      `);

      const [a, b] = el.querySelectorAll('input');

      setInvalid(a, 'A is invalid');
      setInvalid(b, 'B is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      const errA = errorEl(el, 'a');
      const errB = errorEl(el, 'b');

      expect(errA !== null).to.be.true;
      expect(errA.textContent).to.equal('A is invalid');

      // Should not create/show B's error in "first" mode
      expect(errB === null).to.be.true;
      expect(b.hasAttribute('data-invalid')).to.be.false;
    });

    it('report="all" shows errors for all invalid controls', async () => {
      const el = await fixture(html`
        <validated-form report="all" no-focus>
          <form>
            <input name="a" />
            <input name="b" />
          </form>
        </validated-form>
      `);

      const [a, b] = el.querySelectorAll('input');

      setInvalid(a, 'A is invalid');
      setInvalid(b, 'B is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      const errA = errorEl(el, 'a');
      const errB = errorEl(el, 'b');

      expect(errA !== null).to.be.true;
      expect(errA.textContent).to.equal('A is invalid');
      expect(a.hasAttribute('data-invalid')).to.be.true;

      expect(errB !== null).to.be.true;
      expect(errB.textContent).to.equal('B is invalid');
      expect(b.hasAttribute('data-invalid')).to.be.true;
    });

    it('focuses first invalid control by default', async () => {
      const el = await fixture(html`
        <validated-form>
          <form>
            <input name="a" />
            <input name="b" />
          </form>
        </validated-form>
      `);

      const [a, b] = el.querySelectorAll('input');

      setInvalid(a, 'A is invalid');
      setInvalid(b, 'B is invalid');

      const spy = sinon.spy(a, 'focus');

      el.validate();
      sinon.assert.calledOnce(spy);
    });

    it('does not focus when no-focus is set', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" />
          </form>
        </validated-form>
      `);

      const a = el.querySelector('input');

      setInvalid(a, 'A is invalid');

      const spy = sinon.spy(a, 'focus');

      el.validate();
      sinon.assert.notCalled(spy);
    });
  });

  describe('which elements participate in validation', () => {
    it('ignores non-validatable form elements (e.g. <button>)', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <button type="button">Click</button>
            <input name="a" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');
      setInvalid(input, 'A is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      // Only the input gets an error element
      expect(errorEl(el, 'a')?.textContent).to.equal('A is invalid');
      expect(el.querySelectorAll('[data-error-for]').length).to.equal(1);
    });

    it('ignores disabled controls', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" disabled />
            <input name="b" />
          </form>
        </validated-form>
      `);

      const [a, b] = el.querySelectorAll('input');

      setInvalid(a, 'A is invalid');
      setInvalid(b, 'B is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      // Only the enabled input should get an error
      expect(errorEl(el, 'a') === null).to.be.true;
      expect(errorEl(el, 'b')?.textContent).to.equal('B is invalid');
    });

    it('ignores hidden controls', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" type="hidden" />
            <input name="b" />
          </form>
        </validated-form>
      `);

      const [a, b] = el.querySelectorAll('input');

      setInvalid(a, 'A is invalid');
      setInvalid(b, 'B is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      // Only the non-hidden input should get an error
      expect(errorEl(el, 'a') === null).to.be.true;
      expect(errorEl(el, 'b')?.textContent).to.equal('B is invalid');
    });
  });

  describe('invalid event capture', () => {
    it('handles invalid event (capture) by preventing default and showing an error', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');

      const evt = new Event('invalid', { cancelable: true, bubbles: false });
      input.dispatchEvent(evt);

      expect(evt.defaultPrevented).to.be.true;

      const err = errorEl(el, 'a');
      expect(err !== null).to.be.true;
      expect(err.textContent).to.equal('A is invalid');
      expect(err.hasAttribute('hidden')).to.be.false;

      expect(input.hasAttribute('data-invalid')).to.be.true;
    });

    it('can also be triggered via checkValidity (explicit)', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      triggerInvalid(input);

      const err = errorEl(el, 'a');
      expect(err !== null).to.be.true;
      expect(err.textContent).to.equal('A is invalid');
    });
  });

  describe('live validation after first submit', () => {
    it('does not show errors on input/change until submitted once', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');

      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(errorEl(el, 'a')).to.not.exist;

      // After validate(), it should start showing live errors
      el.validate();
      expect(errorEl(el, 'a')?.textContent).to.equal('A is invalid');
    });

    it('clears an error when the control becomes valid after submit', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      el.validate();

      const err = errorEl(el, 'a');
      expect(err !== null).to.be.true;
      expect(err.hasAttribute('hidden')).to.be.false;

      setValid(input);
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(err.textContent).to.equal('');
      expect(err.hasAttribute('hidden')).to.be.true;

      expect(input.hasAttribute('data-invalid')).to.be.false;
    });
  });

  describe('aria wiring', () => {
    it('adds aria-describedby pointing to the error element id', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'Email is required');
      el.validate();

      const err = errorEl(el, 'a');
      expect(err !== null).to.be.true;
      expect(err.id).to.be.a('string');
      expect(err.id).to.not.equal('');

      const describedBy = input.getAttribute('aria-describedby') || '';
      expect(describedBy.split(/\s+/)).to.include(err.id);
    });

    it('does not override existing aria-describedby but appends to it', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <p id="a-hint">Hint text</p>
            <input name="a" aria-describedby="a-hint" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      el.validate();

      const err = errorEl(el, 'a');
      expect(err !== null).to.be.true;
      expect(err.id).to.be.a('string');
      expect(err.id).to.not.equal('');

      const describedBy = input.getAttribute('aria-describedby') || '';
      const describedByIds = describedBy.split(/\s+/);
      expect(describedByIds).to.include(err.id);
      expect(describedByIds).to.include('a-hint');
    });

    it('sets role=status and aria-live=polite when neither is provided', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      el.validate();

      const err = errorEl(el, 'a');
      expect(err !== null).to.be.true;
      expect(err.getAttribute('role')).to.equal('status');
      expect(err.getAttribute('aria-live')).to.equal('polite');
    });

    it('does not override role/aria-live if one is already set', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" />
            <div data-error-for="a" role="alert"></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      el.validate();

      const err = errorEl(el, 'a');
      expect(err !== null).to.be.true;

      // role exists, so ensureLiveRegionDefaults should not set aria-live
      expect(err.getAttribute('role')).to.equal('alert');
      expect(err.hasAttribute('aria-live')).to.be.false;
    });
  });

  describe('error association requirements', () => {
    it('validates an unnamed control but does not create an error element', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'Required');

      const ok = el.validate();
      expect(ok).to.be.false;

      // No error UI should be created because the control has no name
      expect(el.querySelector('[data-error-for]')).to.not.exist;

      // No accessibility wiring either
      expect(input.hasAttribute('aria-describedby')).to.be.false;

      // But it still participates in validation
      expect(input.hasAttribute('data-invalid')).to.be.true;
    });
  });

  describe('resetValidation() / isValid()', () => {
    it('resetValidation() clears errors and disables live validation until submitted again', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      el.validate();

      const err = errorEl(el, 'a');
      expect(err !== null).to.be.true;
      expect(err.hasAttribute('hidden')).to.be.false;

      el.resetValidation();
      expect(err.hasAttribute('hidden')).to.be.true;

      // Still invalid, but input event should not re-show until submitted once again
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(err.hasAttribute('hidden')).to.be.true;
    });

    it('isValid() reflects current validity without showing errors', async () => {
      const el = await fixture(html`
        <validated-form>
          <form>
            <input name="a" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');

      expect(el.isValid()).to.be.false;
      expect(errorEl(el, 'a')).to.not.exist;

      setValid(input);

      expect(el.isValid()).to.be.true;
      expect(errorEl(el, 'a')).to.not.exist;
    });
  });

  describe('custom error messages (data-msg-*)', () => {
    it('uses data-msg-required when valueMissing is true', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" data-msg-required="Field A is required" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      // Trigger valueMissing using native constraint
      input.required = true;

      el.validate();

      const err = errorEl(el, 'a');
      expect(err !== null).to.be.true;
      expect(err.textContent).to.equal('Field A is required');
    });

    it('uses data-msg-type when typeMismatch is true', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="email" type="email" value="not-an-email" data-msg-type="Invalid email address" />
          </form>
        </validated-form>
      `);

      el.validate();

      const err = errorEl(el, 'email');
      expect(err !== null).to.be.true;
      expect(err.textContent).to.equal('Invalid email address');
    });

    it('prefers the first matching validity flag in MESSAGE_ATTRS order', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input
              name="a"
              required
              minlength="5"
              data-msg-required="Field A is required"
              data-msg-too-short="Field A is too short"
            />
          </form>
        </validated-form>
      `);

      // Empty value triggers valueMissing first
      el.validate();

      const err = errorEl(el, 'a');
      expect(err !== null).to.be.true;
      expect(err.textContent).to.equal('Field A is required');
    });
  });

  describe('form-associated controls outside the form element', () => {
    it('shows validation errors for a control associated via the form attribute', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <input name="a" form="f" />
          <form id="f">
            <button type="submit">Submit</button>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input[name="a"]');

      setInvalid(input, 'A is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      const err = errorEl(el, 'a');
      expect(err !== null).to.be.true;
      expect(err.textContent).to.equal('A is invalid');
      expect(err.hasAttribute('hidden')).to.be.false;
      expect(input.hasAttribute('data-invalid')).to.be.true;
    });

    it('updates live validation on input after first submit', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <input name="a" form="f" />
          <form id="f">
            <button type="submit">Submit</button>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input[name="a"]');

      setInvalid(input, 'A is invalid');
      el.validate();

      const err = errorEl(el, 'a');
      expect(err !== null).to.be.true;
      expect(err.textContent).to.equal('A is invalid');
      expect(err.hasAttribute('hidden')).to.be.false;

      setValid(input);
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(err.textContent).to.equal('');
      expect(err.hasAttribute('hidden')).to.be.true;
      expect(input.hasAttribute('data-invalid')).to.be.false;
    });

    it('does not react to controls associated with a different form after live validation is enabled', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <input name="inside" form="f" />
          <input name="outside" form="other-form" />
          <form id="f">
            <button type="submit">Submit</button>
          </form>
          <form id="other-form"></form>
        </validated-form>
      `);

      const inside = el.querySelector('input[name="inside"]');
      const outside = el.querySelector('input[name="outside"]');

      // Enable live validation for this component
      setInvalid(inside, 'Inside is invalid');
      el.validate();

      // Dispatch input from a control owned by another form
      setInvalid(outside, 'Outside is invalid');
      outside.dispatchEvent(new Event('input', { bubbles: true }));

      // No error should be created for the unrelated control
      expect(errorEl(el, 'outside') === null).to.be.true;
      expect(outside.hasAttribute('data-invalid')).to.be.false;
    });
  });
});
