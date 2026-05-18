# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
