# Mokesčių atsidėjimo programėlė

Mobilus PWA, skirtas greitai įvesti gautas individualios veiklos pajamas ir matyti, kiek preliminariai atsidėti mokesčiams.

## Skaičiavimas

Naudojama fiksuota formulė:

- Iš pajamų atimama 30% išlaidų.
- GPM: 5% nuo likusios sumos.
- PSD: 6,98% nuo 90% likusios sumos.
- VSD: 15,52% nuo 90% likusios sumos.

Neįtraukta: PVM, minimalus mėnesinis PSD, lubos, kitos metinės pajamos ir individualios išimtys.

## Duomenų saugumas

Įrašai saugomi naršyklės `localStorage`, todėl jie lieka tame pačiame įrenginyje ir nėra siunčiami į serverį. Ištrynus Chrome, išvalius svetainės duomenis arba naršyklės profilį, įrašai gali dingti.

Nustatymuose yra pilnos atsarginės kopijos eksportas ir importas. Kartą per mėnesį arba po didesnių pajamų įrašų verta atsisiųsti JSON kopiją ir laikyti ją telefono failuose arba debesyje.

PIN užraktas saugo nuo atsitiktinio programėlės atidarymo tame pačiame telefone. PIN nėra pilnas duomenų šifravimas, todėl atsarginę kopiją vis tiek reikia laikyti atsakingai.

## Planuojama

Kitas didesnis skaičiavimo pakeitimas: leisti rinktis tarp 30% išlaidų modelio ir realių išlaidų suvedimo. Vėliau bus pridėtas PVM mokėtojo režimas, kai bus patikslinta skaičiavimo logika. Taip pat planuojamas pensijų kaupimo pasirinkimas, nes kaupiant pensijai keičiasi vienas iš tarifų.
