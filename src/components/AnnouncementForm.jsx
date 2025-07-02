// src/components/AnnouncementForm.jsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './AnnouncementForm.css';
import LocationAutocomplete from './LocationAutocomplete'; // <-- IMPORTUJEMY LocationAutocomplete

export default function AnnouncementForm({ onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Zmieniamy stany na obiekty z label i coords dla LocationAutocomplete
  const [locationFrom, setLocationFrom] = useState({ label: '', coords: null });
  const [locationTo, setLocationTo] = useState({ label: '', coords: null });
  const [itemToTransport, setItemToTransport] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [budgetPln, setBudgetPln] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  // NOWE STANY DLA WHATSAPP I MESSENGERA (zgodnie z AddRouteForm)
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [usesWhatsapp, setUsesWhatsapp] = useState(false); // Checkbox WhatsApp
  const [contactMessenger, setContactMessenger] = useState('');
  // Nowy stan zgody na udostępnianie telefonu
  const [consentPhoneShare, setConsentPhoneShare] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Musisz być zalogowany, aby dodać ogłoszenie.'); // To już jest obsługiwane wcześniej w AnnouncementsPage
      setLoading(false);
      return;
    }

    // Walidacja dla numeru telefonu i zgody
    if (contactPhone.trim() !== '' && !consentPhoneShare) {
        setError('Musisz wyrazić zgodę na udostępnienie numeru telefonu publicznie.');
        setLoading(false);
        return;
    }

    let imageUrl = null;
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `announcement_images/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public_files')
        .upload(filePath, imageFile, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        setError('Błąd podczas przesyłania zdjęcia: ' + uploadError.message);
        setLoading(false);
        return;
      }
      imageUrl = supabase.storage.from('public_files').getPublicUrl(filePath).data.publicUrl;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('announcements')
        .insert({
          user_id: user.id,
          title,
          description,
          // Używamy label z LocationAutocomplete, a coords możemy zapisać osobno, jeśli potrzebne
          location_from_text: locationFrom.label || null,
          location_to_text: locationTo.label || null,
          // Dodatkowo, jeśli chcesz zapisać współrzędne:
          // location_from_lat: locationFrom.coords ? locationFrom.coords[1] : null,
          // location_from_lng: locationFrom.coords ? locationFrom.coords[0] : null,
          // location_to_lat: locationTo.coords ? locationTo.coords[1] : null,
          // location_to_lng: locationTo.coords ? locationTo.coords[0] : null,

          item_to_transport: itemToTransport || null,
          weight_kg: weightKg ? parseFloat(weightKg) : null, // Upewnij się, że to liczba
          budget_pln: budgetPln ? parseFloat(budgetPln) : null, // Upewnij się, że to liczba
          contact_phone: consentPhoneShare ? contactPhone : null, // Zapisujemy tylko jeśli zgoda jest
          contact_whatsapp: usesWhatsapp ? contactWhatsapp : null, // Zapisujemy tylko jeśli usesWhatsapp jest true
          contact_messenger: contactMessenger || null,
          image_url: imageUrl || null,
        });

      if (insertError) {
        throw insertError;
      }

      setSuccessMessage('Ogłoszenie zostało dodane pomyślnie!');
      // Resetowanie formularza po sukcesie
      setTitle('');
      setDescription('');
      setLocationFrom({ label: '', coords: null });
      setLocationTo({ label: '', coords: null });
      setItemToTransport('');
      setWeightKg('');
      setBudgetPln('');
      setContactPhone('');
      setContactWhatsapp('');
      setUsesWhatsapp(false);
      setContactMessenger('');
      setConsentPhoneShare(false); // Resetuj zgodę
      setImageFile(null);
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error('Błąd dodawania ogłoszenia:', err);
      setError('Błąd podczas dodawania ogłoszenia: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="announcement-form-container">
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
              <LocationAutocomplete // Używamy LocationAutocomplete
                value={locationFrom.label}
                onSelectLocation={(label, sug) => setLocationFrom({ label, coords: sug.geometry.coordinates })}
                placeholder="Np. Berlin, Niemcy"
                className="autocomplete-field"
                searchType="city" // Szukamy miast
              />
            </div>
            <div className="form-group">
              <label htmlFor="locationTo">Dokąd:</label>
              <LocationAutocomplete // Używamy LocationAutocomplete
                value={locationTo.label}
                onSelectLocation={(label, sug) => setLocationTo({ label, coords: sug.geometry.coordinates })}
                placeholder="Np. Warszawa, Polska"
                className="autocomplete-field"
                searchType="city" // Szukamy miast
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
              // phoneInput jest opcjonalne, więc nie required tutaj
              disabled={!consentPhoneShare} // Wyłączamy, jeśli nie ma zgody
            />
          </div>
          
          {/* KONTAKT WHATSAPP - CHECKBOX I POLE */}
          <div className="form-group form-group-checkbox">
            <label htmlFor="usesWhatsapp">
              <input
                type="checkbox"
                id="usesWhatsapp"
                checked={usesWhatsapp}
                onChange={(e) => setUsesWhatsapp(e.target.checked)}
              />
              Kontakt WhatsApp
            </label>
          </div>
          {usesWhatsapp && ( // Pokaż pole tylko, jeśli checkbox zaznaczony
            <div className="form-group">
              <label htmlFor="contactWhatsapp">Numer WhatsApp (taki jak telefon lub inny):</label>
              <input
                type="text"
                id="contactWhatsapp"
                value={contactWhatsapp}
                onChange={(e) => setContactWhatsapp(e.target.value)}
                placeholder="Np. +48 123 456 789"
              />
            </div>
          )}

          {/* KONTAKT MESSENGER - POLE I LINK PODPOWIEDZI */}
          <div className="form-group">
            <label htmlFor="contactMessenger">Messenger: (link)</label>
            <input
              type="url" // typ url dla linku
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

          {/* ZGODA NA UDOSTĘPNIENIE NUMERU TELEFONU */}
          <div className="form-group form-group-checkbox consent-checkbox-group">
            <label htmlFor="consentPhoneShare">
              <input
                type="checkbox"
                id="consentPhoneShare"
                checked={consentPhoneShare}
                onChange={(e) => {
                  setConsentPhoneShare(e.target.checked);
                  // Jeśli odznaczono zgodę, wyczyść numer telefonu
                  if (!e.target.checked) {
                    setContactPhone('');
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
          {loading ? 'Dodawanie...' : 'Dodaj Ogłoszenie'}
        </button>
      </form>
    </div>
  );
}