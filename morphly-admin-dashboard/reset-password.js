const message = document.querySelector('#resetMessage');
const fields = document.querySelector('#passwordFields');

if (fields) fields.disabled = true;
if (message) message.textContent = 'Opening Vixy password recovery...';

window.location.replace('/#/reset-password');
