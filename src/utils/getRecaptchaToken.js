// src/utils/getRecaptchaToken.js
export const getRecaptchaToken = async (action = 'submit') => {
  return new Promise((resolve) => {
    if (!window.grecaptcha) {
      console.warn('⚠️ reCAPTCHA niedostępna. Użytkownik nie zaakceptował cookies?');
      return resolve(null);
    }

    window.grecaptcha.ready(() => {
      // Upewnij się, że używasz nowego Klucza Witryny tutaj
      // który jest w zmiennej środowiskowej VITE_RECAPTCHA_SITE_KEY
      window.grecaptcha.execute(import.meta.env.VITE_RECAPTCHA_SITE_KEY, { action })
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