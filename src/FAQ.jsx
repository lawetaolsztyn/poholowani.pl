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
          To platforma, która łączy osoby poszukujące transportu z przewoźnikami i firmami pomocy drogowej. Możesz tu znaleźć transport lub zaoferować wolne miejsce na lawecie lub w busie w całej Europie.
        </p>

        <h2>2. Czy korzystanie z serwisu jest płatne?</h2>
        <p>
          Nie. Rejestracja i korzystanie z podstawowych funkcji serwisu jest całkowicie bezpłatne, zarówno dla klientów, jak i przewoźników. Serwis nie pobiera prowizji od realizowanych zleceń.
        </p>

        <h2>3. Jak dodać ogłoszenie lub trasę?</h2>
        <p>
          Nie musisz się rejestrować, aby dodać ogłoszenie o poszukiwaniu transportu na Tablicy Ogłoszeń lub ofertę transportu w zakładce "Oferuję transport". Wystarczy wejść w odpowiednią sekcję, wypełnić formularz i zatwierdzić.
          <br />
          **Uwaga:** Tylko zalogowani użytkownicy mogą później edytować lub usuwać swoje ogłoszenia i trasy. Trasy i zgłoszenia pilnej potrzeby znikają automatycznie po 24 lub 48 godzinach od daty rozpoczęcia/dodania (w zależności od typu ogłoszenia).
        </p>

        <h2>4. Jak skontaktować się z przewoźnikiem lub ogłoszeniodawcą?</h2>
        <p>
          Po zalogowaniu możesz korzystać z udostępnionego numeru telefonu (jeśli został podany i zaakceptowano jego publiczne udostępnienie) lub z komunikatora wewnętrznego serwisu. Numer telefonu jest widoczny publicznie, jeśli użytkownik go dobrowolnie udostępni w formularzu.
        </p>

        <h2>5. Czy poholowani.pl odpowiada za realizację transportu?</h2>
        <p>
          Nie. Serwis jedynie umożliwia kontakt między stronami. Nie pośredniczymy w umowie ani nie odpowiadamy za jej wykonanie.
        </p>

        <h2>6. Czy muszę mieć firmę, żeby oferować transport?</h2>
        <p>
          Nie. Serwis jest dostępny zarówno dla firm, jak i użytkowników prywatnych. Jednak tylko konta z numerem NIP będą oznaczane jako „firma” w chmurkach na mapie i w kafelkach tras. Konta prywatne są również mile widziane.
        </p>

        <h2>7. Czy mogę edytować lub usunąć swoje ogłoszenie lub trasę?</h2>
        <p>
          Tak. Po zalogowaniu się do konta przejdź do zakładki „Moje Trasy” lub „Moje Ogłoszenia” i wybierz opcję edycji lub usunięcia.
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
          Tak. Szczegóły znajdziesz w naszej <a href="/polityka-prywatnosci">Polityce Prywatności</a>, gdzie opisujemy zasady przetwarzania danych osobowych oraz wykorzystania plików cookies.
        </p>

        <h2>12. Jak działa mapa i krzyżyk na środku na stronie głównej?</h2>
        <p>
          Na stronie głównej mapa ma charakter poglądowy i nie jest interaktywna. Na stronach wyszukiwania i dodawania ogłoszeń, czerwony krzyżyk na środku mapy może wskazywać Twoją lokalizację (jeśli na to zezwolisz) lub domyślny punkt centralny. W trybie wyszukiwania tras, trasy są wyświetlane w promieniu 100 km od tego punktu. Profile pomocy drogowej są widoczne w promieniu 50 km od krzyżyka na mapie.
        </p>
        <h2>13. Jak dodać trasę jako przewoźnik?</h2>
        <p>
          1. Możesz dodać trasę bez logowania i rejestracji – przejdź do zakładki „Oferuję transport”.
          <br />
          2. Wypełnij formularz, podając miejscowości początkową i docelową, opcjonalnie punkt pośredni, datę, ładowność, ilość miejsc dla pasażerów oraz dane kontaktowe (telefon, link do Messengera). Dane kontaktowe mogą być automatycznie podstawione z Twojego profilu, jeśli wyrazisz na to zgodę.
          <br />
          3. Zatwierdź formularz – trasa natychmiast pojawi się na mapie.
          <br />
          4. Twoja trasa będzie widoczna przez 24 godziny od planowanej daty wyjazdu.
          <br />
          5. Jeżeli jesteś firmą, możesz podać NIP w profilu – trasa będzie wtedy oznaczona jako „firma”.
          <br />
          6. **Uwaga:** Tylko zalogowani użytkownicy mogą później edytować lub usuwać swoje ogłoszenia.
        </p>
        <h2>14. Jak dodać ogłoszenie na Tablicę Ogłoszeń jako klient?</h2>
        <p>
          1. Przejdź do zakładki "Tablica Ogłoszeń" i kliknij "Dodaj Nowe Ogłoszenie".
          <br />
          2. Musisz być zalogowany, aby dodać ogłoszenie. Jeśli nie jesteś, zostaniesz przekierowany do strony logowania/rejestracji.
          <br />
          3. Wypełnij formularz, podając tytuł, opis, opcjonalnie miejsca "Skąd" i "Dokąd", co ma być przewiezione, wagę, budżet oraz dane kontaktowe. Możesz dodać zdjęcie i określić, czy zgadzasz się na publiczne udostępnienie numeru telefonu.
          <br />
          4. Twoje dane kontaktowe (telefon, WhatsApp, Messenger) mogą być automatycznie podstawione z Twojego profilu użytkownika.
          <br />
          5. Ogłoszenie pojawi się na liście i będzie widoczne dla przewoźników.
          <br />
          6. Ogłoszenia na tablicy są aktywne przez dłuższy czas i możesz je później edytować lub usunąć w sekcji "Moje Ogłoszenia".
        </p>
        <h2>15. Czym jest "Transport Na Już!" i jak działa?</h2>
        <p>
          To sekcja dla pilnych zgłoszeń, np. w przypadku awarii samochodu lub nagłej potrzeby transportu.
          <br />
          1. Kliknij "Zgłoś pilną potrzebę".
          <br />
          2. Wypełnij formularz, podając rodzaj pojazdu, lokalizację (możesz użyć swojej bieżącej lokalizacji GPS), opis problemu i numer telefonu.
          <br />
          3. Po zgłoszeniu, serwis powiadomi przewoźników o Twojej potrzebie.
          <br />
          4. Na mapie w formularzu zgłoszenia zobaczysz pobliskie firmy pomocy drogowej w promieniu 50 km od wskazanej lokalizacji.
          <br />
          5. Zgłoszenia są widoczne na liście przez 48 godzin.
        </p>
        <h2>16. Jak działa "Katalog Przewoźników"?</h2>
        <p>
          "Katalog Przewoźników" pozwala na przeglądanie firm i osób oferujących usługi transportowe lub pomoc drogową.
          <br />
          1. Możesz filtrować wyniki po województwie i typie oferowanych usług (np. Samochód osobowy, Bus, Autolaweta, Pomoc Drogowa).
          <br />
          2. Każdy przewoźnik, który wyraził zgodę na publiczny profil, ma swoją wizytówkę z danymi kontaktowymi, opisem, flotą pojazdów i galerią zdjęć.
          <br />
          3. Możesz bezpośrednio skontaktować się z przewoźnikiem, klikając na podany numer telefonu lub przechodząc do jego profilu firmowego.
        </p>
        <h2>17. Jak działają "Moje Chaty" i powiadomienia o nowych wiadomościach?</h2>
        <p>
          "Moje Chaty" to Twoje centrum komunikacji z innymi użytkownikami serwisu.
          <br />
          1. Wszystkie Twoje konwersacje dotyczące ogłoszeń są tutaj widoczne.
          <br />
          2. Licznik nieprzeczytanych wiadomości jest widoczny na pasku nawigacyjnym obok "Moje Chaty".
          <br />
          3. Kiedy otworzysz rozmowę, wiadomości zostaną automatycznie oznaczone jako przeczytane.
          <br />
          4. Możesz ukryć rozmowę z listy, jeśli nie jest już dla Ciebie aktualna. Pojawi się ona ponownie, jeśli otrzymasz nową wiadomość.
          <br />
          5. System wykorzystuje technologię czasu rzeczywistego (realtime), więc nowe wiadomości pojawiają się natychmiast.
        </p>
      </div>
      <Footer />
    </>
  );
}
