// src/components/AnnouncementForm.jsx (CAŁY PLIK)

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './AnnouncementForm.css';
import LocationAutocomplete from './LocationAutocomplete';

// ZMIANA: Dodano prop 'announcementToEdit'
export default function AnnouncementForm({ onSuccess, announcementToEdit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationFrom, setLocationFrom] = useState({ label: '', coords: null, lat: null, lng: null });
  const [locationTo, setLocationTo] = useState({ label: '', coords: null, lat: null, lng: null });
  const [itemToTransport, setItemToTransport] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [budgetPln, setBudgetPln] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [usesWhatsapp, setUsesWhatsapp] = useState(false);
  const [contactMessenger, setContactMessenger] = useState('');
  const [consentPhoneShare, setConsentPhoneShare] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // useEffect do pobierania danych profilu użytkownika i autopodstawiania (bez zmian)
  useEffect(() => {
    const fetchUserProfileData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('users_extended')
          .select('universal_contact_phone, profile_uses_whatsapp, profile_messenger_link, profile_consent_phone_share')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Błąd pobierania danych profilu dla formularza ogłoszenia:', error.message);
        } else if (profile) {
          setContactPhone(profile.universal_contact_phone || '');
          setUsesWhatsapp(profile.profile_uses_whatsapp || false);
          setContactMessenger(profile.profile_messenger_link || '');
          setConsentPhoneShare(profile.profile_consent_phone_share || false);
        }
      }
    };

    fetchUserProfileData();
  }, []);

  // NOWY useEffect do ładowania danych ogłoszenia do edycji
  useEffect(() => {
    console.log("AnnouncementForm useEffect - announcementToEdit:", announcementToEdit); // Dodane logowanie
    if (announcementToEdit) {
      setTitle(announcementToEdit.title || '');
      setDescription(announcementToEdit.description || '');
      
      // ZMIANA: Sprawdź, czy location_from_coords i location_to_coords istnieją w obiekcie announcementToEdit
      // Sprawdzamy też, czy są typu array i mają odpowiednią długość
      const fromCoords = announcementToEdit.location_from_lng && announcementToEdit.location_from_lat
                         ? [announcementToEdit.location_from_lng, announcementToEdit.location_from_lat]
                         : null;
      const toCoords = announcementToEdit.location_to_lng && announcementToEdit.location_to_lat
                       ? [announcementToEdit.location_to_lng, announcementToEdit.location_to_lat]
                       : null;

      setLocationFrom({
        label: announcementToEdit.location_from_text || '',
        coords: fromCoords,
        lat: announcementToEdit.location_from_lat || null,
        lng: announcementToEdit.location_from_lng || null
      });
      setLocationTo({
        label: announcementToEdit.location_to_text || '',
        coords: toCoords,
        lat: announcementToEdit.location_to_lat || null,
        lng: announcementToEdit.location_to_lng || null
      });
      
      setItemToTransport(announcementToEdit.item_to_transport || '');
      // Upewniamy się, że liczby są konwertowane na stringi dla inputów
      setWeightKg(announcementToEdit.weight_kg !== null ? String(announcementToEdit.weight_kg) : '');
      setBudgetPln(announcementToEdit.budget_pln !== null ? String(announcementToEdit.budget_pln) : '');
      
      // Uwaga: pola kontaktowe są pobierane z profilu użytkownika, nie z ogłoszenia,
      // co jest zazwyczaj bezpieczniejsze, aby użytkownik zawsze edytował aktualne dane kontaktowe.
      // Jeśli jednak chcesz, aby pola kontaktowe z ogłoszenia były nadpisywane, musisz je tu dodać.
      // setContactPhone(announcementToEdit.contact_phone || ''); // To by nadpisało dane z profilu
      // setUsesWhatsapp(announcementToEdit.contact_whatsapp !== null); // Zakładając, że contact_whatsapp to numer telefonu
      // setContactMessenger(announcementToEdit.contact_messenger || '');
      // setConsentPhoneShare(announcementToEdit.contact_phone !== null); // Zakładając, że zgoda oznacza, że telefon jest w ogłoszeniu

      // Resetuj imageFile, jeśli formularz jest otwierany do edycji i nie chcesz, aby był pusty.
      // Opcjonalnie, możesz spróbować ustawić istniejący URL obrazu jako podgląd.
      setImageFile(null); // Upewnij się, że nie ma starego pliku wybranego
    } else {
      // Jeśli nie ma announcementToEdit, upewnij się, że formularz jest pusty (do dodawania)
      // ale nie czyść pól kontaktowych, bo są pobierane z profilu.
      setTitle('');
      setDescription('');
      setLocationFrom({ label: '', coords: null, lat: null, lng: null });
      setLocationTo({ label: '', coords: null, lat: null, lng: null });
      setItemToTransport('');
      setWeightKg('');
      setBudgetPln('');
      setImageFile(null);
      setError(null);
      setSuccessMessage(null);
    }
  }, [announcementToEdit]); // Dependency array: uruchamiamy useEffect gdy zmienia się announcementToEdit


  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Musisz być zalogowany, aby dodać/edytować ogłoszenie.');
      setLoading(false);
      return;
    }

    if (contactPhone.trim() !== '' && !consentPhoneShare) {
        setError('Musisz wyrazić zgodę na udostępnienie numeru telefonu publicznie.');
        setLoading(false);
        return;
    }

    let imageUrl = announcementToEdit?.image_url || null; // Zachowaj istniejący URL obrazu, jeśli edytujesz
    if (imageFile) {
        if (imageFile.size > 5 * 1024 * 1024) {
            setError(`Plik ${imageFile.name} jest za duży (max 5MB).`);
            setLoading(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('userId', user.id);
            formData.append('file', imageFile);

            const response = await fetch('https://serwer2595576.home.pl/upload.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                imageUrl = result.url;
            } else {
                throw new Error(result.error || 'Upload error');
            }
        } catch (uploadErr) {
            console.error('Błąd przesyłania zdjęcia na home.pl:', uploadErr.message);
            setError(`Błąd podczas przesyłania zdjęcia: ${uploadErr.message}`);
            setLoading(false);
            return;
        }
    }

    try {
      const announcementData = {
          user_id: user.id, // Ważne: user_id musi być takie samo jak zalogowanego użytkownika
          title,
          description,
          location_from_text: locationFrom.label || null,
          location_to_text: locationTo.label || null,
          location_from_lat: locationFrom.coords ? locationFrom.coords[1] : null,
          location_from_lng: locationFrom.coords ? locationFrom.coords[0] : null,
          location_to_lat: locationTo.coords ? locationTo.coords[1] : null,
          location_to_lng: locationTo.coords ? locationTo.coords[0] : null,
          location_from_geog: locationFrom.coords ? `POINT(${locationFrom.coords[0]} ${locationFrom.coords[1]})` : null,
          location_to_geog: locationTo.coords ? `POINT(${locationTo.coords[0]} ${locationTo.coords[1]})` : null,
          item_to_transport: itemToTransport || null,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          budget_pln: budgetPln ? parseFloat(budgetPln) : null,
          contact_phone: consentPhoneShare ? contactPhone : null,
          contact_whatsapp: usesWhatsapp && consentPhoneShare ? contactPhone : null,
          contact_messenger: contactMessenger || null,
          image_url: imageUrl || null,
      };

      let operation;
      if (announcementToEdit) {
        // Tryb edycji: aktualizuj istniejące ogłoszenie
        operation = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', announcementToEdit.id)
          .eq('user_id', user.id); // Dodatkowe zabezpieczenie: tylko właściciel może edytować
      } else {
        // Tryb dodawania: wstaw nowe ogłoszenie
        operation = await supabase
          .from('announcements')
          .insert(announcementData);
      }

      if (operation.error) {
        throw operation.error;
      }

      setSuccessMessage(announcementToEdit ? 'Ogłoszenie zostało zaktualizowane pomyślnie!' : 'Ogłoszenie zostało dodane pomyślnie!');
      // Resetuj formularz tylko po dodaniu nowego ogłoszenia, nie po edycji
      if (!announcementToEdit) {
        setTitle('');
        setDescription('');
        setLocationFrom({ label: '', coords: null, lat: null, lng: null });
        setLocationTo({ label: '', coords: null, lat: null, lng: null });
        setItemToTransport('');
        setWeightKg('');
        setBudgetPln('');
        setImageFile(null);
      }

      if (onSuccess) {
        onSuccess(announcementToEdit ? announcementToEdit.id : null); // Przekaż ID, jeśli to edycja
      }

    } catch (err) {
      console.error('Błąd dodawania/edycji ogłoszenia:', err);
      setError('Błąd podczas dodawania/edycji ogłoszenia: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="announcement-form-container">
      {/* ZMIANA: Zmień tytuł formularza w zależności od trybu */}
      <h3>{announcementToEdit ? 'Edytuj Ogłoszenie' : 'Dodaj Nowe Ogłoszenie'}</h3>
      <form onSubmit={handleSubmit} className="announcement-form">
        <div className="form-group">
          <label htmlFor="title">Tytuł ogłoszenia (obowiązkowo):</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Np. Transport Mondeo z Berlina do Warszawy"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Opis (obowiązkowo):</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows="4"
            placeholder="Szczegóły ogłoszenia, np. 'Szukam transportu Forda Mondeo, rocznik 2010, z Berlina (DE) do Warszawy (PL), do zabrania od zaraz. Mój budżet to 1500 PLN.'"
          ></textarea>
        </div>

        <div className="form-group-optional">
          <h4>Opcjonalne szczegóły:</h4>
          <div className="grid-2-cols">
            <div className="form-group">
              <label htmlFor="locationFrom">Skąd:</label>
              <LocationAutocomplete
                value={locationFrom.label}
                onSelectLocation={(label, sug) => setLocationFrom({
                  label,
                  coords: sug.geometry.coordinates,
                  lat: sug.geometry.coordinates ? sug.geometry.coordinates[1] : null,
                  lng: sug.geometry.coordinates ? sug.geometry.coordinates[0] : null
                })}
                placeholder="Np. Berlin, Niemcy"
                className="autocomplete-field"
                searchType="city"
              />
            </div>
            <div className="form-group">
              <label htmlFor="locationTo">Dokąd:</label>
              <LocationAutocomplete
                value={locationTo.label}
                onSelectLocation={(label, sug) => setLocationTo({
                  label,
                  coords: sug.geometry.coordinates,
                  lat: sug.geometry.coordinates ? sug.geometry.coordinates[1] : null,
                  lng: sug.geometry.coordinates ? sug.geometry.coordinates[0] : null
                })}
                placeholder="Np. Warszawa, Polska"
                className="autocomplete-field"
                searchType="city"
              />
            </div>
          </div>

          <div className="grid-2-cols">
            <div className="form-group">
              <label htmlFor="itemToTransport">Co do przewiezienia:</label>
              <input
                type="text"
                id="itemToTransport"
                value={itemToTransport}
                onChange={(e) => setItemToTransport(e.target.value)}
                placeholder="Np. Samochód osobowy, motocykl, meble, 2 osoby"
              />
            </div>
            <div className="form-group">
              <label htmlFor="weightKg">Waga (kg):</label>
              <input
                type="number"
                id="weightKg"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="Np. 1500"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="budgetPln">Budżet (PLN):</label>
            <input
              type="number"
              id="budgetPln"
              value={budgetPln}
              onChange={(e) => setBudgetPln(e.target.value)}
              placeholder="Np. 1500"
            />
          </div>

          <div className="form-group">
            <label htmlFor="image">Dodaj zdjęcie (max 1):</label>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
            />
            {imageFile && <p className="file-info">Wybrano plik: {imageFile.name}</p>}
            {/* Wyświetl istniejące zdjęcie, jeśli edytujesz i nie wybrano nowego */}
            {announcementToEdit?.image_url && !imageFile && (
                <p className="file-info">Obecne zdjęcie: <a href={announcementToEdit.image_url} target="_blank" rel="noopener noreferrer">Podgląd</a></p>
            )}
          </div>
        </div>

        <div className="form-group-contact">
          <h4>Twoje dane kontaktowe (widoczne dla przewoźników):</h4>
          <div className="form-group">
            <label htmlFor="contactPhone">Telefon (obowiązkowo, jeśli podajesz):</label>
            <input
              type="text"
              id="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Np. +48 123 456 789"
              disabled={!consentPhoneShare}
            />
          </div>
          
          <div className="form-group form-group-checkbox">
            <label htmlFor="usesWhatsapp">
              <input
                type="checkbox"
                id="usesWhatsapp"
                checked={usesWhatsapp}
                onChange={(e) => setUsesWhatsapp(e.target.checked)}
              />
              Ten numer ma WhatsApp (jeśli podano telefon)
            </label>
          </div>
          
          <div className="form-group">
            <label htmlFor="contactMessenger">Messenger: (link)</label>
            <input
              type="url"
              id="contactMessenger"
              value={contactMessenger}
              onChange={(e) => setContactMessenger(e.target.value)}
              placeholder="https://m.me/twoj.profil"
            />
            <small className="help-text">
                <a href="/pomoc/messenger-link" target="_blank" rel="noopener noreferrer">
                    ❓ Skąd wziąć link do Messengera?
                </a>
            </small>
          </div>

          <div className="form-group form-group-checkbox consent-checkbox-group">
            <label htmlFor="consentPhoneShare">
              <input
                type="checkbox"
                id="consentPhoneShare"
                checked={consentPhoneShare}
                onChange={(e) => {
                  setConsentPhoneShare(e.target.checked);
                  if (!e.target.checked) {
                    setContactPhone('');
                    setUsesWhatsapp(false);
                  }
                }}
              />
              <span>Zgadzam się na udostępnienie mojego numeru telefonu publicznie.</span>
            </label>
            <small className="help-text">
              Numer telefonu będzie widoczny dla innych użytkowników.
            </small>
          </div>

        </div>

        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}

        <button type="submit" disabled={loading}>
          {loading ? (announcementToEdit ? 'Aktualizowanie...' : 'Dodawanie...') : (announcementToEdit ? 'Zapisz Zmiany' : 'Dodaj Ogłoszenie')}
        </button>
      </form>
    </div>
  );
}