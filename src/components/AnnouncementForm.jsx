// src/components/AnnouncementForm.jsx (CAŁY PLIK)

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './AnnouncementForm.css';
import LocationAutocomplete from './LocationAutocomplete';

export default function AnnouncementForm({ onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationFrom, setLocationFrom] = useState({ label: '', coords: null, lat: null, lng: null });
  const [locationTo, setLocationTo] = useState({ label: '', coords: null, lat: null, lng: null });
  const [itemToTransport, setItemToTransport] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [budgetPln, setBudgetPln] = useState('');
  const [contactPhone, setContactPhone] = useState(''); // Ten stan będzie pobierał z profile.universal_contact_phone
  const [usesWhatsapp, setUsesWhatsapp] = useState(false);
  const [contactMessenger, setContactMessenger] = useState('');
  const [consentPhoneShare, setConsentPhoneShare] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // NOWY useEffect do pobierania danych profilu użytkownika i autopodstawiania
  useEffect(() => {
    const fetchUserProfileData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('users_extended')
          .select('universal_contact_phone, profile_uses_whatsapp, profile_messenger_link, profile_consent_phone_share') // ZMIANA: Pobieramy nową kolumnę
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Błąd pobierania danych profilu dla formularza ogłoszenia:', error.message);
        } else if (profile) {
          // Autopodstawianie danych z profilu do stanów formularza
          setContactPhone(profile.universal_contact_phone || ''); // ZMIANA: Używamy nowej kolumny
          setUsesWhatsapp(profile.profile_uses_whatsapp || false);
          setContactMessenger(profile.profile_messenger_link || '');
          setConsentPhoneShare(profile.profile_consent_phone_share || false);
        }
      }
    };

    fetchUserProfileData();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Musisz być zalogowany, aby dodać ogłoszenie.');
      setLoading(false);
      return;
    }

    if (contactPhone.trim() !== '' && !consentPhoneShare) {
        setError('Musisz wyrazić zgodę na udostępnienie numeru telefonu publicznie.');
        setLoading(false);
        return;
    }

    let imageUrl = null;
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
      const { data, error: insertError } = await supabase
        .from('announcements')
        .insert({
          user_id: user.id,
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
        });

      if (insertError) {
        throw insertError;
      }

      setSuccessMessage('Ogłoszenie zostało dodane pomyślnie!');
      setTitle('');
      setDescription('');
      setLocationFrom({ label: '', coords: null, lat: null, lng: null });
      setLocationTo({ label: '', coords: null, lat: null, lng: null });
      setItemToTransport('');
      setWeightKg('');
      setBudgetPln('');
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
          </div>
        </div>

        <div className="form-group-contact">
          <h4>Twoje dane kontaktowe (widoczne dla przewoźników):</h4>
          <div className="form-group">
            <label htmlFor="contactPhone">Telefon (obowiązkowo, jeśli podajesz):</label>
            <input
              type="text"
              id="contactPhone"
              value={contactPhone} // Ten input ma teraz wartość ze stanu contactPhone, inicjalizowanego z profilu
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Np. +48 123 456 789"
              disabled={!consentPhoneShare} // Wyłącz, jeśli brak zgody na udostępnianie telefonu
            />
          </div>
          
          <div className="form-group form-group-checkbox">
            <label htmlFor="usesWhatsapp">
              <input
                type="checkbox"
                id="usesWhatsapp"
                checked={usesWhatsapp} // Stan z profilu
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
              value={contactMessenger} // Stan z profilu
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
                checked={consentPhoneShare} // Stan z profilu
                onChange={(e) => {
                  setConsentPhoneShare(e.target.checked);
                  if (!e.target.checked) {
                    setContactPhone(''); // Wyczyść telefon, jeśli zgoda jest cofnięta
                    setUsesWhatsapp(false); // Wyłącz WhatsApp, jeśli zgoda na telefon jest cofnięta
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