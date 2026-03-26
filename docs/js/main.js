import '../lib/browser-window.js';

const url = window.location.href;
const isLocalhost = url.includes('127.0.0.1') || url.includes('localhost');
const componentUrl = isLocalhost ? '../../dist/validated-form.js' : '../lib/validated-form.js';

const { ValidatedForm } = await import(componentUrl);
ValidatedForm.define();

const validatedForm = document.querySelector('validated-form');
const demoForm = document.getElementById('demo-form');
const successDialog = document.getElementById('success-dialog');
const out = successDialog.querySelector('code');

demoForm.addEventListener('submit', evt => {
  evt.preventDefault();

  if (!validatedForm.isValid()) {
    return;
  }

  const formData = new FormData(demoForm);
  const entries = Array.from(formData.entries()).map(([key, value]) => {
    if (value instanceof File && value.name) {
      const { name, size, type } = value;
      return [key, { name, size, type }];
    }
    return [key, value];
  });
  const data = Object.fromEntries(entries);

  out.textContent = JSON.stringify(data, null, 2);
  window.hljs.highlightElement(out);
  successDialog.showModal();
  console.log('Form data:', data);
});

const optionsform = document.getElementById('options-form');

optionsform.querySelectorAll('[disabled]').forEach(input => (input.disabled = false));

optionsform.addEventListener('change', evt => {
  const target = evt.target;

  switch (target.name) {
    case 'report':
      validatedForm.setAttribute('report', target.value);
      break;
    case 'no-focus':
      validatedForm.toggleAttribute('no-focus', evt.target.checked);
      break;
  }
});
