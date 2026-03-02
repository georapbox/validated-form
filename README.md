[![npm version](https://img.shields.io/npm/v/@georapbox/validated-form.svg)](https://www.npmjs.com/package/@georapbox/validated-form)
[![npm license](https://img.shields.io/npm/l/@georapbox/validated-form.svg)](https://www.npmjs.com/package/@georapbox/validated-form)

[demo]: https://georapbox.github.io/validated-form/
[license]: https://github.com/georapbox/validated-form/blob/main/LICENSE
[changelog]: https://github.com/georapbox/validated-form/blob/main/CHANGELOG.md

# &lt;validated-form&gt;

A Web Component that wraps native HTML form validation and surfaces the browser's validation messages as accessible inline errors. It does not implement validation rules or schemas — it reads the validation state through the [Constraint Validation API](https://developer.mozilla.org/docs/Web/API/Constraint_validation) and displays the control's `validationMessage`, optionally allowing per-field message overrides via `data-msg-*` attributes.

This component follows a progressive-enhancement approach: the browser remains responsible for validation, while JavaScript improves how errors are presented and announced. If JavaScript fails to load, the form still works using native browser validation UI.

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

## Install

```sh
npm install --save @georapbox/validated-form
```

## Usage

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

Controls without a `name` cannot be associated with an error message.

#### 3. Each control needs an associated error element

Every field you want to validate must have an element with a `data-error-for` attribute whose value matches the control's `name` attribute. If an error element is not provided, the component will create one automatically after the control that triggered validation. For certain controls, such as checkboxes or radio groups, this may place the message between options, so providing the error element in the markup is recommended.

The component manages the visibility of the error element by toggling the `hidden` attribute based on the validation state.

```html
<input type="email" name="email" required>
<div data-error-for="email" hidden></div>
```

#### 4. Radio groups should share one error element

Radio buttons with the same name represent a single logical field and must share one error container. Provide a single element with `data-error-for="<name>"` that matches the group's `name` attribute.

The component treats the group as a single logical field and uses one shared error container. When validation fails, the error message is associated with the radio that triggered validation. During form submission, the first invalid radio in the group becomes the focus target.

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

You can provide custom messages using `data-*` attributes on individual form controls. When a control fails validation, the component:

1. Detects which validation rule failed (via the Constraint Validation API)
2. Looks for a matching custom message attribute
3. Falls back to the browser's localized `validationMessage` if no custom message is provided

This preserves native validation behavior while allowing message customization.

### Supported Attributes

The following attributes can be added to form controls:

| Validation Rule | Attribute |
| --------------- | --------- |
| `valueMissing` | `data-msg-required` |
| `typeMismatch` | `data-msg-type` |
| `patternMismatch` | `data-msg-pattern` |
| `tooShort` | `data-msg-too-short` |
| `tooLong` | `data-msg-too-long` |
| `rangeUnderflow` | `data-msg-min` |
| `rangeOverflow` | `data-msg-max` |
| `stepMismatch` | `data-msg-step` |
| `badInput` | `data-msg-bad-input` |

If a rule fails and the corresponding attribute exists, its value will be used as the error message.

If the attribute is not present, the browser's default localized message is used.

> [!NOTE]
> For radio groups with a shared error element, apply `data-msg-*` attributes consistently across the group. With `report="all"`, the message is resolved per radio and the last processed radio determines the final text in the shared error container.

### Example

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
| `noFocus`<br>*`no-focus`* | ✓ | `boolean` | - | `false` | Indicates whether the component should avoid focusing the first invalid control when validation fails. When `false` (default), the component will focus the first invalid control to guide users directly to the issue, otherwise it will only show error messages without changing focus. |
| `report` | ✓ | `'all' \| 'first'` | - | `'all'` | Determines which validation messages to show when the form is validated. The value can be 'all' to show messages for all invalid controls, or 'first' to show only the first invalid control's message. |

### Methods

| Name | Type | Description | Arguments |
| ---- | ---- | ----------- | --------- |
| `define` | Static | Defines/registers the custom element with the name provided. If no name is provided, the default name is used. The method checks if the element is already defined, hence will skip trying to redefine it. | elementName='validated-form' |
| `validate` | Instance | Validates and returns the validity of the form, showing error messages for any invalid controls. | - |
| `resetValidation` | Instance | Resets the validation state of the form, clearing all error messages and validation states. This does not reset the form fields themselves, but only the validation feedback. | - |
| `isValid` | Instance | Returns a boolean indicating whether the form is currently valid according to the browser's validation rules. It reflects the validity state of the form, allowing you to check if all fields are valid without triggering validation messages. | - |

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
