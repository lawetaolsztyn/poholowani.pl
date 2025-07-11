import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './FAQ.css'; // Dodajemy import pliku CSS

export default function FAQ() {
  return (
    <>
      <Navbar />
      <div className="faq-container"> {/* Używamy klasy z CSS */}
        <h1>FAQ / Pomoc – poholowani.pl</h1>

        <h2>1. Czym jest poholowani.pl?</h2> {/* Usunąłem ** bo to będzie stylizowane w CSS */}
        <p>
          To platforma, która łączy osoby poszukujące transportu z przewoźnikami i firmami pomocy drogowej. Możesz tu znaleźć transport lub zaoferować wolne miejsce na lawecie lub w busie w całej Europie.
        </p>

        <h2>2. Czy korzystanie z serwisu jest płatne?</h2>
        <p>
          Nie. Rejestracja i korzystanie z podstawowych funkcji serwisu jest całkowicie bezpłatne, zarówno dla klientów, jak i przewoźników. Serwis nie pobiera prowizji od realizowanych zleceń.
        </p>

        <h2>3. Jak dodać ogłoszenie lub trasę?</h2>
        <p>
          Aby dodać ogłoszenie o poszukiwaniu transportu na **Tablicy Ogłoszeń**, musisz być zalogowany. Jeśli nie posiadasz konta, zostaniesz przekierowany do strony rejestracji/logowania.
          <br />
          Aby dodać **ofertę transportu** w zakładce "Oferuję transport" (trasę), **nie musisz być zalogowany ani zarejestrowany**.
          <br />
          W obu przypadkach wystarczy wejść w odpowiednią sekcję, wypełnić formularz i zatwierdzić.
          <br />
          <span className="faq-attention">Uwaga:</span> Tylko zalogowani użytkownicy mogą później edytować lub usuwać swoje ogłoszenia i trasy. Trasy i zgłoszenia pilnej potrzeby znikają automatycznie po 24 lub 48 godzinach od daty rozpoczęcia/dodania (w zależności od typu ogłoszenia).
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
        
        <h2>13. Jak szukać transportu na mapie?</h2>
        <ul className="faq-list"> {/* Używamy ul z klasą do stylizacji */}
          <li>Przejdź do zakładki "Szukam Transportu".</li>
          <li>Skorzystaj z filtrów: "Skąd" i "Dokąd" (pola obowiązkowe), a także "Typ pojazdu" i "Data" (opcjonalne).</li>
          <li>Możesz użyć swojej bieżącej lokalizacji lub wybrać adres z listy sugestii.</li>
          <li>Po kliknięciu "Szukaj", na mapie pojawią się trasy pasujące do Twoich kryteriów, wyświetlane jako linie. Poniżej mapy znajdziesz slider z kartami poszczególnych tras, z możliwością podświetlenia ich na mapie po najechaniu kursorem.</li>
          <li>Możesz także przeglądać ogłoszenia firm pomocy drogowej, które są widoczne na mapie w promieniu 50 km od centrum mapy.</li>
          <li>Przycisk "Reset" przywraca mapę do widoku wszystkich tras (w trybie siatki markerów) i czyści filtry.</li>
        </ul>

        <h2>14. Jak dodać trasę jako przewoźnik?</h2>
        <ul className="faq-list">
          <li>Możesz dodać trasę bez logowania i rejestracji – przejdź do zakładki „Oferuję transport”.</li>
          <li>Wypełnij formularz, podając miejscowości początkową i docelową, opcjonalnie punkt pośredni, datę, ładowność, ilość miejsc dla pasażerów oraz dane kontaktowe (telefon, link do Messengera). Dane kontaktowe mogą być automatycznie podstawione z Twojego profilu, jeśli wyrazisz na to zgodę.</li>
          <li>Zatwierdź formularz – trasa natychmiast pojawi się na mapie.</li>
          <li>Twoja trasa będzie widoczna przez 24 godziny od planowanej daty wyjazdu.</li>
          <li>Jeżeli jesteś firmą, możesz podać NIP w profilu – trasa będzie wtedy oznaczona jako „firma”.</li>
          <li><span className="faq-attention">Uwaga:</span> Tylko zalogowani użytkownicy mogą później edytować lub usuwać swoje ogłoszenia.</li>
        </ul>
        
        <h2>15. Jak dodać ogłoszenie na Tablicę Ogłoszeń jako klient?</h2>
        <ul className="faq-list">
          <li>Przejdź do zakładki "Tablica Ogłoszeń" i kliknij "Dodaj Nowe Ogłoszenie".</li>
          <li>Musisz być zalogowany, aby dodać ogłoszenie. Jeśli nie jesteś, zostaniesz przekierowany do strony logowania/rejestracji.</li>
          <li>Wypełnij formularz, podając tytuł, opis, opcjonalnie miejsca "Skąd" i "Dokąd", co ma być przewiezione, wagę, budżet oraz dane kontaktowe. Możesz dodać zdjęcie i określić, czy zgadzasz się na publiczne udostępnienie numeru telefonu.</li>
          <li>Twoje dane kontaktowe (telefon, WhatsApp, Messenger) mogą być automatycznie podstawione z Twojego profilu użytkownika.</li>
          <li>Ogłoszenie pojawi się na liście i będzie widoczne dla przewoźników.</li>
          <li>Ogłoszenia na tablicy są aktywne przez dłuższy czas i możesz je później edytować lub usunąć w sekcji "Moje Ogłoszenia".</li>
        </ul>
        
        <h2>16. Czym jest "Transport Na Już!" i jak działa?</h2>
        <ul className="faq-list">
          <li>To sekcja dla pilnych zgłoszeń, np. w przypadku awarii samochodu lub nagłej potrzeby transportu.</li>
          <li>Kliknij "Zgłoś pilną potrzebę".</li>
          <li>Wypełnij formularz, podając rodzaj pojazdu, lokalizację (możesz użyć swojej bieżącej lokalizacji GPS), opis problemu i numer telefonu.</li>
          <li>Po zgłoszeniu, serwis powiadomi przewoźników o Twojej potrzebie.</li>
          <li>Na mapie w formularzu zgłoszenia zobaczysz pobliskie firmy pomocy drogowej w promieniu 50 km od wskazanej lokalizacji.</li>
          <li>Zgłoszenia są widoczne na liście przez 48 godzin.</li>
        </ul>
        
        <h2>17. Jak działa "Katalog Przewoźników"?</h2>
        <ul className="faq-list">
          <li>"Katalog Przewoźników" pozwala na przeglądanie firm i osób oferujących usługi transportowe lub pomoc drogową.</li>
          <li>Możesz filtrować wyniki po województwie i typie oferowanych usług (np. Samochód osobowy, Bus, Autolaweta, Pomoc Drogowa).</li>
          <li>Każdy przewoźnik, który wyraził zgodę na publiczny profil, ma swoją wizytówkę z danymi kontaktowymi, opisem, flotą pojazdów i galerią zdjęć.</li>
          <li>Możesz bezpośrednio skontaktować się z przewoźnikiem, klikając na podany numer telefonu lub przechodząc do jego profilu firmowego.</li>
        </ul>
        
        <h2>18. Jak działają "Moje Chaty" i powiadomienia o nowych wiadomościach?</h2>
        <ul className="faq-list">
          <li>"Moje Chaty" to Twoje centrum komunikacji z innymi użytkownikami serwisu.</li>
          <li>Wszystkie Twoje konwersacje dotyczące ogłoszeń są tutaj widoczne.</li>
          <li>Licznik nieprzeczytanych wiadomości jest widoczny na pasku nawigacyjnym obok "Moje Chaty".</li>
          <li>Kiedy otworzysz rozmowę, wiadomości zostaną automatycznie oznaczone jako przeczytane.</li>
          <li>Możesz ukryć rozmowę z listy, jeśli nie jest już dla Ciebie aktualna. Pojawi się ona ponownie, jeśli otrzymasz nową wiadomość.</li>
          <li>System wykorzystuje technologię czasu rzeczywistego (realtime), więc nowe wiadomości pojawiają się natychmiast.</li>
        </ul>
      </div>
      </>
  );
}
