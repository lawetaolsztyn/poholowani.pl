import React, { useRef, useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import './Kontakt.css';

export default function Kontakt() {
  const formRef = useRef(null);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData(formRef.current);

    try {
      const response = await fetch("https://formspree.io/f/mjkwnaaa", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      if (response.ok) {
        setStatus("success");
        formRef.current.reset();
      } else {
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
    }
  };

  return (
    <>
      <Navbar />
      <div className="kontakt-container">
        <div className="kontakt-banner">
          <h1>Skontaktuj się z nami</h1>
          <p>Masz pytania? Wypełnij formularz poniżej, a my odpowiemy jak najszybciej.</p>
        </div>
        <form
          ref={formRef}
          className="kontakt-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="name">Imię i nazwisko</label>
          <input type="text" id="name" name="name" required />

          <label htmlFor="email">Adres e-mail</label>
          <input type="email" id="email" name="email" required />

          <label htmlFor="message">Wiadomość</label>
          <textarea id="message" name="message" rows="6" required></textarea>

          <button type="submit">Wyślij wiadomość</button>

          {status === "success" && <p className="success-message">Wiadomość została wysłana!</p>}
          {status === "error" && <p className="error-message">Wystąpił błąd. Spróbuj ponownie później.</p>}
        </form>
      </div>
      
    </>
  );
}
