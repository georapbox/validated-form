# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-06-17

### Changed

- Changed how form controls are associated with inline error elements.
  - Controls must now use `aria-errormessage` to reference an error element by its `id`.
  - Error elements are no longer identified through `data-error-for`.
  - A control's `name` atribute is no longer used to locate or associate its error element.
- Error elements must now be provided explicitly in the markup.
  - The component no longer creates missing error elements automatically.
  - The component no longer generates IDs for error elements.
- Controls without a name can now display inline validation errors, provided they reference an error element through `aria-errormessage`.
- The referenced error element's ID is added to the control's existing `aria-describedby` value to improve announcement support without replacing existing descriptions.
- Error elements receive `aria-live="polite"` when neither role nor `aria-live` has been provided.
- The component no longer adds `role="status"` automatically.
- When `aria-errormessage` contains multiple IDs, the first ID is used as the error element reference.

### Breaking changes

#### Error elements must be associated with aria-errormessage

Previously, error elements were associated with controls through a matching name and `data-error-for` value:

```html
<input type="email" name="email" required>
<div data-error-for="email" hidden></div>
```

This markup must now be changed to use `aria-errormessage` and an error element ID:

```html
<input
  type="email"
  name="email"
  required
  aria-errormessage="email-error"
>
<div id="email-error" hidden></div>
```

#### Missing error elements are no longer created automatically

Previously, when a control had a usable name but no matching `data-error-for` element, the component created an error element after the control.

In version 2.0.0, the error element must be present in the initial markup. If `aria-errormessage` is missing or references an element that cannot be found, the control still participates in validation and receives `aria-invalid="true"`, but no inline error message is displayed.

#### name is no longer used for error association

A `name` attribute is no longer required for validation messages. It is still required when:

- The control's value should be included in submitted form data.
- Radio buttons need to form a native radio group.

#### Radio groups must explicitly reference their shared error element

Each radio button in a group should reference the same error element:

```html
<label>
  <input
    type="radio"
    name="contact"
    value="email"
    required
    aria-errormessage="contact-error"
  >
  Email
</label>

<label>
  <input
    type="radio"
    name="contact"
    value="phone"
    aria-errormessage="contact-error"
  >
  Phone
</label>

<div id="contact-error" hidden></div>
```

#### Error elements no longer receive role="status" automatically

Version 1 added both `role="status"` and `aria-live="polite"` when neither was present.

Version 2 adds only `aria-live="polite"` when neither is present.

Existing authored role and aria-live values continue to be preserved.

## [1.0.1] - 2026-05-18

### Changed

- Replaced the `data-invalid` attribute with `aria-invalid` on invalid form controls to expose validation state through a standard accessibility attribute.

## [1.0.0] - 2026-03-28

### Added
- Initial release of `<validated-form>`.
- Support for enhancing a native `<form>` with accessible inline validation errors based on the Constraint Validation API.
- Automatic display of native browser validation messages, with support for per-rule message overrides via `data-msg-*` attributes:
  - `data-msg-required`
  - `data-msg-type`
  - `data-msg-pattern`
  - `data-msg-too-short`
  - `data-msg-too-long`
  - `data-msg-min`
  - `data-msg-max`
  - `data-msg-step`
  - `data-msg-bad-input`
- Support for two validation reporting modes through the `report` attribute/property:
  - `all` to show errors for all invalid controls
  - `first` to show only the first invalid control's error during form validation
- Public API:
  - `ValidatedForm.define()`
  - `validate()`
  - `resetValidation()`
  - `isValid()`
- Support for opting out of focusing the first invalid control through the `no-focus` attribute/property.
- Automatic association of error elements with controls through `aria-describedby`.
- Automatic live region defaults for error elements when not already provided.
- Automatic creation of missing error elements for controls with a usable `name`.
- Live validation updates on `input` and `change` after validation has started.
- Support for controls associated with the wrapped form via the `form` attribute when they are inside the `<validated-form>` subtree.
- Automatic disabling of native browser validation UI on the wrapped form by setting `form.noValidate = true`.
