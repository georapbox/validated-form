import '../lib/browser-window.js';

const url = window.location.href;
const isLocalhost = url.includes('127.0.0.1') || url.includes('localhost');
const componentUrl = isLocalhost ? '../../dist/validated-form.js' : '../lib/validated-form.js';

const { ValidatedForm } = await import(componentUrl);
ValidatedForm.defineCustomElement();

const demoForm = document.getElementById('demo-form');
const successDialog = document.getElementById('success-dialog');

demoForm.addEventListener('submit', evt => {
  evt.preventDefault();

  if (!demoForm.checkValidity()) {
    return;
  }

  const formData = new FormData(demoForm);
  const data = Object.fromEntries(formData.entries());
  console.log('Form data:', data);
  successDialog.showModal();
});
