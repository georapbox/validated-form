import { expect, fixture, fixtureCleanup, html } from '@open-wc/testing';
// import sinon from 'sinon';
import { CustomElement } from '../src/custom-element.js';

CustomElement.defineCustomElement();

describe('custom-element', () => {
  afterEach(() => {
    fixtureCleanup();
  });

  describe('accessibility', () => {
    it('passes accessibility test when enabled without attributes', async () => {
      const el = await fixture(html`<custom-element></custom-element>`);
      await expect(el).to.be.accessible();
    });
  });
});
