import React from 'react';
import './PolitykaPrywatnosci.css'; // Dodaj import pliku CSS

const PolitykaPrywatnosci = () => {
  return (
    <div className="polityka-container"> {/* Usunięte style inline */}
      <h1>Polityka prywatności</h1> {/* Usunięte style inline */}

      <h2>1. Administrator danych</h2>
      <p>
        Administratorem danych osobowych jest firma Daroot Garage – Dariusz Grzybowski, ul. Złota 6/14, 10-698 Olsztyn, NIP 7441471703. Kontakt możliwy jest pod adresem e-mail: lawetaolsztyn@gmail.com.
      </p>

      <h2>2. Zakres zbieranych danych</h2>
      <p>
        Zbieramy następujące dane osobowe:<br />
        – imię i nazwisko,<br />
        – adres e-mail,<br />
        – numer telefonu,<br />
        – lokalizacja (jeśli użytkownik wyrazi na to zgodę),<br />
        – dane firmy (NIP, nazwa, adres),<br />
        – dane dotyczące pojazdów oraz usług transportowych,<br />
        – dane przekazywane przez usługę Google (reCAPTCHA i logowanie),<br />
        – dane przekazywane przez usługę Facebook (logowanie),<br />
        – adres IP i dane techniczne urządzenia.
      </p>

      <h2>3. Cel przetwarzania danych</h2>
      <p>
        Dane osobowe są przetwarzane w celu:<br />
        – realizacji usług świadczonych przez serwis poholowani.pl,<br />
        – umożliwienia kontaktu między użytkownikami (klientami i przewoźnikami),<br />
        – zapewnienia bezpieczeństwa i zapobiegania nadużyciom,<br />
        – analityki i poprawy działania serwisu.<br />
      </p>

      <h2>4. Podstawa prawna przetwarzania</h2>
      <p>
        4.1. Przetwarzanie danych odbywa się na podstawie:<br />
        – zgody użytkownika (art. 6 ust. 1 lit. a RODO),<br />
        – wykonania umowy (art. 6 ust. 1 lit. b RODO),<br />
        – prawnie uzasadnionego interesu administratora (art. 6 ust. 1 lit. f RODO).<br /><br />
        4.2. Użytkownik ma prawo w każdej chwili wycofać zgodę na przetwarzanie danych, co nie wpływa na zgodność z prawem przetwarzania przed jej cofnięciem.<br /><br />
        4.3. W przypadku logowania przez Google lub Facebook, dane takie jak imię, nazwisko, adres e-mail i identyfikator użytkownika są przetwarzane przez te platformy zgodnie z ich własnymi politykami prywatności. Korzystanie z tych opcji logowania oznacza akceptację ich warunków.
      </p>

      <h2>5. Czas przechowywania danych</h2>
      <p>
        Dane są przechowywane przez okres korzystania z serwisu oraz przez okres wymagany przepisami prawa lub do momentu żądania ich usunięcia przez użytkownika.
      </p>

      <h2>6. Pliki cookies</h2>
      <p>
        Serwis wykorzystuje pliki cookies w celach statystycznych, funkcjonalnych, bezpieczeństwa oraz integracji z zewnętrznymi usługami (takich jak Google reCAPTCHA oraz logowanie przez Google i Facebook).<br />
        Każdy użytkownik może zarządzać ustawieniami cookies w swojej przeglądarce. Korzystanie z serwisu po akceptacji komunikatu oznacza zgodę na ich użycie.
      </p>

      <h2>7. Prawa użytkownika</h2>
      <p>
        Użytkownik ma prawo do:<br />
        – dostępu do swoich danych,<br />
        – ich sprostowania,<br />
        – usunięcia („prawo do bycia zapomnianym”),<br />
        – ograniczenia przetwarzania,<br />
        – przenoszenia danych,<br />
        – wniesienia sprzeciwu wobec przetwarzania,<br />
        – złożenia skargi do organu nadzorczego (UODO).
      </p>

      <h2>8. Bezpieczeństwo danych</h2>
      <p>
        Stosujemy odpowiednie środki techniczne i organizacyjne zapewniające ochronę danych osobowych przed ich utratą, nieuprawnionym dostępem, zmianą lub zniszczeniem.
      </p>

      <h2>9. Integracje z zewnętrznymi usługami</h2>
      <p>
        9.1. Serwis korzysta z narzędzi Google (reCAPTCHA, logowanie) oraz Facebook (logowanie) w celu zwiększenia bezpieczeństwa i ułatwienia logowania.<br />
        9.2. Usługi te mogą zbierać dane niezależnie od nas. Zalecamy zapoznanie się z ich politykami prywatności:<br />
        – <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Polityka prywatności Google</a><br />
        – <a href="https://www.facebook.com/policy.php" target="_blank" rel="noopener noreferrer">Polityka prywatności Facebook</a>
      </p>
    </div>
  );
};

export default PolitykaPrywatnosci;