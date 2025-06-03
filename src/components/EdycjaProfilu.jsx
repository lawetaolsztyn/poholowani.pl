import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function EdycjaProfilu() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrls, setImageUrls] = useState(['', '', '', ''])

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('users_extended')
        .select('id, phone, city, description, image_urls')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error(error)
      } else {
        setProfile(data)
        setPhone(data.phone || '')
        setCity(data.city || '')
        setDescription(data.description || '')
        setImageUrls(data.image_urls || ['', '', '', ''])
      }

      setLoading(false)
    }

    fetchProfile()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('users_extended')
      .update({
        phone,
        city,
        description,
        image_urls: imageUrls.filter((url) => url.trim() !== '')
      })
      .eq('id', user.id)

    if (error) {
      alert('Błąd zapisu: ' + error.message)
    } else {
      alert('Zapisano profil')
    }

    setLoading(false)
  }

  if (loading) return <div>Ładowanie...</div>

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Edycja profilu przewoźnika</h2>

      <label className="block font-semibold">Telefon:</label>
      <input
        type="text"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="border p-2 rounded w-full mb-4"
      />

      <label className="block font-semibold">Miejscowość:</label>
      <input
        type="text"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="border p-2 rounded w-full mb-4"
      />

      <label className="block font-semibold">Opis firmy:</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border p-2 rounded w-full h-32 mb-4"
      />

      <label className="block font-semibold">Linki do zdjęć (max 4, z hostingu home.pl):</label>
      {imageUrls.map((url, idx) => (
        <input
          key={idx}
          type="text"
          value={url}
          onChange={(e) => {
            const updated = [...imageUrls]
            updated[idx] = e.target.value
            setImageUrls(updated)
          }}
          className="border p-2 rounded w-full mb-2"
        />
      ))}

      <button
        onClick={handleSave}
        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
      >
        Zapisz profil
      </button>
    </div>
  )
}
