[![npm version](https://img.shields.io/npm/v/@georapbox/validated-form.svg)](https://www.npmjs.com/package/@georapbox/validated-form)
[![npm license](https://img.shields.io/npm/l/@georapbox/validated-form.svg)](https://www.npmjs.com/package/@georapbox/validated-form)

[demo]: https://georapbox.github.io/validated-form/
[license]: https://github.com/georapbox/validated-form/blob/main/LICENSE
[changelog]: https://github.com/georapbox/validated-form/blob/main/CHANGELOG.md

# &lt;validated-form&gt;

A Web Component that wraps native HTML form validation and surfaces the browser's validation messages as accessible inline errors.
It does not implement validation rules or schemas — it reads the browser's validation state through the [Constraint Validation API](https://developer.mozilla.org/docs/Web/API/Constraint_validation) and displays the existing `validationMessage` without modifying it.

This component follows a progressive-enhancement approach: the browser remains responsible for validation, while JavaScript improves how errors are presented and announced. If JavaScript fails to load, the form still works using native browser validation UI.

> [!IMPORTANT]
> This is not a validation library. It never defines rules or overrides messages (no `setCustomValidity()` is used).

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

### Script

```js
import { ValidatedForm } from './node_modules/@georapbox/validated-form/dist/validated-form.js';

// Manually define the element.
ValidatedForm.defineCustomElement();
```

Alternatively, you can import the automatically defined custom element.

```js
import './node_modules/@georapbox/validated-form/dist/validated-form.js';
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

Every field you want to validate must have an element with a `data-error-for` attribute whose value matches the control's `name` attribute. If an error element is missing, the component will try to create one right after the control, but it's best to include it in the markup for better control over structure and styling.

The component manages the visibility of the error element by toggling the `hidden` attribute based on the validation state.

```html
<input type="email" name="email" required>
<div data-error-for="email" hidden></div>
```

#### 4. Radio groups share one error element

Radio buttons with the same `name` represent a single logical field and must share one error container. Provide a single element with `data-error-for="<name>"` that matches the group's name attribute.

The component treats the group as one field. When validation fails, all radios in the group are marked as invalid, and the error element is linked (via `aria-describedby`) to the first radio button in the group, which also serves as the focus target.

For better semantics and layout control, place the error element after the last radio button in the group.

```html
<label><input type="radio" name="gender" value="m" required> Male</label>
<label><input type="radio" name="gender" value="f"> Female</label>
<div data-error-for="gender" hidden></div>
```

#### Notes

- The error element can be any element (`div`, `span`, `p`, etc.)
- The component will automatically set the necessary ARIA attributes
- If JavaScript is unavailable, native browser validation still works
- The component does not apply any styles — you can style the error elements as needed

Below is a simple example of a form using the component. For a more comprehensive example, check the [demo][demo].

```html
<validated-form>
  <form>
    <div>
      <label for="user_email">Email:</label>
      <input type="email" id="user_email" name="email" required>
      <div data-error-for="email" hidden></div>
    </div>
    
    <div>
      <label for="user_password">Password:</label>
      <input type="password" id="user_password" name="password" required minlength="8" pattern="^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$">
      <div data-error-for="password" hidden></div>
    </div>
    
    <fieldset>
      <legend>Terms and Conditions</legend>
      <label>
        <input type="checkbox" id="terms_and_conditions" name="terms" required>
        I agree to the terms and conditions
      </label>
      <div data-error-for="terms" hidden></div>
    </fieldset>
    
    <button type="submit">Register</button>
  </form>
</validated-form>
```

## API

### Properties
| Name | Reflects | Type | Required | Default | Description |
| ---- | -------- | ---- | -------- | ------- | ----------- |
| `noFocus`<br>*`no-focus`* | ✓ | `boolean` | - | `false` | Indicates whether the component should avoid focusing the first invalid control when validation fails. When `false` (default), the component will focus the first invalid control to guide users directly to the issue, otherwise it will only show error messages without changing focus. |
| `report` | ✓ | `'all' \| 'first'` | - | `'all'` | Determines which validation messages to show when the form is validated. The value can be 'all' to show messages for all invalid controls, or 'first' to show only the first invalid control's message. |

### Methods

| Name | Type | Description | Arguments |
| ---- | ---- | ----------- | --------- |
| `defineCustomElement` | Static | Defines/registers the custom element with the name provided. If no name is provided, the default name is used. The method checks if the element is already defined, hence will skip trying to redefine it. | elementName='validated-form' |
| `validate` | Instance | Validates and returns the validity of the form, showing error messages for any invalid controls. | - |
| `resetValidation` | Instance | Resets the validation state of the form, clearing all error messages and validation states. This does not reset the form fields themselves, but only the validation feedback. | - |
| `isValid` | Instance | A read-only property that returns a boolean indicating whether the form is currently valid according to the browser's validation rules. It reflects the validity state of the form, allowing you to check if all fields are valid without triggering validation messages. | - |

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
