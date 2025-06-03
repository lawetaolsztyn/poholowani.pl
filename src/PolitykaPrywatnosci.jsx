import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function PolitykaPrywatnosci() {
  return (
    <>
      <Navbar />
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem',
        fontFamily: 'Poppins, sans-serif',
        lineHeight: '1.6',
        color: '#333'
      }}>
        <h1>Polityka Prywatności serwisu poholowani.pl</h1>

        <h2>1. Informacje ogólne</h2>
        <p>
          1.1. Niniejsza Polityka Prywatności określa zasady przetwarzania i ochrony danych osobowych użytkowników serwisu poholowani.pl.<br />
          1.2. Administratorem danych jest firma Daroot Garage, NIP 7441471703, z siedzibą w Olsztynie.<br />
          1.3. Kontakt w sprawach dotyczących danych osobowych: kontakt@poholowani.pl
        </p>

        <h2>2. Zakres zbieranych danych</h2>
        <p>
          Przetwarzamy następujące dane osobowe:<br />
          – adres e-mail,<br />
          – numer telefonu (jeśli podany dobrowolnie),<br />
          – dane lokalizacyjne (na potrzeby wyszukiwania przewoźników),<br />
          – informacje z formularzy rejestracyjnych i ogłoszeniowych,<br />
          – adres IP, identyfikatory przeglądarki i systemu (ciasteczka).<br />
          – Jeśli użytkownik podaje numer telefonu w formularzu ogłoszenia, zgadza się na jego publiczne wyświetlanie w ogłoszeniu widocznym dla innych użytkowników.
        </p>

        <h2>3. Cele i podstawy prawne przetwarzania</h2>
        <p>
          Dane przetwarzamy w celu:<br />
          – założenia konta i świadczenia usług dostępu do platformy,<br />
          – kontaktu z użytkownikiem w sprawie ogłoszeń,<br />
          – personalizacji ofert i wyników wyszukiwania,<br />
          – zapewnienia bezpieczeństwa i przeciwdziałania nadużyciom,<br />
          – wypełnienia obowiązków prawnych wynikających z przepisów RODO i ustawy o świadczeniu usług drogą elektroniczną.
        </p>

        <h2>4. Udostępnianie danych</h2>
        <p>
          4.1. Dane mogą być przekazywane dostawcom technologii, np. Supabase Inc. (USA) w ramach hostingu i bazy danych.<br />
          4.2. Nie sprzedajemy i nie udostępniamy danych użytkowników podmiotom trzecim w celach marketingowych.
        </p>

        <h2>5. Prawa użytkownika</h2>
        <p>
          Każdy użytkownik ma prawo do:<br />
          – dostępu do swoich danych,<br />
          – poprawiania danych,<br />
          – żądania usunięcia danych,<br />
          – ograniczenia przetwarzania,<br />
          – wniesienia sprzeciwu wobec przetwarzania,<br />
          – przenoszenia danych.<br />
          Kontakt: kontakt@poholowani.pl
        </p>

        <h2>6. Pliki cookies</h2>
        <p>
          Serwis wykorzystuje pliki cookies w celach statystycznych, funkcjonalnych i bezpieczeństwa.<br />
          Każdy użytkownik może zarządzać ustawieniami cookies w swojej przeglądarce.
        </p>

        <h2>7. Okres przechowywania danych</h2>
        <p>
          7.1. Dane przechowywane są przez okres korzystania z konta w serwisie oraz maksymalnie 2 lata po jego usunięciu.<br />
          7.2. Dane zapisane w celach rozliczeniowych lub prawnych mogą być przechowywane dłużej, zgodnie z przepisami prawa.
        </p>

        <h2>8. Postanowienia końcowe</h2>
        <p>
          8.1. Administrator zastrzega sobie prawo do aktualizacji niniejszej polityki.<br />
          8.2. Aktualna wersja dokumentu jest zawsze dostępna pod adresem: <strong>https://poholowani.pl	/polityka-prywatnosci</strong>
        </p>
      </div>
      
    </>
  );
}
