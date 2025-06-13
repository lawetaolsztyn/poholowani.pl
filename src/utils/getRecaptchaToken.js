// src/utils/getRecaptchaToken.js
export const getRecaptchaToken = async (action = 'submit') => {
  return new Promise((resolve) => {
    if (!window.grecaptcha) {
      console.warn('⚠️ reCAPTCHA niedostępna. Użytkownik nie zaakceptował cookies?');
      return resolve(null);
    }

    window.grecaptcha.ready(() => {
      window.grecaptcha.execute('6LeqFVIrAAAAAHYmk1g43t4CyWuNKDKK3EAJDmhr', { action })
        .then((token) => {
          resolve(token);
        })
        .catch((err) => {
          console.error('❌ Błąd reCAPTCHA:', err);
          resolve(null);
        });
    });
  });
};
