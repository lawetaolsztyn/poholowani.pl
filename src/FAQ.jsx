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

        <h2>**1. Czym jest poholowani.pl?**</h2>
        <p>
          To platforma, która łączy osoby poszukujące transportu z przewoźnikami i firmami pomocy drogowej. Możesz tu znaleźć transport lub zaoferować wolne miejsce na lawecie lub w busie w całej Europie.
        </p>

        <h2>**2. Czy korzystanie z serwisu jest płatne?**</h2>
        <p>
          Nie. Rejestracja i korzystanie z podstawowych funkcji serwisu jest całkowicie bezpłatne, zarówno dla klientów, jak i przewoźników. Serwis nie pobiera prowizji od realizowanych zleceń.
        </p>

        <h2>**3. Jak dodać ogłoszenie lub trasę?**</h2>
        <p>
          Aby dodać ogłoszenie o poszukiwaniu transportu na Tablicy Ogłoszeń lub ofertę transportu w zakładce "Oferuję transport", musisz być zalogowany. Jeśli nie posiadasz konta, zostaniesz przekierowany do strony rejestracji/logowania. Wystarczy wejść w odpowiednią sekcję, wypełnić formularz i zatwierdzić.
          <br />
          **Uwaga:** Tylko zalogowani użytkownicy mogą później edytować lub usuwać swoje ogłoszenia i trasy. Trasy i zgłoszenia pilnej potrzeby znikają automatycznie po 24 lub 48 godzinach od daty rozpoczęcia/dodania (w zależności od typu ogłoszenia).
        </p>

        <h2>**4. Jak skontaktować się z przewoźnikiem lub ogłoszeniodawcą?**</h2>
        <p>
          Po zalogowaniu możesz korzystać z udostępnionego numeru telefonu (jeśli został podany i zaakceptowano jego publiczne udostępnienie) lub z komunikatora wewnętrznego serwisu. Numer telefonu jest widoczny publicznie, jeśli użytkownik go dobrowolnie udostępni w formularzu.
        </p>

        <h2>**5. Czy poholowani.pl odpowiada za realizację transportu?**</h2>
        <p>
          Nie. Serwis jedynie umożliwia kontakt między stronami. Nie pośredniczymy w umowie ani nie odpowiadamy za jej wykonanie.
        </p>

        <h2>**6. Czy muszę mieć firmę, żeby oferować transport?**</h2>
        <p>
          Nie. Serwis jest dostępny zarówno dla firm, jak i użytkowników prywatnych. Jednak tylko konta z numerem NIP będą oznaczane jako „firma” w chmurkach na mapie i w kafelkach tras. Konta prywatne są również mile widziane.
        </p>

        <h2>**7. Czy mogę edytować lub usunąć swoje ogłoszenie lub trasę?**</h2>
        <p>
          Tak. Po zalogowaniu się do konta przejdź do zakładki „Moje Trasy” lub „Moje Ogłoszenia” i wybierz opcję edycji lub usunięcia.
        </p>

        <h2>**8. Mam problem z kontem – co zrobić?**</h2>
        <p>
          Napisz do nas na adres: <a href="mailto:kontakt@poholowani.pl">kontakt@poholowani.pl</a>. Opisz dokładnie problem – odpowiemy jak najszybciej.
        </p>

        <h2>**9. Czy przewoźnicy są weryfikowani?**</h2>
        <p>
          Pracujemy nad systemem weryfikacji firm. Wkrótce firmy z licencją i działalnością będą miały oznaczenie „Zweryfikowana firma”.
        </p>

        <h2>**10. Czy mogę korzystać z serwisu na telefonie?**</h2>
        <p>
          Tak. Strona jest responsywna i działa zarówno na komputerze, jak i na smartfonie.
        </p>

       <h2>**11. Czy moje dane są bezpieczne?**</h2>
        <p>
          Tak. Szczegóły znajdziesz w naszej <a href="/polityka-prywatnosci">Polityce Prywatności</a>, gdzie opisujemy zasady przetwarzania danych osobowych oraz wykorzystania plików cookies.
        </p>

        <h2>**12. Jak działa mapa i krzyżyk na środku na stronie głównej?**</h2>
        <p>
          Na stronie głównej mapa ma charakter poglądowy i nie jest interaktywna. Na stronach wyszukiwania i dodawania ogłoszeń, czerwony krzyżyk na środku mapy może wskazywać Twoją lokalizację (jeśli na to zezwolisz) lub domyślny punkt centralny. W trybie wyszukiwania tras, trasy są wyświetlane w promieniu 100 km od tego punktu. Profile pomocy drogowej są widoczne w promieniu 50 km od krzyżyka na mapie.
        </p>
        
        <h2>**13. Jak szukać transportu na mapie?**</h2>
        <p>
          1. Przejdź do zakładki "Szukam Transportu".
          <br />
          2. Skorzystaj z filtrów: "Skąd" i "Dokąd" (pola obowiązkowe), a także "Typ pojazdu" i "Data" (opcjonalne).
          <br />
          3. Możesz użyć swojej bieżącej lokalizacji lub wybrać adres z listy sugestii.
          <br />
          4. Po kliknięciu "Szukaj", na mapie pojawią się trasy pasujące do Twoich kryteriów, wyświetlane jako linie. Poniżej mapy znajdziesz slider z kartami poszczególnych tras, z możliwością podświetlenia ich na mapie po najechaniu kursorem.
          <br />
          5. Możesz także przeglądać ogłoszenia firm pomocy drogowej, które są widoczne na mapie w promieniu 50 km od centrum mapy.
          <br />
          6. Przycisk "Reset" przywraca mapę do widoku wszystkich tras (w trybie siatki markerów) i czyści filtry.
        </p>

        <h2>**14. Jak dodać trasę jako przewoźnik?**</h2>
        <p>
          a) Możesz dodać trasę bez logowania i rejestracji – przejdź do zakładki „Oferuję transport”.
          <br />
          b) Wypełnij formularz, podając miejscowości początkową i docelową, opcjonalnie punkt pośredni, datę, ładowność, ilość miejsc dla pasażerów oraz dane kontaktowe (telefon, link do Messengera). Dane kontaktowe mogą być automatycznie podstawione z Twojego profilu, jeśli wyrazisz na to zgodę.
          <br />
          c) Zatwierdź formularz – trasa natychmiast pojawi się na mapie.
          <br />
          d) Twoja trasa będzie widoczna przez 24 godziny od planowanej daty wyjazdu.
          <br />
          e) Jeżeli jesteś firmą, możesz podać NIP w profilu – trasa będzie wtedy oznaczona jako „firma”.
          <br />
          f) **Uwaga:** Tylko zalogowani użytkownicy mogą później edytować lub usuwać swoje ogłoszenia.
        </p>
        
        <h2>**15. Jak dodać ogłoszenie na Tablicę Ogłoszeń jako klient?**</h2>
        <p>
          a) Przejdź do zakładki "Tablica Ogłoszeń" i kliknij "Dodaj Nowe Ogłoszenie".
          <br />
          b) Musisz być zalogowany, aby dodać ogłoszenie. Jeśli nie jesteś, zostaniesz przekierowany do strony logowania/rejestracji.
          <br />
          c) Wypełnij formularz, podając tytuł, opis, opcjonalnie miejsca "Skąd" i "Dokąd", co ma być przewiezione, wagę, budżet oraz dane kontaktowe. Możesz dodać zdjęcie i określić, czy zgadzasz się na publiczne udostępnienie numeru telefonu.
          <br />
          d) Twoje dane kontaktowe (telefon, WhatsApp, Messenger) mogą być automatycznie podstawione z Twojego profilu użytkownika.
          <br />
          e) Ogłoszenie pojawi się na liście i będzie widoczne dla przewoźników.
          <br />
          f) Ogłoszenia na tablicy są aktywne przez dłuższy czas i możesz je później edytować lub usunąć w sekcji "Moje Ogłoszenia".
        </p>
        
        <h2>**16. Czym jest "Transport Na Już!" i jak działa?**</h2>
        <p>
          To sekcja dla pilnych zgłoszeń, np. w przypadku awarii samochodu lub nagłej potrzeby transportu.
          <br />
          a) Kliknij "Zgłoś pilną potrzebę".
          <br />
          b) Wypełnij formularz, podając rodzaj pojazdu, lokalizację (możesz użyć swojej bieżącej lokalizacji GPS), opis problemu i numer telefonu.
          <br />
          c) Po zgłoszeniu, serwis powiadomi przewoźników o Twojej potrzebie.
          <br />
          d) Na mapie w formularzu zgłoszenia zobaczysz pobliskie firmy pomocy drogowej w promieniu 50 km od wskazanej lokalizacji.
          <br />
          e) Zgłoszenia są widoczne na liście przez 48 godzin.
        </p>
        
        <h2>**17. Jak działa "Katalog Przewoźników"?**</h2>
        <p>
          "Katalog Przewoźników" pozwala na przeglądanie firm i osób oferujących usługi transportowe lub pomoc drogową.
          <br />
          a) Możesz filtrować wyniki po województwie i typie oferowanych usług (np. Samochód osobowy, Bus, Autolaweta, Pomoc Drogowa).
          <br />
          b) Każdy przewoźnik, który wyraził zgodę na publiczny profil, ma swoją wizytówkę z danymi kontaktowymi, opisem, flotą pojazdów i galerią zdjęć.
          <br />
          c) Możesz bezpośrednio skontaktować się z przewoźnikiem, klikając na podany numer telefonu lub przechodząc do jego profilu firmowego.
        </p>
        
        <h2>**18. Jak działają "Moje Chaty" i powiadomienia o nowych wiadomościach?**</h2>
        <p>
          "Moje Chaty" to Twoje centrum komunikacji z innymi użytkownikami serwisu.
          <br />
          a) Wszystkie Twoje konwersacje dotyczące ogłoszeń są tutaj widoczne.
          <br />
          b) Licznik nieprzeczytanych wiadomości jest widoczny na pasku nawigacyjnym obok "Moje Chaty".
          <br />
          c) Kiedy otworzysz rozmowę, wiadomości zostaną automatycznie oznaczone jako przeczytane.
          <br />
          d) Możesz ukryć rozmowę z listy, jeśli nie jest już dla Ciebie aktualna. Pojawi się ona ponownie, jeśli otrzymasz nową wiadomość.
          <br />
          e) System wykorzystuje technologię czasu rzeczywistego (realtime), więc nowe wiadomości pojawiają się natychmiast.
        </p>
      </div>
      <Footer />
    </>
  );
}
