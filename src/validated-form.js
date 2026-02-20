// @ts-check

/**
 * Represents a value that may be of type T, or null.
 *
 * @template T
 * @typedef {T | null} Nullable
 */

const html = String.raw;
const css = String.raw;
const COMPONENT_NAME = 'validated-form';

const styles = css`
  :host {
    box-sizing: border-box;
  }

  :host *,
  :host *::before,
  :host *::after {
    box-sizing: inherit;
  }

  :host([hidden]),
  [hidden],
  ::slotted([hidden]) {
    display: none !important;
  }
`;

const template = document.createElement('template');

template.innerHTML = html`
  <style>
    ${styles}
  </style>

  <div>This is a custom element.</div>
`;

/**
 * @summary validated-form description goes here
 * @documentation https://github.com/georapbox/validated-form
 *
 * @tagname validated-form - This is the default tag name, unless overridden by the `defineCustomElement` method.
 * @extends HTMLElement
 *
 * @property {string} someProperty - Description for someProperty goes here.
 *
 * @attribute {string} some-attribute - Description for some-attribute goes here.
 *
 * @slot - Default slot description goes here.
 * @slot named-slot - Named slot description goes here.
 *
 * @csspart part-name - Description for part-name goes here.
 *
 * @cssproperty --css-variable-name - Description for --css-variable-name goes here.
 *
 * @method defineCustomElement - Static method. Defines a custom element with the given name.
 * @method someMethod - Instance method. Description for someMethod goes here.
 *
 * @event some-event - Description for some-event goes here.
 */
class ValidatedForm extends HTMLElement {
  constructor() {
    super();

    if (!this.shadowRoot) {
      const shadowRoot = this.attachShadow({ mode: 'open' });
      shadowRoot.appendChild(template.content.cloneNode(true));
    }
  }

  static get observedAttributes() {
    return [''];
  }

  /**
   * Lifecycle method that is called when attributes are changed, added, removed, or replaced.
   *
   * @param {string} name - The name of the attribute.
   * @param {string} oldValue - The old value of the attribute.
   * @param {string} newValue - The new value of the attribute.
   */
  attributeChangedCallback(name, oldValue, newValue) {} // eslint-disable-line no-unused-vars

  /**
   * Lifecycle method that is called when the element is added to the DOM.
   */
  connectedCallback() {}

  /**
   * Lifecycle method that is called when the element is removed from the DOM.
   */
  disconnectedCallback() {}

  /**
   * This is to safe guard against cases where, for instance, a framework may have added the element to the page and set a
   * value on one of its properties, but lazy loaded its definition. Without this guard, the upgraded element would miss that
   * property and the instance property would prevent the class property setter from ever being called.
   *
   * https://developers.google.com/web/fundamentals/web-components/best-practices#lazy-properties
   *
   * @param {string} prop - The property name to upgrade.
   */
  // eslint-disable-next-line no-unused-private-class-members
  #upgradeProperty(prop) {
    /** @type {any} */
    const instance = this;

    if (Object.prototype.hasOwnProperty.call(instance, prop)) {
      const value = instance[prop];
      delete instance[prop];
      instance[prop] = value;
    }
  }

  /**
   * Defines a custom element with the given name.
   * The name must contain a dash (-).
   *
   * @param {string} [elementName='validated-form'] - The name of the custom element.
   */
  static defineCustomElement(elementName = COMPONENT_NAME) {
    if (typeof window !== 'undefined' && !window.customElements.get(elementName)) {
      window.customElements.define(elementName, ValidatedForm);
    }
  }
}

export { ValidatedForm };
