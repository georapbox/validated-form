// @ts-check

/**
 * Represents a value that may be of type T, or null.
 * @template T
 * @typedef {T | null} Nullable
 */

/**
 * Elements that support the Constraint Validation API inside a form.
 * @typedef {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} FormControl
 */

const COMPONENT_NAME = 'validated-form';

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
  static formAssociated = false;

  /** @type {boolean} */
  #submittedOnce = false;

  /** @type {Nullable<HTMLFormElement>} */
  #form = null;

  constructor() {
    super();
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
  connectedCallback() {
    this.#form = this.querySelector('form');

    if (!this.#form) {
      console.warn('<validated-form> requires a <form> as a child.');
      return;
    }

    this.#form.noValidate = true;

    this.#ensureAllErrorNodes();

    this.#form.addEventListener('submit', this.#handleSubmit);
    this.#form.addEventListener('invalid', this.#handleInvalidCapture, true);
    this.#form.addEventListener('input', this.#handleInputOrChange, true);
    this.#form.addEventListener('change', this.#handleInputOrChange, true);

    // TODO: consider handling cases where form controls are added/removed dynamically after initial load (e.g. via MutationObserver)
  }

  /**
   * Lifecycle method that is called when the element is removed from the DOM.
   */
  disconnectedCallback() {
    this.#form?.removeEventListener('submit', this.#handleSubmit);
    this.#form?.removeEventListener('invalid', this.#handleInvalidCapture, true);
    this.#form?.removeEventListener('input', this.#handleInputOrChange, true);
    this.#form?.removeEventListener('change', this.#handleInputOrChange, true);
  }

  /**
   * Type guard that checks whether a value is a form control element
   * (input, select, or textarea).
   *
   * @param {unknown} t
   * @returns {t is FormControl}
   */
  #isFormControl(t) {
    return t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement;
  }

  /**
   * Type guard that checks whether a value is an <input type="radio"> element.
   *
   * @param {unknown} node
   * @returns {node is HTMLInputElement}
   */
  #isRadioInput(node) {
    return node instanceof HTMLInputElement && node.type === 'radio';
  }

  /**
   * Retrieves all radio buttons that belong to the same group as the given radio button element.
   *
   * @param {HTMLInputElement} el - The radio button element for which to retrieve the group.
   * @returns {HTMLInputElement[]} - An array of radio button elements that belong to the same group as the given element.
   */
  #radioGroup(el) {
    if (el.type !== 'radio' || !el.name) {
      return [];
    }

    const group = this.#form?.elements.namedItem(el.name);

    if (!group) {
      return [];
    }

    const items = group instanceof RadioNodeList ? Array.from(group) : [group];
    return items.filter(n => this.#isRadioInput(n));
  }

  /**
   * Retrieves all constraint-validation capable controls inside the form,
   * filtering out disabled controls, hidden inputs, and controls that
   * don't participate in validation.
   *
   * @returns {FormControl[]} An array of form control elements that are subject to validation.
   */
  #validatableControls() {
    if (!this.#form) {
      return [];
    }

    const controls = Array.from(this.#form.querySelectorAll('input, select, textarea'));

    return controls.filter(this.#isFormControl).filter(el => {
      // Skip disabled, type=hidden, and controls that don't participate
      if (el.disabled || (el instanceof HTMLInputElement && el.type === 'hidden')) {
        return false;
      }

      // Some inputs (e.g. type=button) aren't "willValidate"
      return el.willValidate;
    });
  }

  /**
   * Generates a unique error ID for a given form control element.
   *
   * @param {FormControl} el - The form control element for which to generate an error ID.
   * @returns {string} - The generated error ID.
   */
  #errorIdFor(el) {
    const base = el.id || el.name || `field-${Math.random().toString(16).slice(2)}`;
    return `${base}--error`;
  }

  /**
   * Retrieves the error node associated with a given form control element.
   * If the error node does not exist, it creates one and associates it
   * with the form control element.
   *
   * @param {FormControl} el - The form control element for which to retrieve the error node.
   * @returns {Nullable<HTMLElement>} - The error node associated with the form control element, or null if not found.
   */
  #getErrorNode(el) {
    const key = el.id || el.name;

    if (!key) {
      return null;
    }

    const node = this.#form?.querySelector(`[data-error-for="${CSS.escape(key)}"]`);
    if (!node || !(node instanceof HTMLElement)) {
      return null;
    }

    const errorId = node.id || this.#errorIdFor(el);
    node.id = errorId;

    const describedBy = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (!describedBy.includes(errorId)) {
      describedBy.push(errorId);
      el.setAttribute('aria-describedby', describedBy.join(' '));
    }

    node.classList.add('field-error');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('role', 'status');
    node.setAttribute('hidden', '');

    return node;
  }

  /**
   * Ensures that every form control element has an associated error node for displaying validation messages.
   * If an error node is missing for any control, it logs a warning to the console with instructions on how to add one.
   */
  #ensureAllErrorNodes() {
    for (const el of this.#validatableControls()) {
      const node = this.#getErrorNode(el);

      if (!node) {
        const key = el.id || el.name;
        console.warn(
          `<validated-form> couldn't find an error node for control with name/id "${key}". ` +
            `Please add an element with data-error-for="${key}" to show validation messages for this control.`
        );
      }
    }
  }

  /**
   * Sets the error message for a given form control element and updates its validation state.
   *
   * @param {FormControl} el - The form control element for which to set the error message.
   * @param {string} message - The error message to display. If empty, the error state will be cleared.
   */
  #setError(el, message) {
    const node = this.#getErrorNode(el);
    const hasError = Boolean(message);

    if (node) {
      node.textContent = message || '';
      node.toggleAttribute('hidden', !hasError);
    }

    el.toggleAttribute('data-invalid', hasError);
  }

  /**
   * Clears all error messages and validation states for the form controls.
   */
  #clearAllErrors() {
    for (const el of this.#validatableControls()) {
      this.#setError(el, '');
    }
  }

  /**
   * Validates all form controls and updates their error messages and validation states accordingly.
   * If any control is invalid, it focuses the first invalid control.
   *
   * @returns {boolean} - Returns true if all controls are valid, false otherwise.
   */
  #validateAndShowAll() {
    let firstInvalid = null;

    for (const el of this.#validatableControls()) {
      const ok = el.checkValidity();

      if (!ok && !firstInvalid) {
        firstInvalid = el;
      }

      this.#setError(el, ok ? '' : el.validationMessage);
    }

    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: false });
    }

    return !firstInvalid;
  }

  /**
   * Handles the form submission event.
   *
   * @param {SubmitEvent} evt - The submit event object.
   */
  #handleSubmit = evt => {
    this.#submittedOnce = true;

    const ok = this.#form?.checkValidity();

    if (!ok) {
      evt.preventDefault();
      this.#validateAndShowAll();
    } else {
      this.#clearAllErrors();
    }
  };

  /**
   * Handles the invalid event during the capture phase to show validation messages for invalid controls.
   * This is necessary to catch invalid events from controls that may not be
   * validated during form submission (e.g. due to novalidate or other factors).
   *
   * @param {Event} evt - The invalid event object.
   */
  #handleInvalidCapture = evt => {
    if (!this.#submittedOnce) {
      return;
    }

    const el = evt.target;

    if (!this.#isFormControl(el) || !el.willValidate) {
      return;
    }

    evt.preventDefault();

    this.#setError(el, el.validationMessage);
  };

  /**
   * Handles the input and change events to provide live validation
   * feedback after the form has been submitted at least once.
   *
   * @param {Event} evt - The input or change event object.
   */
  #handleInputOrChange = evt => {
    if (!this.#submittedOnce) {
      return;
    }

    const el = evt.target;

    if (!this.#isFormControl(el) || !el.willValidate) {
      return;
    }

    if (this.#isRadioInput(el)) {
      const group = this.#radioGroup(el);

      if (!group.length) {
        return;
      }

      const anchor = group[0];

      if (!this.#isFormControl(anchor)) {
        return;
      }

      const ok = anchor.validity.valid;

      this.#setError(anchor, ok ? '' : anchor.validationMessage);

      anchor.toggleAttribute('data-invalid', !ok);

      for (let i = 1; i < group.length; i++) {
        group[i].removeAttribute('data-invalid');
      }

      return;
    }

    const ok = el.checkValidity();
    this.#setError(el, ok ? '' : el.validationMessage);
  };

  /**
   * This is to safe guard against cases where, for instance, a framework may have added the element to the page and set a
   * value on one of its properties, but lazy loaded its definition. Without this guard, the upgraded element would miss that
   * property and the instance property would prevent the class property setter from ever being called.
   *
   * https://developers.google.com/web/fundamentals/web-components/best-practices#lazy-properties
   *
   * @param {string} prop - The property name to upgrade.
   */
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
