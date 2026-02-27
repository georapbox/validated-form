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
 * @summary Web Component that adds automatic native form validation and error messages.
 * @documentation https://github.com/georapbox/validated-form
 *
 * @tagname validated-form - This is the default tag name, unless overridden by the `defineCustomElement` method.
 * @extends HTMLElement
 *
 * @property {boolean} noFocus - Indicates whether the component should focus the first invalid control when validation fails.
 * @property {string} report - Determines which validation messages to show when the form is validated. The value can be 'all' to show messages for all invalid controls, or 'first' to show only the first invalid control's message.
 *
 * @attribute {boolean} no-focus - Indicates whether the component should focus the first invalid control when validation fails.
 * @attribute {string} report - Determines which validation messages to show when the form is validated. The value can be 'all' to show messages for all invalid controls, or 'first' to show only the first invalid control's message.
 *
 * @method defineCustomElement - Static method. Defines a custom element with the given name.
 * @method validate - Instance method. Validates the form and shows error messages for any invalid controls.
 * @method resetValidation - Instance method. Resets the validation state of the form, clearing all error messages and validation states.
 * @method isValid - Instance method. Checks whether all form controls are currently valid according to the Constraint Validation API.
 */
class ValidatedForm extends HTMLElement {
  /** @type {string} */
  #instanceId = Math.random().toString(36).slice(2, 8);

  /** @type {boolean} */
  #submittedOnce = false;

  /** @type {Nullable<HTMLFormElement>} */
  #form = null;

  constructor() {
    super();
  }

  /**
   * Indicates whether the component should focus the first
   * invalid control when validation fails.
   *
   * @type {boolean}
   * @attribute no-focus
   * @default false
   */
  get noFocus() {
    return this.hasAttribute('no-focus');
  }

  set noFocus(value) {
    this.toggleAttribute('no-focus', !!value);
  }

  /**
   * Determines which validation messages to show when the form is validated.
   * The value can be 'all' to show messages for all invalid controls,
   * or 'first' to show only the first invalid control's message.
   *
   * @type {'all' | 'first'}
   * @attribute report
   * @default 'all'
   */
  get report() {
    const value = this.getAttribute('report');
    if (value !== 'all' && value !== 'first') {
      return 'all';
    }
    return value;
  }

  set report(value) {
    this.setAttribute('report', value);
  }

  /**
   * Lifecycle method that is called when the element is added to the DOM.
   */
  connectedCallback() {
    this.#upgradeProperty('noFocus');
    this.#upgradeProperty('report');

    this.#form = this.querySelector('form');

    if (!this.#form) {
      return;
    }

    if (!this.#form.noValidate) {
      this.#form.noValidate = true;
    }

    this.#form.addEventListener('submit', this.#handleSubmit);
    this.#form.addEventListener('invalid', this.#handleInvalidCapture, true);
    this.#form.addEventListener('input', this.#handleInputOrChange);
    this.#form.addEventListener('change', this.#handleInputOrChange);
  }

  /**
   * Lifecycle method that is called when the element is removed from the DOM.
   */
  disconnectedCallback() {
    if (!this.#form) {
      return;
    }

    this.#form.removeEventListener('submit', this.#handleSubmit);
    this.#form.removeEventListener('invalid', this.#handleInvalidCapture, true);
    this.#form.removeEventListener('input', this.#handleInputOrChange);
    this.#form.removeEventListener('change', this.#handleInputOrChange);
  }

  /**
   * Validates the form and shows error messages for any invalid controls.
   *
   *
   * @returns {boolean} True if the form is valid, false otherwise.
   */
  validate() {
    this.#submittedOnce = true;
    return this.#validateAndShowErrors();
  }

  /**
   * Resets the validation state of the form, clearing all error
   * messages and validation states. This does not reset the form
   * fields themselves, but only the validation feedback.
   */
  resetValidation() {
    this.#submittedOnce = false;
    this.#clearAllErrors();
  }

  /**
   * Checks whether all form controls are currently valid according to the
   * Constraint Validation API. It reflects the validity state of the form,
   * allowing you to check if all fields are valid without triggering
   * validation messages.
   *
   * @returns {boolean} True if all controls are valid, false otherwise.
   */
  isValid() {
    return this.#validatableControls().every(el => el.validity.valid);
  }

  /**
   * Type guard that checks whether a value is a form control element
   * (input, select, or textarea).
   *
   * @param {unknown} value - The value to check.
   * @returns {value is FormControl} True if the value is a form control element, false otherwise.
   */
  #isFormControl(value) {
    return (
      value instanceof HTMLInputElement || value instanceof HTMLSelectElement || value instanceof HTMLTextAreaElement
    );
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

    return Array.from(this.#form.elements)
      .filter(el => this.#isFormControl(el))
      .filter(el => el.willValidate);
  }

  /**
   * Adds an ID to the element's aria-describedby attribute without duplicating it.
   *
   * @param {HTMLElement} el - The element to update.
   * @param {string} id - The ID to add.
   */
  #addDescribedBy(el, id) {
    const currentDescribedBy = el.getAttribute('aria-describedby') || '';
    const ids = new Set(currentDescribedBy.split(/\s+/).filter(Boolean));

    if (!ids.has(id)) {
      ids.add(id);
      el.setAttribute('aria-describedby', Array.from(ids).join(' '));
    }
  }

  /**
   * Ensures that a given element has appropriate ARIA attributes to function
   * as a live region for error messages.
   *
   * @param {HTMLElement} el - The element to ensure has live region defaults.
   */
  #ensureLiveRegionDefaults(el) {
    const hasRole = el.hasAttribute('role');
    const hasLive = el.hasAttribute('aria-live');

    if (!hasRole && !hasLive) {
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
    }
  }

  /**
   * Wires up an error element to a form control element by ensuring it has the appropriate
   * ARIA attributes to be associated with the control and function as a live region
   * for error messages.
   *
   * @param {FormControl} control - The form control element to associate with the error element.
   * @param {HTMLElement} errorElement - The error element to wire up.
   * @returns {HTMLElement} The wired-up error element.
   */
  #wireErrorElement(control, errorElement) {
    const safeName = control.name.replace(/[^a-zA-Z0-9\-_:.]/g, '-');
    const errorId = errorElement.id || `vf-error-${safeName}-${this.#instanceId}`;

    if (!errorElement.id) {
      errorElement.id = errorId;
    }

    this.#addDescribedBy(control, errorId);
    this.#ensureLiveRegionDefaults(errorElement);

    return errorElement;
  }

  /**
   * Retrieves the error element associated with a given form control element.
   * If none exists and `options.create` is true, it creates one and inserts
   * it after the control.
   *
   * @param {FormControl} control - The form control element for which to retrieve the error element.
   * @param {{ create?: boolean }} [options={}] - Options for retrieving the error element.
   * @returns {Nullable<HTMLElement>} The error element associated with the form control element, or null if not found.
   */
  #getErrorElement(control, { create = false } = {}) {
    if (!this.#form || !control.name) {
      return null;
    }

    const selector = `[data-error-for="${CSS.escape(control.name)}"]`;
    /** @type {Nullable<HTMLElement>} */
    const existingErrorElement = this.#form.querySelector(selector);

    if (!existingErrorElement) {
      if (!create) {
        return null;
      }

      const errorElement = this.ownerDocument.createElement('div');
      errorElement.setAttribute('data-error-for', control.name);
      control.insertAdjacentElement('afterend', errorElement);
      return this.#wireErrorElement(control, errorElement);
    }

    return this.#wireErrorElement(control, existingErrorElement);
  }

  /**
   * Sets the error message for a given form control element
   * and updates its validation state.
   *
   * @param {FormControl} control - The form control element for which to set the error message.
   * @param {string} message - The error message to display. If empty, the error state will be cleared.
   */
  #setError(control, message) {
    const hasError = message !== '';
    const errorElement = this.#getErrorElement(control, { create: hasError });

    if (errorElement) {
      errorElement.textContent = message || '';
      errorElement.toggleAttribute('hidden', !hasError);
    }

    control.toggleAttribute('data-invalid', hasError);
  }

  /**
   * Clears all error messages and validation states for the form controls.
   */
  #clearAllErrors() {
    for (const control of this.#validatableControls()) {
      this.#setError(control, '');
    }
  }

  /**
   * Validates all form controls and updates their error messages
   * and validation states accordingly. If any control is invalid,
   * it focuses the first invalid control.
   *
   * @returns {boolean} True if all controls are valid, false otherwise.
   */
  #validateAndShowErrors() {
    const controls = this.#validatableControls();
    const reportFirst = this.report === 'first';

    if (reportFirst) {
      this.#clearAllErrors();
    }

    /** @type {FormControl | null} */
    let firstInvalid = null;

    for (const el of controls) {
      const ok = el.validity.valid;

      if (!ok && !firstInvalid) {
        firstInvalid = el;
        this.#setError(el, el.validationMessage);

        if (reportFirst) {
          break;
        }
      }

      if (!reportFirst) {
        this.#setError(el, ok ? '' : el.validationMessage);
      }
    }

    const valid = !firstInvalid;

    if (!valid && firstInvalid && !this.noFocus) {
      firstInvalid.focus();
    }

    return valid;
  }

  /**
   * Handles the form submission event.
   *
   * @param {SubmitEvent} evt - The submit event object.
   */
  #handleSubmit = evt => {
    this.#submittedOnce = true;

    const ok = this.#validateAndShowErrors();
    if (!ok) {
      evt.preventDefault();
    } else {
      this.#clearAllErrors();
    }
  };

  /**
   * Handles the invalid event during the capture phase to show validation
   * messages for invalid controls. This is necessary to catch invalid
   * events from controls that may not be validated during form
   * submission (e.g. due to novalidate or other factors).
   *
   * @param {Event} evt - The invalid event object.
   */
  #handleInvalidCapture = evt => {
    const control = evt.target;
    if (!this.#isFormControl(control) || !control.willValidate) {
      return;
    }

    this.#submittedOnce = true;
    evt.preventDefault();
    this.#setError(control, control.validationMessage);
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

    const control = evt.target;
    if (!this.#isFormControl(control) || !control.willValidate) {
      return;
    }

    const ok = control.validity.valid;
    this.#setError(control, ok ? '' : control.validationMessage);
  };

  /**
   * This is to safe guard against cases where, for instance, a framework may
   * have added the element to the page and set a value on one of its properties,
   * but lazy loaded its definition. Without this guard, the upgraded element
   * would miss that property and the instance property would prevent the class
   * property setter from ever being called.
   *
   * https://developers.google.com/web/fundamentals/web-components/best-practices#lazy-properties
   *
   * @param {'noFocus' | 'report'} prop - The property name to upgrade.
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
