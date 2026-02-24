import { expect, fixture, fixtureCleanup, html } from '@open-wc/testing';
// import sinon from 'sinon';
import { ValidatedForm } from '../src/validated-form.js';

ValidatedForm.defineCustomElement();

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
});
