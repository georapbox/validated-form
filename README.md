[![npm version](https://img.shields.io/npm/v/@georapbox/validated-form.svg)](https://www.npmjs.com/package/@georapbox/validated-form)
[![npm license](https://img.shields.io/npm/l/@georapbox/validated-form.svg)](https://www.npmjs.com/package/@georapbox/validated-form)

[demo]: https://georapbox.github.io/validated-form/
[license]: https://github.com/georapbox/validated-form/blob/main/LICENSE
[changelog]: https://github.com/georapbox/validated-form/blob/main/CHANGELOG.md

# &lt;validated-form&gt;

A Web Component that wraps native HTML form validation and surfaces the browser's validation messages as accessible inline errors.
It does not implement validation rules or schemas — it reads the browser's validation state through the [Constraint Validation API](https://developer.mozilla.org/docs/Web/API/Constraint_validation) and displays the existing `validationMessage` without modifying it.

This component follows a progressive-enhancement approach: the browser remains responsible for validation, while JavaScript improves how errors are presented and announced. If JavaScript fails to load, the form still works using native browser validation UI.

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

### Markup

```html
<validated-form></validated-form>
```

### Style

By default, the component comes with basic styling. However, you can customise the styles of the various elements of the component using either [CSS Parts](#css-parts) or [CSS Custom Properties](#css-custom-properties).

## API

### Properties
| Name | Reflects | Type | Required | Default | Description |
| ---- | -------- | ---- | -------- | ------- | ----------- |

### Slots

| Name | Description |
| ---- | ----------- |

### CSS Parts

| Name | Description |
| ---- | ----------- |

### CSS Custom Properties

| Name | Description | Default |
| ---- | ----------- | ------- |

### Methods

| Name | Type | Description | Arguments |
| ---- | ---- | ----------- | --------- |
| `defineCustomElement` | Static | Defines/registers the custom element with the name provided. If no name is provided, the default name is used. The method checks if the element is already defined, hence will skip trying to redefine it. | elementName='validated-form' |

<sup>1</sup> Instance methods are only available after the component has been defined. To ensure the component is defined, you can use `whenDefined` method of the `CustomElementRegistry` interface, eg `customElements.whenDefined('validated-form').then(() => { /* call methods here */ });`

### Events

| Name | Description | Event Detail |
| ---- | ----------- | ------------ |

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
