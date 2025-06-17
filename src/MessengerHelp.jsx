import React from 'react';
import fbGuide from './assets/messenger-fb-guide.png';
import messengerGuide from './assets/messenger-app-guide.png';
import Navbar from './Components/Navbar';

function MessengerHelp() {
  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 text-gray-800">
        <h1 className="text-xl sm:text-2xl font-bold mb-6 text-center">
          Skąd wziąć link do Messengera?
        </h1>

        <p className="mb-4 text-sm sm:text-base text-justify">
          Jeśli chcesz, żeby klienci mogli się z Tobą skontaktować przez Messenger, wklej swój link w formacie:
        </p>

        <pre className="bg-gray-100 p-3 rounded mb-6 text-sm overflow-x-auto">
          <strong>https://m.me/twojanazwa</strong>  lub  <strong>https://facebook.com/twojanazwa</strong>
        </pre>

        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">🖥️ Facebook w przeglądarce (komputer)</h2>
          <ol className="list-decimal pl-5 mb-4 text-sm sm:text-base space-y-1">
            <li>Przejdź na swój profil na Facebooku.</li>
            <li>Potwierdź jeszcze raz swój profil</li>
            <li>Na pasku adresu - to jest Twój link.</li>
            <li>Skopiuj link i wklej go w formularzu</li>
          </ol>
          <div className="w-full flex justify-center">
            <img
              src={fbGuide}
              alt="Instrukcja: Facebook w przeglądarce"
              className="w-full sm:w-[600px] md:w-[750px] lg:w-[900px] xl:w-[1000px] rounded shadow border mx-auto"
            />
          </div>
        </section>

        {/* trzy puste linie */}
        <br />
        <br />
        <br />

        <section>
          <h2 className="text-lg font-semibold mb-3">📱 Aplikacja Messenger (telefon)</h2>
          <ol className="list-decimal pl-5 mb-4 text-sm sm:text-base space-y-1">
            <li>Kliknij na dole MENU</li>
            <li>W prawym górnym rogu kliknij kwadracik QR</li>
            <li>Na dole masz: <strong>„Udostępnij mój link”</strong>.</li>
            <li>Skopiuj link i wklej go w formularzu.</li>
          </ol>
          <div className="w-full flex justify-center">
            <img
              src={messengerGuide}
              alt="Instrukcja: Messenger w aplikacji mobilnej"
              className="w-full max-w-md mx-auto rounded shadow border"
            />
          </div>
        </section>
      </div>
    </>
  );
}

export default MessengerHelp;
