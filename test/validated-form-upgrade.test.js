import { elementUpdated, expect, fixture, fixtureCleanup, html } from '@open-wc/testing';
import { ValidatedForm } from '../src/validated-form.js';

describe('validated-form upgrading', () => {
  it('default properties', async () => {
    const el = await fixture(html`<validated-form></validated-form>`);

    // Update properties before upgrading
    el.noFocus = true;

    // Upgrade custom element
    ValidatedForm.defineCustomElement();

    await elementUpdated(el);

    expect(el.getAttribute('no-focus')).to.equal('');
  });

  afterEach(() => {
    fixtureCleanup();
  });
});
