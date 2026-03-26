[![npm version](https://img.shields.io/npm/v/@georapbox/validated-form.svg)](https://www.npmjs.com/package/@georapbox/validated-form)
[![npm license](https://img.shields.io/npm/l/@georapbox/validated-form.svg)](https://www.npmjs.com/package/@georapbox/validated-form)

[demo]: https://georapbox.github.io/validated-form/
[license]: https://github.com/georapbox/validated-form/blob/main/LICENSE
[changelog]: https://github.com/georapbox/validated-form/blob/main/CHANGELOG.md

# &lt;validated-form&gt;

A Web Component that wraps native HTML form validation and surfaces the browser's validation messages as accessible inline errors. It does not implement validation rules or schemas — it reads the validation state through the [Constraint Validation API](https://developer.mozilla.org/docs/Web/API/Constraint_validation) and displays the control's `validationMessage`, optionally allowing per-field message overrides via `data-msg-*` attributes.

The component follows a progressive-enhancement approach: the browser remains responsible for validation, while JavaScript improves how errors are presented and announced. If JavaScript fails to load, the form still works using native browser validation UI.

`<validated-form>` is a good fit when you want to keep native browser validation and add accessible inline error presentation with minimal configuration.

[API documentation](#api) &bull; [Demo][demo]

## Why?

Modern browsers already provide native form validation using attributes like `required`, `pattern`, `minlength`, `maxlength`, `type="email"`, and others.

In many cases, that is enough.

However, native validation UI has practical limitations:
- Error messages appear in browser popups that cannot be styled
- Messages are not reliably associated with fields for assistive technologies
- Error bubbles may disappear before users can read them
- Accessibility behavior differs across browsers

This component builds on native validation rather than replacing it.

Using the **Constraint Validation API**, it:
- Reads the browser's validation state
- Reuses localized validation messages
- Renders persistent inline errors
- Associates errors with fields using proper ARIA attributes

This progressive-enhancement approach was informed by writing from [Adrian Roselli](https://adrianroselli.com/2019/02/avoid-default-field-validation.html) and [HTMHell](https://www.htmhell.dev/adventcalendar/2025/28/) on the accessibility limitations of default browser validation UI and the benefits of layering accessible feedback on top of native validation.

## Usage

### Installation

```sh
npm install --save @georapbox/validated-form
```

### Importing the component

By default, the package exports the element class without registering it.
This lets the application decide when the custom element is defined.

#### Manual definition

```js
import { ValidatedForm } from '@georapbox/validated-form';

// Define using the default tag name
ValidatedForm.define();
```

#### Auto-defined (convenience)

If you don't need control over registration, you can import the pre-defined build which immediately registers `<validated-form>`.

```js
import '@georapbox/validated-form/define';
```

### Requirements

For the component to function correctly, the markup must follow a few conventions.

#### 1. The element must wrap a `<form>`

`<validated-form>` enhances an existing form — it does not create one.

```html
<validated-form>
  <form>
    ...
  </form>
</validated-form>
```

#### 2. Each validated control must have a `name` attribute

The component identifies fields using their `name` attribute (the same identifier used during form submission).

```html
<input type="email" name="email" required>
```

Controls without a `name` still participate in validation, but they cannot be associated with an error element, so no inline error message will be shown for them.

#### 3. Each control needs an associated error element

Every field you want to validate must have an element with a `data-error-for` attribute whose value matches the control's `name` attribute. If an error element is not provided, the component will create one automatically after the control that triggered validation. For certain controls, such as checkboxes or radio groups, this may place the message between options, so providing the error element in the markup is recommended.

The component manages the visibility of the error element by toggling the `hidden` attribute based on the validation state.

```html
<input type="email" name="email" required>
<div data-error-for="email" hidden></div>
```

#### 4. Radio groups should share one error element

Radio buttons with the same name represent a single logical field and must share one error container. Provide a single element with `data-error-for="<name>"` that matches the group's `name` attribute.

The component treats the group as a single logical field and uses one shared error container. If the group is invalid, the error message is associated with the radio that triggered validation. On form submission, focus moves to the first invalid radio in the group.

By default (`report="all"`), the error element is linked to all radios in the group. When using `report="first"`, only the first invalid radio is linked and focused.

For consistent layout and semantics, place the error element after the last radio button in the group.

```html
<label><input type="radio" name="gender" value="m" required> Male</label>
<label><input type="radio" name="gender" value="f"> Female</label>
<div data-error-for="gender" hidden></div>
```

If an error element is not provided, the component will create one automatically after the radio that triggered validation. For grouped controls this may place the message between options, so providing the element in the markup is recommended.

#### Notes

- The error element can be any element (`div`, `span`, `p`, etc.)
- The component will automatically set the necessary ARIA attributes
- If JavaScript is unavailable, native browser validation still works
- The component does not apply any styles — you can style the error elements as needed

## Custom Validation Messages

The component supports custom validation messages per input without using `setCustomValidity()` internally.

Custom messages affect only what `<validated-form>` displays. They do not change the browser's validation rules, the control's validity state, or native validation UI.

You can provide custom messages using `data-*` attributes on individual form controls. For each invalid control, the component:

1. Detects which validation rule failed (via the Constraint Validation API)
2. Looks for a matching custom message attribute
3. Falls back to the browser's localized `validationMessage` if no custom message is provided

This preserves native validation behavior while allowing message customization.

### Supported Attributes

The following attributes can be added to form controls:

[valueMissing]: https://developer.mozilla.org/docs/Web/API/ValidityState/valueMissing
[typeMismatch]: https://developer.mozilla.org/docs/Web/API/ValidityState/typeMismatch
[patternMismatch]: https://developer.mozilla.org/docs/Web/API/ValidityState/patternMismatch
[tooShort]: https://developer.mozilla.org/docs/Web/API/ValidityState/tooShort
[tooLong]: https://developer.mozilla.org/docs/Web/API/ValidityState/tooLong
[rangeUnderflow]: https://developer.mozilla.org/docs/Web/API/ValidityState/rangeUnderflow
[rangeOverflow]: https://developer.mozilla.org/docs/Web/API/ValidityState/rangeOverflow
[stepMismatch]: https://developer.mozilla.org/docs/Web/API/ValidityState/stepMismatch
[badInput]: https://developer.mozilla.org/docs/Web/API/ValidityState/badInput

| Attribute | ValidityState flag | Description |
| --------- | --------------- | ----------- |
| `data-msg-required` | [`valueMissing`][valueMissing] | The control is required, but no value has been provided. |
| `data-msg-type` | [`typeMismatch`][typeMismatch] | The value does not match the expected input type, such as `email` or `url`. |
| `data-msg-pattern` | [`patternMismatch`][patternMismatch] | The value does not match the pattern defined by the `pattern` attribute. |
| `data-msg-too-short` | [`tooShort`][tooShort] | The value is shorter than the length required by the `minlength` attribute. |
| `data-msg-too-long` | [`tooLong`][tooLong] | The value is longer than the length allowed by the `maxlength` attribute. |
| `data-msg-min` | [`rangeUnderflow`][rangeUnderflow] | The value is less than the minimum allowed by the `min` attribute. |
| `data-msg-max` | [`rangeOverflow`][rangeOverflow] | The value is greater than the maximum allowed by the `max` attribute. |
| `data-msg-step` | [`stepMismatch`][stepMismatch] | The value does not conform to the interval defined by the `step` attribute. |
| `data-msg-bad-input` | [`badInput`][badInput] | The browser could not convert the entered value into a valid value for that control type. |

When a control is invalid, the component checks for a matching `data-msg-*` attribute and uses its value as the error message.

If no matching attribute is present, the browser's default localized message is used.

> [!NOTE]
> For radio groups with a shared error element, apply `data-msg-*` attributes consistently across the group. With `report="all"`, the message is resolved per radio and the last processed radio determines the final text in the shared error container.

### Example markup with custom messages:

```html
<validated-form>
  <form>
    <div>
      <label for="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        required
        data-msg-required="Email is required."
        data-msg-type="Please enter a valid email address."
      >
      <div data-error-for="email" hidden></div>
    </div>

    <div>
      <label for="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        required
        minlength="8"
        data-msg-required="Password is required."
        data-msg-too-short="Password must be at least 8 characters."
      >
      <div data-error-for="password" hidden></div>
    </div>

    <button type="submit">Submit</button>
  </form>
</validated-form>
```

### How Message Resolution Works

When a control is invalid:
- The component checks validation flags in priority order.
- If a matching data-msg-* attribute exists, that message is displayed.
- Otherwise, it falls back to control.validationMessage.

This ensures:
- Native validation semantics remain intact.
- Browser localization is preserved by default.
- You can override only the rules you care about.

### Interaction with `setCustomValidity()`

Although the component does not use `setCustomValidity()` internally, consumers can still use it.

If a consumer sets a custom validity message:

```js
input.setCustomValidity('This value is not allowed.');
```

That message becomes the control's `validationMessage` and will be displayed when no `data-msg-*` override applies.

Per-rule `data-msg-*` attributes still take precedence for the specific rule they match.

## API

### Properties
| Name | Reflects | Type | Required | Default | Description |
| ---- | -------- | ---- | -------- | ------- | ----------- |
| `noFocus`<br>*`no-focus`* | ✓ | `boolean` | - | `false` | Determines whether the component focuses the first invalid control when validation fails. When `false` (default), focus moves to the first invalid control. When `true`, errors are shown without changing focus. |
| `report` | ✓ | `'all' \| 'first'` | - | `'all'` | Determines how validation messages are reported when the form is validated. Use 'all' to show messages for all invalid controls, or 'first' to show only the first invalid control's message. After validation has started, live updates still reflect the field being edited. |

### Methods

| Name | Type | Description | Arguments |
| ---- | ---- | ----------- | --------- |
| `define` | Static | Defines the custom element using the provided name. If no name is given, the default tag name is used. If the element is already registered, the method does nothing. | elementName='validated-form' |
| `validate` | Instance | Validates the form, updates the displayed validation feedback, and returns whether the form is valid. | - |
| `resetValidation` | Instance | Resets the component's validation UI by clearing displayed error messages and validation feedback. It does not reset form field values or change the browser's underlying validity state. | - |
| `isValid` | Instance | Returns whether the form is currently valid according to the browser's native validation rules, without showing validation messages. | - |

<sup>1</sup> Instance methods are only available after the component has been defined. To ensure the component is defined, you can use `whenDefined` method of the `CustomElementRegistry` interface, eg `customElements.whenDefined('validated-form').then(() => { /* call methods here */ });`

## Changelog

For API updates and breaking changes, check the [CHANGELOG][changelog].

## Development setup

### Prerequisites

The project requires `Node.js` and `npm` to be installed on your environment. Preferrably, use [nvm](https://github.com/nvm-sh/nvm) Node Version Manager and use the version of Node.js specified in the `.nvmrc` file by running `nvm use`.

### Install dependencies

Install the project dependencies by running the following command.

```sh
npm install
```

### Build for development

Watch for changes and start a development server by running the following command.

```sh
npm start
```

### Linting

Lint the code by running the following command.

```sh
npm run lint
```

### Testing

Run the tests by running any of the following commands.

```sh
npm test
npm run test:watch # watch mode
```

### Build for production

Create a production build by running the following command.

```sh
npm run build
```

## License

[The MIT License (MIT)][license]
