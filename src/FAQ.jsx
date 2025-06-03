import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function FAQ() {
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
        <h1>FAQ / Pomoc – poholowani.pl</h1>

        <h2>1. Czym jest poholowani.pl?</h2>
        <p>
          To platforma, która łączy osoby poszukujące transportu z przewoźnikami i firmami pomocy drogowej. Możesz tu znaleźć transport lub zaoferować wolne miejsce na lawecie lub w busie.
        </p>

        <h2>2. Czy korzystanie z serwisu jest płatne?</h2>
        <p>
          Nie. Rejestracja i korzystanie z podstawowych funkcji serwisu jest całkowicie bezpłatne, zarówno dla klientów, jak i przewoźników.
        </p>

        <h2>3. Jak dodać ogłoszenie?</h2>
        <p>
          Nie trzeba się rejestrować, aby dodać ogłoszenie. Wystarczy wejść w „Oferuję transport” lub „Szukam transportu”, wypełnić formularz i zatwierdzić.
          <br />Uwaga: tylko zalogowani użytkownicy mogą później edytować lub usuwać swoje ogłoszenia. Trasy znikają automatycznie po 24 godzinach od daty rozpoczęcia (nie od daty dodania).
        </p>

        <h2>4. Jak skontaktować się z przewoźnikiem?</h2>
        <p>
          Po zalogowaniu możesz korzystać z przycisku „Zadzwoń” (jeśli numer został podany) lub z komunikatora wewnętrznego.
Podany numer telefonu jest widoczny publicznie, jeśli użytkownik go dobrowolnie udostępni w formularzu
        </p>

        <h2>5. Czy poholowani.pl odpowiada za realizację transportu?</h2>
        <p>
          Nie. Serwis jedynie umożliwia kontakt między stronami. Nie pośredniczymy w umowie ani nie odpowiadamy za jej wykonanie.
        </p>

        <h2>6. Czy muszę mieć firmę, żeby oferować transport?</h2>
        <p>
          Nie. Serwis jest dostępny zarówno dla firm, jak i użytkowników prywatnych. Jednak tylko konta z numerem NIP będą oznaczane jako „firma” w chmurkach na mapie i w kafelkach tras. Konta prywatne są również mile widziane.
        </p>

        <h2>7. Czy mogę edytować lub usunąć swoje ogłoszenie?</h2>
        <p>
          Tak. Po zalogowaniu się do konta przejdź do zakładki „Moje ogłoszenia” i wybierz opcję edycji lub usunięcia.
        </p>

        <h2>8. Mam problem z kontem – co zrobić?</h2>
        <p>
          Napisz do nas na adres: <a href="mailto:kontakt@poholowani.pl">kontakt@poholowani.pl</a>. Opisz dokładnie problem – odpowiemy jak najszybciej.
        </p>

        <h2>9. Czy przewoźnicy są weryfikowani?</h2>
        <p>
          Pracujemy nad systemem weryfikacji firm. Wkrótce firmy z licencją i działalnością będą miały oznaczenie „Zweryfikowana firma”.
        </p>

        <h2>10. Czy mogę korzystać z serwisu na telefonie?</h2>
        <p>
          Tak. Strona jest responsywna i działa zarówno na komputerze, jak i na smartfonie.
        </p>

       <h2>11. Czy moje dane są bezpieczne?</h2>
    <p>
      Tak. Szczegóły znajdziesz w naszej <a href="/polityka-prywatnosci">Polityce Prywatności</a>.
    </p>

    <h2>12. Jak działa mapa i krzyżyk na środku?</h2>
    <p>
      Po wejściu na stronę domyślnie ustawiany jest czerwony krzyżyk w Twojej lokalizacji (lub w centrum Polski, jeśli geolokalizacja jest zablokowana). Trasy transportowe wyświetlane są w promieniu 100 km od tego krzyżyka. Profile pomocy drogowej są widoczne w promieniu 50 km od krzyżyka.
    </p>
<h2>13. Jak dodać trasę jako przewoźnik?</h2>
   <p>
      1. Nie musisz się logować ani rejestrować – możesz po prostu wejść w zakładkę „Oferuję transport” i wystawić trasę.<br />
      2. Wypełnij krótki formularz: wpisz miejscowości początkową i docelową, opcjonalnie punkt pośredni, datę, ładowność oraz numer telefonu do kontaktu.<br />
      3. Zatwierdź formularz – trasa natychmiast pojawi się na mapie.<br />
      4. Twoja trasa będzie widoczna przez 24 godziny od planowanej daty wyjazdu.<br />
      5. Jeżeli jesteś firmą, możesz podać NIP – trasa będzie wtedy oznaczona jako „firma”.<br />
      6. Uwaga: tylko zalogowani użytkownicy mogą później edytować lub usuwać swoje ogłoszenia.
    </p>
      </div>
      
    </>
  );
}
