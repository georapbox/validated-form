/**
 * NOTE ABOUT VALIDATION IN TESTS
 *
 * We intentionally do NOT use native constraints like `required`, `type="email"`,
 * or `pattern` to make controls invalid, except in tests that specifically verify
 * custom messages for native validity flags.
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

function dispatchSubmitWithoutNavigation(form) {
  let preventedByComponent = false;

  const stopper = evt => {
    preventedByComponent = evt.defaultPrevented;
    evt.preventDefault(); // Always stop actual navigation.
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

  describe('properties - attributes', () => {
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
    it('validate() returns false and displays the referenced error element for an invalid control', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');
      setInvalid(input, 'A is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      const err = el.querySelector('#a-error');
      expect(err.textContent).to.equal('A is invalid');
      expect(err.hasAttribute('hidden')).to.be.false;
      expect(input.getAttribute('aria-invalid')).to.equal('true');
    });

    it('on successful submit it clears all errors', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
            <button type="submit">Submit</button>
          </form>
        </validated-form>
      `);

      const form = el.querySelector('form');
      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      const prevented1 = dispatchSubmitWithoutNavigation(form);

      expect(prevented1).to.be.true;

      const err = el.querySelector('#a-error');

      expect(err.textContent).to.equal('A is invalid');
      expect(err.hasAttribute('hidden')).to.be.false;
      expect(input.getAttribute('aria-invalid')).to.equal('true');

      setValid(input);
      const prevented2 = dispatchSubmitWithoutNavigation(form);

      expect(prevented2).to.be.false;
      expect(err.textContent).to.equal('');
      expect(err.hasAttribute('hidden')).to.be.true;
      expect(input.hasAttribute('aria-invalid')).to.be.false;
    });

    it('report="first" only shows the first invalid control', async () => {
      const el = await fixture(html`
        <validated-form report="first" no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>

            <input name="b" aria-errormessage="b-error" />
            <div id="b-error" hidden></div>
          </form>
        </validated-form>
      `);

      const [a, b] = el.querySelectorAll('input');

      setInvalid(a, 'A is invalid');
      setInvalid(b, 'B is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      const errA = el.querySelector('#a-error');
      const errB = el.querySelector('#b-error');

      expect(errA !== null).to.be.true;
      expect(errA.textContent).to.equal('A is invalid');
      expect(errA.hasAttribute('hidden')).to.be.false;

      expect(errB !== null).to.be.true;
      expect(errB.textContent).to.equal('');
      expect(errB.hasAttribute('hidden')).to.be.true;
      expect(b.hasAttribute('aria-invalid')).to.be.false;
    });

    it('report="all" shows errors for all invalid controls', async () => {
      const el = await fixture(html`
        <validated-form report="all" no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>

            <input name="b" aria-errormessage="b-error" />
            <div id="b-error" hidden></div>
          </form>
        </validated-form>
      `);

      const [a, b] = el.querySelectorAll('input');

      setInvalid(a, 'A is invalid');
      setInvalid(b, 'B is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      const errA = el.querySelector('#a-error');
      const errB = el.querySelector('#b-error');

      expect(errA !== null).to.be.true;
      expect(errA.textContent).to.equal('A is invalid');
      expect(a.getAttribute('aria-invalid')).to.equal('true');

      expect(errB !== null).to.be.true;
      expect(errB.textContent).to.equal('B is invalid');
      expect(b.getAttribute('aria-invalid')).to.equal('true');
    });

    it('focuses first invalid control by default', async () => {
      const el = await fixture(html`
        <validated-form>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>

            <input name="b" aria-errormessage="b-error" />
            <div id="b-error" hidden></div>
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
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
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
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const button = el.querySelector('button');
      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      const err = el.querySelector('#a-error');

      expect(err.textContent).to.equal('A is invalid');
      expect(button.hasAttribute('aria-invalid')).to.be.false;
    });

    it('ignores disabled controls', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" disabled aria-errormessage="a-error" />
            <div id="a-error" hidden></div>

            <input name="b" aria-errormessage="b-error" />
            <div id="b-error" hidden></div>
          </form>
        </validated-form>
      `);

      const [a, b] = el.querySelectorAll('input');
      const errA = el.querySelector('#a-error');
      const errB = el.querySelector('#b-error');

      setInvalid(a, 'A is invalid');
      setInvalid(b, 'B is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      expect(errA.textContent).to.equal('');
      expect(errA.hasAttribute('hidden')).to.be.true;
      expect(a.hasAttribute('aria-invalid')).to.be.false;

      expect(errB.textContent).to.equal('B is invalid');
      expect(errB.hasAttribute('hidden')).to.be.false;
      expect(b.getAttribute('aria-invalid')).to.equal('true');
    });

    it('ignores hidden controls', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" type="hidden" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>

            <input name="b" aria-errormessage="b-error" />
            <div id="b-error" hidden></div>
          </form>
        </validated-form>
      `);

      const [a, b] = el.querySelectorAll('input');
      const errA = el.querySelector('#a-error');
      const errB = el.querySelector('#b-error');

      setInvalid(a, 'A is invalid');
      setInvalid(b, 'B is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      expect(errA.textContent).to.equal('');
      expect(errA.hasAttribute('hidden')).to.be.true;
      expect(a.hasAttribute('aria-invalid')).to.be.false;

      expect(errB.textContent).to.equal('B is invalid');
      expect(errB.hasAttribute('hidden')).to.be.false;
      expect(b.getAttribute('aria-invalid')).to.equal('true');
    });
  });

  describe('invalid event capture', () => {
    it('handles invalid event (capture) by preventing default and showing an error', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');

      const evt = new Event('invalid', { cancelable: true, bubbles: false });
      input.dispatchEvent(evt);

      expect(evt.defaultPrevented).to.be.true;

      const err = el.querySelector('#a-error');

      expect(err.textContent).to.equal('A is invalid');
      expect(err.hasAttribute('hidden')).to.be.false;
      expect(input.getAttribute('aria-invalid')).to.equal('true');
    });

    it('can also be triggered via checkValidity (explicit)', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      triggerInvalid(input);

      const err = el.querySelector('#a-error');

      expect(err.textContent).to.equal('A is invalid');
    });
  });

  describe('live validation after first submit', () => {
    it('does not show errors on input/change until submitted once', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');
      const err = el.querySelector('#a-error');

      setInvalid(input, 'A is invalid');

      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(err.textContent).to.equal('');
      expect(err.hasAttribute('hidden')).to.be.true;
      expect(input.hasAttribute('aria-invalid')).to.be.false;

      el.validate();

      expect(err.textContent).to.equal('A is invalid');
      expect(err.hasAttribute('hidden')).to.be.false;
    });

    it('clears an error when the control becomes valid after submit', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      el.validate();

      const err = el.querySelector('#a-error');

      expect(err.hasAttribute('hidden')).to.be.false;

      setValid(input);
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(err.textContent).to.equal('');
      expect(err.hasAttribute('hidden')).to.be.true;
      expect(input.hasAttribute('aria-invalid')).to.be.false;
    });
  });

  describe('aria wiring', () => {
    it('adds aria-describedby pointing to the error element id', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'Email is required');
      el.validate();

      const err = el.querySelector('#a-error');

      expect(err.id).to.equal('a-error');

      const describedBy = input.getAttribute('aria-describedby') || '';
      expect(describedBy.split(/\s+/)).to.include(err.id);
    });

    it('does not override existing aria-describedby but appends to it', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <p id="a-hint">Hint text</p>
            <input name="a" aria-describedby="a-hint" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      el.validate();

      const err = el.querySelector('#a-error');

      expect(err.id).to.equal('a-error');

      const describedBy = input.getAttribute('aria-describedby') || '';
      const describedByIds = describedBy.split(/\s+/);

      expect(describedByIds).to.include(err.id);
      expect(describedByIds).to.include('a-hint');
    });

    it('sets aria-live=polite when neither role nor aria-live is provided', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      el.validate();

      const err = el.querySelector('#a-error');

      expect(err.getAttribute('aria-live')).to.equal('polite');
      expect(err.hasAttribute('role')).to.be.false;
    });

    it('does not override role/aria-live if one is already set', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" role="alert" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      el.validate();

      const err = el.querySelector('#a-error');

      expect(err.getAttribute('role')).to.equal('alert');
      expect(err.hasAttribute('aria-live')).to.be.false;
    });

    it('does not override an existing aria-live value', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" aria-live="assertive" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      el.validate();

      const err = el.querySelector('#a-error');

      expect(err.getAttribute('aria-live')).to.equal('assertive');
    });

    it('sets aria-invalid="true" on invalid controls and removes it when valid', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      el.validate();

      expect(input.getAttribute('aria-invalid')).to.equal('true');

      setValid(input);
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(input.hasAttribute('aria-invalid')).to.be.false;
    });
  });

  describe('error association requirements', () => {
    it('displays an error for an unnamed control with aria-errormessage', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');
      const err = el.querySelector('#a-error');

      setInvalid(input, 'Required');

      const ok = el.validate();
      expect(ok).to.be.false;

      expect(err.textContent).to.equal('Required');
      expect(err.hasAttribute('hidden')).to.be.false;
      expect(input.getAttribute('aria-invalid')).to.equal('true');

      const describedBy = input.getAttribute('aria-describedby') || '';
      expect(describedBy.split(/\s+/)).to.include('a-error');
    });

    it('validates a control without aria-errormessage but shows no inline error', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input aria-errormessage="   " />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'Required');

      const ok = el.validate();
      expect(ok).to.be.false;

      const err = el.querySelector('#a-error');

      expect(input.getAttribute('aria-invalid')).to.equal('true');
      expect(err.hasAttribute('hidden')).to.be.true;
    });

    it('validates a control whose aria-errormessage target does not exist', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input aria-errormessage="missing-error" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'Required');

      const ok = el.validate();
      expect(ok).to.be.false;

      expect(input.getAttribute('aria-invalid')).to.equal('true');
      expect(input.hasAttribute('aria-describedby')).to.be.false;
    });

    it('uses the first ID from aria-errormessage', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input aria-errormessage="first-error second-error" />
            <div id="first-error" hidden></div>
            <div id="second-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');
      const first = el.querySelector('#first-error');
      const second = el.querySelector('#second-error');

      setInvalid(input, 'Invalid');
      el.validate();

      expect(first.textContent).to.equal('Invalid');
      expect(first.hasAttribute('hidden')).to.be.false;
      expect(second.textContent).to.equal('');
      expect(second.hasAttribute('hidden')).to.be.true;
    });

    it('does not use an aria-errormessage target outside the component', async () => {
      const wrapper = await fixture(html`
        <div>
          <validated-form no-focus>
            <form>
              <input aria-errormessage="external-error" />
            </form>
          </validated-form>

          <div id="external-error" hidden></div>
        </div>
      `);

      const el = wrapper.querySelector('validated-form');
      const input = el.querySelector('input');
      const err = wrapper.querySelector('#external-error');

      setInvalid(input, 'Invalid');
      el.validate();

      expect(err.textContent).to.equal('');
      expect(err.hasAttribute('hidden')).to.be.true;
      expect(input.getAttribute('aria-invalid')).to.equal('true');
      expect(input.hasAttribute('aria-describedby')).to.be.false;
    });
  });

  describe('resetValidation() / isValid()', () => {
    it('resetValidation() clears errors and disables live validation until submitted again', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      setInvalid(input, 'A is invalid');
      el.validate();

      const err = el.querySelector('#a-error');

      expect(err.hasAttribute('hidden')).to.be.false;

      el.resetValidation();
      expect(err.hasAttribute('hidden')).to.be.true;

      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(err.hasAttribute('hidden')).to.be.true;
    });

    it('isValid() reflects current validity without showing errors', async () => {
      const el = await fixture(html`
        <validated-form>
          <form>
            <input name="a" aria-errormessage="a-error" />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');
      const err = el.querySelector('#a-error');

      setInvalid(input, 'A is invalid');

      expect(el.isValid()).to.be.false;
      expect(err.textContent).to.equal('');
      expect(err.hasAttribute('hidden')).to.be.true;
      expect(input.hasAttribute('aria-invalid')).to.be.false;

      setValid(input);

      expect(el.isValid()).to.be.true;
      expect(err.textContent).to.equal('');
      expect(err.hasAttribute('hidden')).to.be.true;
      expect(input.hasAttribute('aria-invalid')).to.be.false;
    });
  });

  describe('custom error messages (data-msg-*)', () => {
    it('uses data-msg-required when valueMissing is true', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input name="a" aria-errormessage="a-error" data-msg-required="Field A is required" />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');

      input.required = true;
      el.validate();

      const err = el.querySelector('#a-error');

      expect(err.textContent).to.equal('Field A is required');
    });

    it('uses data-msg-type when typeMismatch is true', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input
              name="a"
              type="email"
              value="not-an-email"
              aria-errormessage="a-error"
              data-msg-type="Invalid email address"
            />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      el.validate();

      const err = el.querySelector('#a-error');

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
              aria-errormessage="a-error"
              data-msg-required="Field A is required"
              data-msg-too-short="Field A is too short"
            />
            <div id="a-error" hidden></div>
          </form>
        </validated-form>
      `);

      el.validate();

      const err = el.querySelector('#a-error');

      expect(err.textContent).to.equal('Field A is required');
    });
  });

  describe('radio groups', () => {
    it('supports multiple radio controls referencing one error element', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <form>
            <input type="radio" name="choice" value="a" required aria-errormessage="choice-error" />
            <input type="radio" name="choice" value="b" aria-errormessage="choice-error" />
            <div id="choice-error" hidden></div>
          </form>
        </validated-form>
      `);

      const [a, b] = el.querySelectorAll('input');
      const err = el.querySelector('#choice-error');

      const ok = el.validate();

      expect(ok).to.be.false;
      expect(err.textContent).to.not.equal('');
      expect(err.hasAttribute('hidden')).to.be.false;
      expect(a.getAttribute('aria-invalid')).to.equal('true');
      expect(b.getAttribute('aria-invalid')).to.equal('true');

      const aDescribedBy = a.getAttribute('aria-describedby') || '';
      const bDescribedBy = b.getAttribute('aria-describedby') || '';

      expect(aDescribedBy.split(/\s+/)).to.include('choice-error');
      expect(bDescribedBy.split(/\s+/)).to.include('choice-error');
    });
  });

  describe('form-associated controls outside the form element', () => {
    it('shows validation errors for a control associated via the form attribute', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <input name="a" form="f" aria-errormessage="a-error" />
          <form id="f">
            <button type="submit">Submit</button>
          </form>
          <div id="a-error" hidden></div>
        </validated-form>
      `);

      const input = el.querySelector('input[name="a"]');

      setInvalid(input, 'A is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      const err = el.querySelector('#a-error');

      expect(err.textContent).to.equal('A is invalid');
      expect(err.hasAttribute('hidden')).to.be.false;
      expect(input.getAttribute('aria-invalid')).to.equal('true');
    });

    it('updates live validation on input after first submit', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <input name="a" form="f" aria-errormessage="a-error" />
          <form id="f">
            <button type="submit">Submit</button>
          </form>
          <div id="a-error" hidden></div>
        </validated-form>
      `);

      const input = el.querySelector('input[name="a"]');

      setInvalid(input, 'A is invalid');
      el.validate();

      const err = el.querySelector('#a-error');

      expect(err.textContent).to.equal('A is invalid');
      expect(err.hasAttribute('hidden')).to.be.false;

      setValid(input);
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(err.textContent).to.equal('');
      expect(err.hasAttribute('hidden')).to.be.true;
      expect(input.hasAttribute('aria-invalid')).to.be.false;
    });

    it('does not react to controls associated with a different form after live validation is enabled', async () => {
      const el = await fixture(html`
        <validated-form no-focus>
          <input name="inside" form="f" aria-errormessage="inside-error" />
          <div id="inside-error" hidden></div>

          <input name="outside" form="other-form" aria-errormessage="outside-error" />
          <div id="outside-error" hidden></div>

          <form id="f">
            <button type="submit">Submit</button>
          </form>
          <form id="other-form"></form>
        </validated-form>
      `);

      const inside = el.querySelector('input[name="inside"]');
      const outside = el.querySelector('input[name="outside"]');
      const outsideError = el.querySelector('#outside-error');

      setInvalid(inside, 'Inside is invalid');
      el.validate();

      setInvalid(outside, 'Outside is invalid');
      outside.dispatchEvent(new Event('input', { bubbles: true }));

      expect(outsideError.textContent).to.equal('');
      expect(outsideError.hasAttribute('hidden')).to.be.true;
      expect(outside.hasAttribute('aria-invalid')).to.be.false;
      expect(outside.hasAttribute('aria-describedby')).to.be.false;
    });
  });
});
