// @ts-check

/**
 * Elements that support the Constraint Validation API inside a form.
 * Includes native controls and form-associated custom elements.
 *
 * @typedef {HTMLElement & {
 *   name?: string;
 *   willValidate: boolean;
 *   validity: ValidityState;
 *   validationMessage: string;
 *   checkValidity: () => boolean;
 *   reportValidity: () => boolean;
 *   form: HTMLFormElement | null;
 * }} FormControl
 */

/**
 * @summary A Web Component that wraps native HTML form validation and surfaces the browser's validation messages as accessible inline errors.
 * @documentation https://github.com/georapbox/validated-form
 *
 * @tagname validated-form - This is the default tag name, unless overridden by the `define` method.
 * @extends HTMLElement
 *
 * @property {boolean} noFocus - Determines whether the component focuses the first invalid control when validation fails. When `false` (default), focus moves to the first invalid control. When `true`, errors are shown without changing focus.
 * @property {string} report - Determines how validation messages are reported when the form is validated. Use 'all' to show messages for all invalid controls, or 'first' to show only the first invalid control's message. After validation has started, live updates still reflect the field being edited.
 *
 * @attribute {boolean} no-focus - Determines whether the component focuses the first invalid control when validation fails. When `false` (default), focus moves to the first invalid control. When `true`, errors are shown without changing focus.
 * @attribute {string} report - Determines how validation messages are reported when the form is validated. Use 'all' to show messages for all invalid controls, or 'first' to show only the first invalid control's message. After validation has started, live updates still reflect the field being edited.
 *
 * @method define - Static method. Defines the custom element using the provided name. If no name is given, the default tag name is used. If the element is already registered, the method does nothing.
 * @method validate - Instance method. Validates the form, updates the displayed validation feedback, and returns whether the form is valid.
 * @method resetValidation - Instance method. Resets the component's validation UI by clearing displayed error messages and validation feedback. It does not reset form field values or change the browser's underlying validity state.
 * @method isValid - Instance method. Returns whether the form is currently valid according to the browser's native validation rules, without showing validation messages.
 */
class ValidatedForm extends HTMLElement {
  /** @type {ReadonlyArray<readonly [keyof ValidityState, string]>} */
  static #MESSAGE_ATTRS = [
    ['valueMissing', 'data-msg-required'],
    ['typeMismatch', 'data-msg-type'],
    ['patternMismatch', 'data-msg-pattern'],
    ['tooShort', 'data-msg-too-short'],
    ['tooLong', 'data-msg-too-long'],
    ['rangeUnderflow', 'data-msg-min'],
    ['rangeOverflow', 'data-msg-max'],
    ['stepMismatch', 'data-msg-step'],
    ['badInput', 'data-msg-bad-input']
  ];

  /** @type {boolean} */
  #submittedOnce = false;

  /** @type {HTMLFormElement | null} */
  #form = null;

  constructor() {
    super();
  }

  /**
   * Determines whether the component focuses the first invalid control when
   * validation fails. When `false` (default), focus moves to the first
   * invalid control. When `true`, errors are shown without changing focus.
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
   * Determines how validation messages are reported when the form is validated.
   * Use 'all' to show messages for all invalid controls, or 'first' to show
   * only the first invalid control's message. After validation has started,
   * live updates still reflect the field being edited.
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

    if (this.#form && !this.#form.noValidate) {
      this.#form.noValidate = true;
    }

    this.#form?.addEventListener('submit', this.#handleSubmit);
    this.addEventListener('invalid', this.#handleInvalidCapture, { capture: true });
    this.addEventListener('input', this.#handleInputOrChange);
    this.addEventListener('change', this.#handleInputOrChange);
  }

  /**
   * Lifecycle method that is called when the element is removed from the DOM.
   */
  disconnectedCallback() {
    this.#form?.removeEventListener('submit', this.#handleSubmit);
    this.removeEventListener('invalid', this.#handleInvalidCapture, { capture: true });
    this.removeEventListener('input', this.#handleInputOrChange);
    this.removeEventListener('change', this.#handleInputOrChange);
  }

  /**
   * Validates the form, updates the displayed validation feedback,
   * and returns whether the form is valid.
   *
   * @returns {boolean} True if the form is valid, false otherwise.
   */
  validate() {
    this.#submittedOnce = true;
    return this.#validateAndShowErrors();
  }

  /**
   * Resets the component's validation UI by clearing displayed error messages
   * and validation feedback. It does not reset form field values or change
   * the browser's underlying validity state.
   */
  resetValidation() {
    this.#submittedOnce = false;
    this.#clearAllErrors();
  }

  /**
   * Returns whether the form is currently valid according to the browser's
   * native validation rules, without showing validation messages.
   *
   * @returns {boolean} True if all controls are valid, false otherwise.
   */
  isValid() {
    return this.#validatableControls().every(el => el.validity.valid);
  }

  /**
   * Returns the validation message for a control.
   * Prefers custom per-rule messages and falls back to the browser message.
   *
   * @param {FormControl} control - The form control element for which to get the validation message.
   * @returns {string} The validation message to display for the control.
   */
  #getMessage(control) {
    const validity = control.validity;

    for (const [flag, attr] of ValidatedForm.#MESSAGE_ATTRS) {
      if (validity[flag]) {
        const customMessage = control.getAttribute(attr);
        return customMessage || control.validationMessage;
      }
    }

    return control.validationMessage;
  }

  /**
   * Type guard that checks whether a value is a form control element
   * (input, select, or textarea).
   *
   * @param {unknown} el - The element to check.
   * @returns {el is FormControl} True if the value is a form control element, false otherwise.
   */
  #isFormControl(el) {
    if (!(el instanceof HTMLElement)) {
      return false;
    }

    // Form-owned element (native or form-associated custom element)
    if (!('form' in el)) {
      return false;
    }

    // Check for presence of Constraint Validation API properties/methods
    if (!('willValidate' in el) || !('validity' in el) || !('validationMessage' in el)) {
      return false;
    }

    return true;
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
      el.setAttribute('aria-live', 'polite');
    }
  }

  /**
   * Wires up an error element to a form control element by ensuring it has the
   * appropriate ARIA attributes to be associated with the control and function
   * as a live region for error messages.
   *
   * @param {FormControl} control - The form control element to associate with the error element.
   * @param {HTMLElement} errorElement - The error element to wire up.
   * @returns {HTMLElement} The wired-up error element.
   */
  #wireErrorElement(control, errorElement) {
    const errorId = errorElement.id;

    if (!errorId) {
      return errorElement;
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
   * @returns {HTMLElement | null} The error element associated with the form control element, or null if not found.
   */
  #getErrorElement(control) {
    if (!this.#form) {
      return null;
    }

    const ariaErrorMessage = control.getAttribute('aria-errormessage');
    if (!ariaErrorMessage) {
      return null;
    }

    // Defensively handle multiple IDs in aria-errormessage,
    // but only use the first one for the error element lookup.
    const firstId = ariaErrorMessage.trim().split(/\s+/)[0];
    if (!firstId) {
      return null;
    }

    const errorElement = this.querySelector(`#${CSS.escape(firstId)}`);

    return errorElement instanceof HTMLElement ? this.#wireErrorElement(control, errorElement) : null;
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
    const errorElement = this.#getErrorElement(control);

    if (errorElement !== null) {
      errorElement.textContent = message || '';
      errorElement.toggleAttribute('hidden', !hasError);
    }

    this.#setInvalidState(control, hasError);
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
        this.#setError(el, this.#getMessage(el));

        if (reportFirst) {
          break;
        }
      }

      if (!reportFirst) {
        this.#setError(el, ok ? '' : this.#getMessage(el));
      }
    }

    const valid = !firstInvalid;

    if (!valid && firstInvalid && !this.noFocus && typeof firstInvalid.focus === 'function') {
      firstInvalid.focus();
    }

    return valid;
  }

  /**
   * Sets the invalid state for a form control element by updating its ARIA attributes.
   *
   * @param {FormControl} control - The form control element for which to set the invalid state.
   * @param {boolean} hasError - Whether the control is in an error state. If true, sets aria-invalid to "true". If false, removes the aria-invalid attribute.
   */
  #setInvalidState(control, hasError) {
    hasError ? control.setAttribute('aria-invalid', 'true') : control.removeAttribute('aria-invalid');
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
    const control = this.#getFormControlFromEventTarget(evt.target);
    if (!control) {
      return;
    }

    this.#submittedOnce = true;
    evt.preventDefault();
    this.#setError(control, this.#getMessage(control));
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

    const control = this.#getFormControlFromEventTarget(evt.target);
    if (!control) {
      return;
    }

    const ok = control.validity.valid;
    this.#setError(control, ok ? '' : this.#getMessage(control));
  };

  /**
   * Returns a validatable form control from an event target when it belongs
   * to this component's form. This is used to ensure that events from
   * controls that are not part of the form or not validatable are
   * ignored by the event handlers.
   *
   * @param {EventTarget | null} target - The event target to evaluate.
   * @returns {FormControl | null} The form control element if meets the criteria, null otherwise.
   */
  #getFormControlFromEventTarget(target) {
    if (!this.#form) {
      return null;
    }
    if (!this.#isFormControl(target)) {
      return null;
    }
    if (!target.willValidate) {
      return null;
    }
    if (target.form !== this.#form) {
      return null;
    }
    return target;
  }

  /**
   * Re-applies a property value that may have been set on the element
   * instance before the custom element was defined.
   *
   * This handles cases where a framework sets a property on the element
   * before its definition is loaded. Without this step, the own property
   * on the instance would shadow the class setter and prevent it from
   * running after upgrade.
   *
   * @see https://web.dev/articles/custom-elements-best-practices#make_properties_lazy
   *
   * @param {'noFocus' | 'report'} prop - The property name to upgrade.
   */
  #upgradeProperty(prop) {
    const instance = /** @type {HTMLElement & Record<string, unknown>} */ (this);

    if (Object.prototype.hasOwnProperty.call(instance, prop)) {
      const value = instance[prop];
      delete instance[prop];
      instance[prop] = value;
    }
  }

  /**
   * Defines the custom element using the provided name. If no name is given,
   * the default tag name is used. If the element is already registered,
   * the method does nothing.
   *
   * @param {string} [elementName='validated-form'] - The name of the custom element.
   */
  static define(elementName = 'validated-form') {
    if (typeof window !== 'undefined' && !window.customElements.get(elementName)) {
      window.customElements.define(elementName, ValidatedForm);
    }
  }
}

export { ValidatedForm };
