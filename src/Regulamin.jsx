import Navbar from './components/Navbar';
import './Regulamin.css'; // Dodaj import pliku CSS

export default function Regulamin() {
  return (
    <>
      <Navbar />
      <div className="regulamin-container"> {/* Usunięte style inline, dodana klasa */}
        <h1>Regulamin serwisu poholowani.pl</h1>

        <h2>1. Postanowienia ogólne</h2>
        <p>
          1.1. Niniejszy regulamin określa zasady korzystania z serwisu internetowego poholowani.pl, prowadzącego działalność polegającą na kojarzeniu osób poszukujących transportu z przewoźnikami.<br />
          1.2. Właścicielem serwisu jest firma Daroot Garage, z siedzibą w Olsztynie, NIP 7441471703.<br />
          1.3. Korzystanie z serwisu oznacza akceptację niniejszego regulaminu.
        </p>

        <h2>2. Zakres usług</h2>
        <p>
          2.1. Serwis umożliwia:<br />
          &nbsp;&nbsp;a) dodawanie ogłoszeń transportowych przez osoby fizyczne i firmy,<br />
          &nbsp;&nbsp;b) przeglądanie ofert przewozowych,<br />
          &nbsp;&nbsp;c) komunikację między klientem a przewoźnikiem,<br />
          &nbsp;&nbsp;d) prezentację profili firm zajmujących się transportem lub pomocą drogową.<br />
          2.2. Serwis nie pobiera prowizji od realizowanych zleceń.<br />
          2.3. Serwis nie jest stroną umowy między klientem a przewoźnikiem i nie ponosi odpowiedzialności za wykonanie usługi.
        </p>

        <h2>3. Rejestracja i konto użytkownika</h2>
        <p>
          3.1. Rejestracja w serwisie jest dobrowolna i bezpłatna.<br />
          3.2. Użytkownik zobowiązuje się do podania prawdziwych danych.<br />
          3.3. Każde konto może zostać usunięte na żądanie użytkownika lub w przypadku naruszenia regulaminu.
        </p>

        <h2>4. Odpowiedzialność i zasady korzystania</h2>
        <p>
          4.1. Zabrania się publikowania ogłoszeń niezgodnych z prawem, wprowadzających w błąd lub zawierających treści obraźliwe.<br />
          4.2. Właściciel serwisu zastrzega sobie prawo do usuwania ogłoszeń naruszających zasady regulaminu.<br />
          4.3. Użytkownik ponosi pełną odpowiedzialność za treści, które publikuje.<br />
	  4.4. Użytkownik, który publikuje dane kontaktowe (np. numer telefonu), wyraża zgodę na ich publiczne udostępnienie w ramach ogłoszenia
        </p>

        <h2>5. Dane osobowe i polityka prywatności</h2>
        <p>
          5.1. Administratorem danych osobowych jest Daroot Garage.<br />
          5.2. Dane przetwarzane są wyłącznie w celach związanych z funkcjonowaniem serwisu.<br />
          5.3. Użytkownik ma prawo dostępu do swoich danych oraz ich poprawiania lub usunięcia.
        </p>

        <h2>6. Postanowienia końcowe</h2>
        <p>
          6.1. Właściciel serwisu zastrzega sobie prawo do zmiany niniejszego regulaminu.<br />
          6.2. O zmianie regulaminu użytkownicy zostaną poinformowani drogą elektroniczną lub poprzez ogłoszenie na stronie.<br />
          6.3. Regulamin wchodzi w życie z dniem publikacji w serwisie.
        </p>

        <p className="regulamin-footer-text"> {/* Usunięte style inline, dodana klasa */}
          Ten dokument jest dostępny publicznie pod adresem: <strong>http://poholowani.pl/regulamin</strong>
        </p>
      </div>
    </>
  );
}