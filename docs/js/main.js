import '../lib/browser-window.js';

const url = window.location.href;
const isLocalhost = url.includes('127.0.0.1') || url.includes('localhost');
const componentUrl = isLocalhost ? '../../dist/validated-form.js' : '../lib/validated-form.js';

const { ValidatedForm } = await import(componentUrl);
ValidatedForm.defineCustomElement();

document.querySelectorAll('h3[id^="example-"]').forEach((el, index) => {
  el.insertAdjacentHTML('afterbegin', `<a href="#${el.getAttribute('id')}">#</a> Example ${index + 1} - `);
});

document.querySelectorAll('.card').forEach(el => {
  el.insertAdjacentHTML('afterend', `<div class="back-top"><a href="#">↑ Back to top</a></div>`);
});
