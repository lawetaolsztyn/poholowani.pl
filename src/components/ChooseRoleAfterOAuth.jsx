useEffect(() => {
  const ensureUserProfile = async () => {
    if (!user) return;

    let profileCreated = false;

    for (let attempt = 0; attempt < 10; attempt++) {
      const { data: existing, error } = await supabase
        .from('users_extended')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (existing) {
        if (existing.role?.toLowerCase() !== 'nieprzypisana') {
          console.log('✅ ChooseRoleAfterOAuth: Rola użytkownika już ustawiona na:', existing.role, '. Przekierowuję do profilu.');
          navigate('/profil');
          return;
        }
        return; // Rola to "nieprzypisana", zostajemy na stronie
      }

      if (error?.code === 'PGRST116' || !existing) {
        console.warn(`⏳ Czekam na utworzenie profilu przez trigger (próba ${attempt + 1}/10)`);

        if (attempt === 4 && !profileCreated) {
          // Tworzymy ręcznie rekord po 5 próbach (czyli po 2,5 sekundy)
          console.warn('⚠️ Trigger nie utworzył profilu – tworzymy ręcznie.');
          const { error: insertError } = await supabase
            .from('users_extended')
            .insert([{ id: user.id, email: user.email, role: 'nieprzypisana' }]);

          if (insertError) {
            console.error('❌ Błąd ręcznego tworzenia profilu:', insertError.message);
          } else {
            profileCreated = true;
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.error('❌ ChooseRoleAfterOAuth: Profil nadal nie istnieje.');
  };

  ensureUserProfile();
}, [user, navigate]);
