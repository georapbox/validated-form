import '../lib/browser-window.js';

const url = window.location.href;
const isLocalhost = url.includes('127.0.0.1') || url.includes('localhost');
const componentUrl = isLocalhost ? '../../dist/custom-element.js' : '../lib/custom-element.js';

const { CustomElement } = await import(componentUrl);
CustomElement.defineCustomElement();

document.querySelectorAll('h3[id^="example-"]').forEach((el, index) => {
  el.insertAdjacentHTML('afterbegin', `<a href="#${el.getAttribute('id')}">#</a> Example ${index + 1} - `);
});

document.querySelectorAll('.card').forEach(el => {
  el.insertAdjacentHTML('afterend', `<div class="back-top"><a href="#">↑ Back to top</a></div>`);
});
