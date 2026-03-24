# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of `<validated-form>`.
- Support for wrapping a native `<form>` and enhancing browser validation with accessible inline error messages.
- Validation based on the native Constraint Validation API rather than custom validation rules.
- Automatic error message rendering using each control's native `validationMessage`.
- Support for custom per-rule error messages via `data-msg-*` attributes:
  - `data-msg-required`
  - `data-msg-type`
  - `data-msg-pattern`
  - `data-msg-too-short`
  - `data-msg-too-long`
  - `data-msg-min`
  - `data-msg-max`
  - `data-msg-step`
  - `data-msg-bad-input`
- Support for two reporting modes through the `report` attribute/property:
  - `all` to show errors for all invalid controls
  - `first` to show only the first invalid control's error
- Support for opting out of focusing the first invalid control through the `no-focus` attribute/property.
- Public instance methods:
  - `validate()`
  - `resetValidation()`
  - `isValid()`
- Static `define()` method for custom element registration.
- Automatic `aria-describedby` wiring between controls and their associated error elements.
- Automatic live region defaults for generated or existing error containers using `role="status"` and `aria-live="polite"` when not already provided.
- Automatic creation of missing error elements when a matching `data-error-for` container is not present.
- Support for preserving and extending existing `aria-describedby` values.
- Live validation updates on `input` and `change` after the form has been submitted once.
- Reset of validation UI state without resetting form field values.
- Support for controls associated with the wrapped form via the `form` attribute when they are inside the `<validated-form>` subtree.

### Changed
- Native browser validation UI is disabled on the wrapped form during enhancement by setting `form.noValidate = true`, allowing the component to take over error presentation while still relying on native validity state.

### Notes
- Controls must belong to the wrapped form and have a usable `name` attribute in order to be associated with error elements.
- Controls without a `name` still participate in validation, but no error element or ARIA association is created for them.
- Error message priority follows the internal `ValidityState` check order, allowing the first matching `data-msg-*` override to win before falling back to the browser-provided message.
