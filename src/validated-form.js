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
    return this.#executeFormValidation();
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
    return this.#getValidatableControls().every(el => el.validity.valid);
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
  #getValidatableControls() {
    if (!this.#form) {
      return [];
    }

    return Array.from(this.#form.elements)
      .filter(el => this.#isFormControl(el))
      .filter(el => el.willValidate);
  }

  /**
   * Establishes an accessibility relationship between a form control and its
   * corresponding error element using ARIA attributes.
   *
   * @param {FormControl} control - The form control element.
   * @param {HTMLElement} errorElement - The error element to link.
   * @returns {HTMLElement} The configured error element.
   */
  #linkControlToError(control, errorElement) {
    const errorId = errorElement.id;

    if (!errorId) {
      return errorElement;
    }

    // 1. Link control to error via aria-describedby
    const currentDescribedBy = control.getAttribute('aria-describedby') || '';
    const ids = new Set(currentDescribedBy.split(/\s+/).filter(Boolean));

    if (!ids.has(errorId)) {
      ids.add(errorId);
      control.setAttribute('aria-describedby', Array.from(ids).join(' '));
    }

    // 2. Configure error element as an accessible live region
    if (!errorElement.hasAttribute('role') && !errorElement.hasAttribute('aria-live')) {
      errorElement.setAttribute('aria-live', 'polite');
    }

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
    if (errorElement instanceof HTMLElement) {
      return this.#linkControlToError(control, errorElement);
    }

    return null;
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

    if (hasError) {
      control.setAttribute('aria-invalid', 'true');
    } else {
      control.removeAttribute('aria-invalid');
    }
  }

  /**
   * Clears all error messages and validation states for the form controls.
   */
  #clearAllErrors() {
    for (const control of this.#getValidatableControls()) {
      this.#setError(control, '');
    }
  }

  /**
   * Validates all participating form controls, updates their visual error states,
   * and handles focus management for invalid fields.
   *
   * Depending on the component's `report` strategy, this will either surface error
   * messages for all invalid fields simultaneously or isolate and display only the
   * first encountered error. If validation fails and `noFocus` is false, it
   * automatically shifts user focus to the first invalid control.
   *
   * @returns {boolean} True if all evaluated controls are valid, false otherwise.
   */
  #executeFormValidation() {
    const controls = this.#getValidatableControls();
    const reportFirst = this.report === 'first';

    if (reportFirst) {
      this.#clearAllErrors();
    }

    /** @type {FormControl | null} */
    let firstInvalid = null;

    for (const control of controls) {
      const isControlValid = control.validity.valid;

      if (!isControlValid && firstInvalid === null) {
        firstInvalid = control;
      }

      if (reportFirst) {
        if (!isControlValid) {
          this.#setError(control, this.#getMessage(control));
          break;
        }
      } else {
        this.#setError(control, isControlValid ? '' : this.#getMessage(control));
      }
    }

    if (firstInvalid && !this.noFocus) {
      firstInvalid.focus();
    }

    return firstInvalid === null;
  }

  /**
   * Handles the form submission event.
   *
   * @param {SubmitEvent} evt - The submit event object.
   */
  #handleSubmit = evt => {
    this.#submittedOnce = true;

    const isFormValid = this.#executeFormValidation();

    if (!isFormValid) {
      evt.preventDefault();
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
    const target = /** @type {HTMLElement | null} */ (evt.target);
    const control = this.#findValidatableControl(target);
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

    const target = /** @type {HTMLElement | null} */ (evt.target);
    const control = this.#findValidatableControl(target);
    if (!control) {
      return;
    }

    const isControlValid = control.validity.valid;
    this.#setError(control, isControlValid ? '' : this.#getMessage(control));
  };

  /**
   * Evaluates a DOM element to determine if it is a validatable form control
   * belonging to this component's internal form.
   *
   * This serves as a filter to ignore input, change, or invalid events originating
   * from elements that do not actively participate in this form's validation lifecycle.
   *
   * @param {HTMLElement | null} el - The DOM element candidate to evaluate.
   * @returns {FormControl | null} The verified form control element, or null if it fails any criteria.
   */
  #findValidatableControl(el) {
    if (!this.#form) {
      return null;
    }
    if (!this.#isFormControl(el)) {
      return null;
    }
    if (!el.willValidate) {
      return null;
    }
    if (el.form !== this.#form) {
      return null;
    }
    return el;
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
