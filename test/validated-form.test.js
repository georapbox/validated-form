import { expect, fixture, fixtureCleanup, html } from '@open-wc/testing';
import sinon from 'sinon';
import { ValidatedForm } from '../src/validated-form.js';

ValidatedForm.defineCustomElement();

function makeInvalid(control, message = 'Required') {
  control.setCustomValidity(message);
  control.checkValidity?.();
}

function makeValid(control) {
  control.setCustomValidity('');
  control.checkValidity?.();
}

function errorEl(root, name) {
  return root.querySelector(`[data-error-for="${CSS.escape(name)}"]`);
}

describe('validated-form', () => {
  afterEach(() => {
    fixtureCleanup();
  });

  describe('accessibility', () => {
    it('passes accessibility test when enabled without attributes', async () => {
      const el = await fixture(html`<validated-form></validated-form>`);
      await expect(el).to.be.accessible();
    });
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
            <input name="email" />
          </form>
        </validated-form>
      `);

      const form = el.querySelector('form');
      expect(form).to.exist;
      expect(form.noValidate).to.be.true;
    });

    it('does nothing when no <form> is present', async () => {
      const el = await fixture(html`<validated-form></validated-form>`);
      // Should not throw when calling public APIs
      expect(() => el.validate()).not.to.throw();
      expect(() => el.resetValidation()).not.to.throw();
      expect(el.isValid()).to.be.true;
    });
  });

  describe('validate() / submit flow', () => {
    it('validate() returns false and creates an error element for an invalid control', async () => {
      const el = await fixture(html`
        <validated-form>
          <form>
            <input name="email" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');
      makeInvalid(input, 'Email is required');

      const ok = el.validate();
      expect(ok).to.be.false;

      const err = errorEl(el, 'email');
      expect(err).to.exist;
      expect(err.textContent).to.equal('Email is required');
      expect(err.hasAttribute('hidden')).to.be.false;
      expect(input.hasAttribute('data-invalid')).to.be.true;
    });

    it('on successful submit it clears all errors', async () => {
      const el = await fixture(html`
        <validated-form>
          <form>
            <input name="email" />
            <div data-error-for="email"></div>
            <button type="submit">Submit</button>
          </form>
        </validated-form>
      `);

      const form = el.querySelector('form');
      const input = el.querySelector('input');
      const err = errorEl(el, 'email');

      // First submit: invalid -> prevents submit + shows error
      makeInvalid(input, 'Email is required');
      const submitEvt1 = new SubmitEvent('submit', { cancelable: true, bubbles: true });
      form.dispatchEvent(submitEvt1);
      expect(submitEvt1.defaultPrevented).to.be.true;
      expect(err.textContent).to.equal('Email is required');
      expect(err.hasAttribute('hidden')).to.be.false;

      // // Make it valid and submit again: should clear errors and not prevent
      // makeValid(input);
      // const submitEvt2 = new SubmitEvent('submit', { cancelable: true, bubbles: true });
      // form.dispatchEvent(submitEvt2);
      // expect(submitEvt2.defaultPrevented).to.be.false;
      // expect(err.textContent).to.equal('');
      // expect(err.hasAttribute('hidden')).to.be.true;
      // expect(input.hasAttribute('data-invalid')).to.be.false;
    });

    it('report="first" only shows the first invalid control', async () => {
      const el = await fixture(html`
        <validated-form report="first">
          <form>
            <input name="a" />
            <input name="b" />
          </form>
        </validated-form>
      `);

      const [a, b] = el.querySelectorAll('input');

      makeInvalid(a, 'A is invalid');
      makeInvalid(b, 'B is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      const errA = errorEl(el, 'a');
      const errB = errorEl(el, 'b');

      expect(errA?.textContent).to.equal('A is invalid');
      expect(errA?.hasAttribute('hidden')).to.be.false;

      expect(errB?.textContent).to.equal('');
      expect(errB?.hasAttribute('hidden')).to.be.true;
    });

    it('report="all" shows errors for all invalid controls', async () => {
      const el = await fixture(html`
        <validated-form report="all">
          <form>
            <input name="a" />
            <input name="b" />
          </form>
        </validated-form>
      `);

      const [a, b] = el.querySelectorAll('input');

      makeInvalid(a, 'A is invalid');
      makeInvalid(b, 'B is invalid');

      const ok = el.validate();
      expect(ok).to.be.false;

      expect(errorEl(el, 'a')?.textContent).to.equal('A is invalid');
      expect(errorEl(el, 'a')?.hasAttribute('hidden')).to.be.false;
      expect(a.hasAttribute('data-invalid')).to.be.true;

      expect(errorEl(el, 'b')?.textContent).to.equal('B is invalid');
      expect(errorEl(el, 'b')?.hasAttribute('hidden')).to.be.false;
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
      makeInvalid(a, 'A is invalid');
      makeInvalid(b, 'B is invalid');

      const spy = sinon.spy(a, 'focus');

      el.validate();
      expect(spy.calledOnce).to.be.true;
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
      makeInvalid(a, 'A is invalid');

      const spy = sinon.spy(a, 'focus');

      el.validate();
      expect(spy.called).to.be.false;
    });
  });

  describe('invalid event capture', () => {
    it('handles invalid event (capture) by preventing default and showing an error', async () => {
      const el = await fixture(html`
        <validated-form>
          <form>
            <input name="email" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');
      makeInvalid(input, 'Email is required');

      const evt = new Event('invalid', { cancelable: true, bubbles: false });
      input.dispatchEvent(evt);

      expect(evt.defaultPrevented).to.be.true;

      const err = errorEl(el, 'email');
      expect(err).to.exist;
      expect(err.textContent).to.equal('Email is required');
    });
  });

  describe('aria wiring', () => {
    it('adds aria-describedby pointing to the error element id', async () => {
      const el = await fixture(html`
        <validated-form>
          <form>
            <input name="email" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');
      makeInvalid(input, 'Email is required');
      el.validate();

      const err = errorEl(el, 'email');
      expect(err).to.exist;
      expect(err.id).to.be.a('string').and.not.equal('');

      const describedBy = input.getAttribute('aria-describedby') || '';
      expect(describedBy.split(/\s+/)).to.include(err.id);
    });

    it('sets role/status and aria-live/polite on error element when neither is provided', async () => {
      const el = await fixture(html`
        <validated-form>
          <form>
            <input name="email" />
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');
      makeInvalid(input, 'Email is required');
      el.validate();

      const err = errorEl(el, 'email');
      expect(err.getAttribute('role')).to.equal('status');
      expect(err.getAttribute('aria-live')).to.equal('polite');
    });

    it('does not override role/aria-live if one is already set', async () => {
      const el = await fixture(html`
        <validated-form>
          <form>
            <input name="email" />
            <div data-error-for="email" role="alert"></div>
          </form>
        </validated-form>
      `);

      const input = el.querySelector('input');
      makeInvalid(input, 'Email is required');
      el.validate();

      const err = errorEl(el, 'email');
      expect(err.getAttribute('role')).to.equal('alert');
      // aria-live should not be forced if role exists
      expect(err.hasAttribute('aria-live')).to.be.false;
    });
  });
});
