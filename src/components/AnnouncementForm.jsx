// src/components/AnnouncementForm.jsx
import React, { useState } from 'react';

import { supabase } from '../supabaseClient'; // Upewnij się, że ścieżka do supabaseClient jest poprawna
import './AnnouncementForm.css';


export default function AnnouncementForm({ onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationFrom, setLocationFrom] = useState('');
  const [locationTo, setLocationTo] = useState('');
  const [itemToTransport, setItemToTransport] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [budgetPln, setBudgetPln] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactMessenger, setContactMessenger] = useState('');
  const [imageFile, setImageFile] = useState(null); // Do przechowywania pliku zdjęcia
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    // Pobranie aktualnie zalogowanego użytkownika
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Musisz być zalogowany, aby dodać ogłoszenie.');
      setLoading(false);
      return;
    }

    let imageUrl = null;
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `announcement_images/${user.id}/${fileName}`; // Ścieżka w Supabase Storage

      const { error: uploadError } = await supabase.storage
        .from('public_files') // Załóżmy, że masz bucket o nazwie 'public_files'
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
          user_id: user.id, // ID zalogowanego użytkownika
          title,
          description,
          location_from_text: locationFrom || null,
          location_to_text: locationTo || null,
          item_to_transport: itemToTransport || null,
          weight_kg: weightKg || null,
          budget_pln: budgetPln || null,
          contact_phone: contactPhone,
          contact_whatsapp: contactWhatsapp || null,
          contact_messenger: contactMessenger || null,
          image_url: imageUrl || null,
        });

      if (insertError) {
        throw insertError;
      }

      setSuccessMessage('Ogłoszenie zostało dodane pomyślnie!');
      // Opcjonalnie: zresetuj formularz po sukcesie
      setTitle('');
      setDescription('');
      setLocationFrom('');
      setLocationTo('');
      setItemToTransport('');
      setWeightKg('');
      setBudgetPln('');
      setContactPhone('');
      setContactWhatsapp('');
      setContactMessenger('');
      setImageFile(null);
      if (onSuccess) {
        onSuccess(); // Wywołaj funkcję zwrotną, jeśli jest przekazana
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
      <h3>Dodaj Nowe Ogłoszenie</h3>
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
              <input
                type="text"
                id="locationFrom"
                value={locationFrom}
                onChange={(e) => setLocationFrom(e.target.value)}
                placeholder="Np. Berlin, Niemcy"
              />
            </div>
            <div className="form-group">
              <label htmlFor="locationTo">Dokąd:</label>
              <input
                type="text"
                id="locationTo"
                value={locationTo}
                onChange={(e) => setLocationTo(e.target.value)}
                placeholder="Np. Warszawa, Polska"
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
            <label htmlFor="contactPhone">Telefon (obowiązkowo):</label>
            <input
              type="text"
              id="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              required
              placeholder="Np. +48 123 456 789"
            />
          </div>
          <div className="form-group">
            <label htmlFor="contactWhatsapp">WhatsApp:</label>
            <input
              type="text"
              id="contactWhatsapp"
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              placeholder="Np. +48 123 456 789"
            />
          </div>
          <div className="form-group">
            <label htmlFor="contactMessenger">Messenger:</label>
            <input
              type="text"
              id="contactMessenger"
              value={contactMessenger}
              onChange={(e) => setContactMessenger(e.target.value)}
              placeholder="Np. link do profilu lub nazwa użytkownika"
            />
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