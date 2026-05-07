# Closed Testing Plan

Naujam personal Google Play developer account'ui reikia uzdaro testavimo pries production.

Pagal Google Play Help, nauji personal developer account'ai turi paleisti closed test su bent 12 testeriu, kurie yra opt-in bent 14 dienu is eiles, tada galima prasyti production access.

Oficialus saltiniai:

- https://support.google.com/googleplay/android-developer/answer/14151465
- https://support.google.com/googleplay/android-developer/answer/9845334

## Minimalus planas

1. Sukurti app'a Play Console.
2. Paruosti Android App Bundle.
3. Ikelti i Internal testing pirmai savo patikrai.
4. Patikrinti telefone:
   - paleidimas;
   - iraso pridejimas;
   - suvestines;
   - backup eksportas;
   - backup importas;
   - PIN ijungimas;
   - PIN atrakinimas;
   - offline veikimas.
5. Sukurti Closed testing track.
6. Prideti bent 12 testeriu Gmail adresu.
7. Issiusti opt-in nuoroda testeriams.
8. Paprasyti testeriu:
   - isidiegti app'a;
   - prideti bent viena testini irasa;
   - ijungti PIN;
   - uzdaryti ir vel atidaryti app'a;
   - parasyti viena sakini atsiliepimo.
9. Palaukti 14 dienu, kad 12 testeriu liktu opt-in be pertraukos.
10. Play Console pateikti production access request.

## Zinute testeriams

Sveiki, testuoju nauja Android programele "Mokesciu atsidejimas".

Reikia:

1. Atidaryti testavimo nuoroda.
2. Prisijungti su Google paskyra.
3. Isidiegti programele.
4. Ivesti testine suma, pvz. 100.
5. Paziureti suvestine.
6. Nustatymuose pabandyti PIN.
7. Likti testavimo grupeje bent 14 dienu.

Jei kazkas stringa, parasykit telefono modeli ir kas ivyko.
