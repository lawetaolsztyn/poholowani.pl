export const getRecaptchaToken = async (action = 'submit') => {
  return new Promise((resolve) => {
    if (!window.grecaptcha) {
      console.warn('⚠️ reCAPTCHA niedostępna. Użytkownik nie zaakceptował cookies?');
      return resolve(null);
    }

    window.grecaptcha.ready(() => {
      window.grecaptcha.execute(import.meta.env.VITE_RECAPTCHA_SITE_KEY, { action })
        .then((token) => {
          console.log("Wygenerowany token reCAPTCHA:", token); // <-- Dodaj ten log
          resolve(token);
        })
        .catch((err) => {
          console.error('❌ Błąd reCAPTCHA:', err);
          resolve(null);
        });
    });
  });
};