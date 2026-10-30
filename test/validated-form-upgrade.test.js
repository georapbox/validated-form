import { expect, fixture, fixtureCleanup, html } from '@open-wc/testing';
import { ValidatedForm } from '../src/validated-form.js';

describe('validated-form upgrading', () => {
  it('default properties', async () => {
    const container = await fixture(html`<div></div>`);
    const el = document.createElement('validated-form');

    // Update properties before upgrading
    el.noFocus = true;
    el.report = 'first';

    // Define and explicitly upgrade the custom element
    ValidatedForm.define();
    customElements.upgrade(el);

    // Connect the element so connectedCallback runs
    container.appendChild(el);

    expect(el.getAttribute('no-focus')).to.equal('');
    expect(el.getAttribute('report')).to.equal('first');
  });

  afterEach(() => {
    fixtureCleanup();
  });
});
