# Mokesciu atsidejimo programele

Mobilus PWA ir busimas Android app'as, skirtas greitai ivesti gautas individualios veiklos pajamas ir matyti, kiek preliminariai atsideti mokesciams.

## Ka dabar daro

- Saugo pajamu irasus telefone.
- Rodo metine suvestine, menesiu vaizda ir kiekvieno iraso mokesciu suma.
- Skaido preliminarius mokescius i GPM, PSD ir VSD.
- Veikia offline per service worker cache.
- Leidzia eksportuoti CSV ir JSON atsargine kopija.
- Leidzia atkurti duomenis is JSON kopijos.
- Turi PIN rezima: ijungus PIN, irasai telefone saugomi sifruotai.
- Turi privatumo politikos puslapi ir Google Play paruostukus.
- Paruostas Capacitor kelias Android `.aab` generavimui.

## Skaiciavimas

Naudojama laikina fiksuota formule:

- Is pajamu atimama 30% islaidu.
- GPM: 5% nuo likusios sumos.
- PSD: 6,98% nuo 90% likusios sumos.
- VSD: 15,52% nuo 90% likusios sumos.

Neitraukta: PVM, minimalus menesinis PSD, lubos, kitos metines pajamos, realiu islaidu rezimas, pensijos kaupimo pasirinkimas ir individualios isimtys.

## Duomenu saugumas

Kol neprijungtas debesis, irasai nesiunciami i serveri. Jie saugomi tame paciame irenginyje.

Be PIN duomenys saugomi narsykles / programeles vietineje saugykloje. Ijungus PIN, irasai saugomi sifruotame `localStorage` bloke naudojant Web Crypto AES-GCM ir rakta, isvestini is PIN.

Svarbu: jei pamirstamas PIN, sifruotu irasu atkurti nepavyks. Del to atsargine JSON kopija vis dar reikalinga.

## Android kelias

Projektas ruosiamas per Capacitor. Kai kompiuteryje bus `npm` ir Android Studio:

```powershell
npm install
npm run cap:add:android
npm run cap:open
```

Google Play reikia signed `.aab`, o ne paprasto `.apk`.

## Planuojama

Kitas didesnis skaiciavimo pakeitimas: leisti rinktis tarp 30% islaidu modelio ir realiu islaidu suvedimo. Veliau bus pridetas PVM moketojo rezimas ir pensijos kaupimo pasirinkimas, kai patikslinsime tikslias taisykles.
