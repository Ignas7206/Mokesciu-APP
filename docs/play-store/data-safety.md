# Google Play Data Safety

Sita faila naudok pildant Play Console skiltyje `Data safety`.

## Ar programele renka ar bendrina naudotojo duomenis?

Rekomenduojamas atsakymas dabar:

No, the app does not collect or share user data.

## Paaiskinimas

Siuo metu programele:

- neturi backend serverio;
- neturi paskyru registracijos;
- neturi reklamu SDK;
- neturi analitikos SDK;
- nesiuncia pajamu irasu i serveri;
- nesiuncia PIN i serveri;
- duomenis saugo lokaliai naudotojo irenginyje;
- leidzia naudotojui paciam eksportuoti JSON atsargine kopija.

## Jei Google klausia apie encryption in transit

Kadangi duomenys nesiunciami i serveri, perdavimo i serveri nera. GitHub Pages puslapis atidaromas per HTTPS.

## Jei Google klausia apie deletion request

Duomenys saugomi naudotojo irenginyje. Naudotojas gali istrinti irasus pacioje programeleje per nustatymus arba istrinti programeles / svetaines duomenis is irenginio.

## Jei ateityje prijungsime debesi

Sita forma reikes atnaujinti. Tada duomenys jau bus renkami / sinchronizuojami, reikes nurodyti paskyros duomenis, finansinius irasus, saugojimo tiksla, sifravima ir trynimo mechanizma.
