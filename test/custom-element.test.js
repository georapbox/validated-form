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
});
