# GuttaBrew – oppskriftsmal, formatversjon 1

<!-- Disse instruksjonene er Markdown-kommentarer og leses ikke som oppskriftsdata. -->

Denne filen kan sendes til en KI sammen med en lenke til en oppskrift. Be KI-en:

> Konverter oppskriften fra lenken til GuttaBrew-formatet nedenfor. Returner én UTF-8-kodet .md-fil med nøyaktig én JSON-kodeblokk. Følg alle feltnavn, datatyper, enheter og regler i denne malen. Bruk opplysninger fra kilden. Ikke gjett manglende OG, FG, pris, temperatur eller varighet; utelat valgfrie felt eller bruk null. Konverter alle mengder og temperaturer til metriske enheter ved behov, også i fritekst. Skriv bare korte, praktiske bryggeinstruksjoner og relevante ingrediensopplysninger; ikke ta med kommentarer om konvertering, skalering, antakelser eller manglende verdier. Ukjente valgfrie verdier skal utelates eller være null, uten forklarende tekst. Ta med sourceUrl. Oppskriften skal være komplett og lesbar før den importeres.

## Filstruktur – må følges

- Lagre som `.md`, kodet i **UTF-8**. Maksimal filstørrelse: **512 KiB**.
- Fila skal inneholde **nøyaktig én kodeblokk merket `json`**, med ett JSON-objekt.
- Markdown-tekst og `<!-- kommentarer -->` utenfor kodeblokken er tillatt og ignoreres ved import.
- Inni JSON-blokken: ingen kommentarer, prosentkommentarer, `//`, `/* */`, etterfølgende komma eller Markdown. Bruk doble anførselstegn rundt nøkler og tekst.
- Feltnavn er på engelsk og skiller mellom store og små bokstaver. Tekstinnhold kan være norsk.
- Bare feltene som dokumenteres nedenfor er tillatt. Eksempelvis er `durationDays`, `abv`, `status`, `brewerId`, `_id` og `batchNumber` **ikke** oppskriftsfelt.
- Ikke gjenta samme nøkkel i et objekt. Bruk `\n` inni JSON-tekst for linjeskift, og `\"` for anførselstegn i teksten.
- Obligatoriske felt kan aldri være blanke, null eller mangle. Valgfrie tekstfelt kan utelates, være `null` eller `""`. Valgfrie tallfelt: bruk `null` eller utelat feltet når verdien er ukjent. `0` betyr faktisk null, ikke «ukjent».
- Feltene `format` og `version` må ha nøyaktig verdiene i eksemplet. Oppskriften importeres som en **ny oppskrift**, uten å overskrive eksisterende oppskrifter eller brygg.

## Metriske enheter og kort oppskriftstekst

- Bruk **kg eller g** for masse, **L eller mL** for volum og **°C** for temperatur, både i felter og fritekst. Konverter fra lb, oz, gallon, cup og °F ved behov. Skill mellom amerikanske og britiske volumenheter; ikke gjett hvilken variant kilden bruker.
- Tid i `durationMinutes` skal alltid være minutter. Behold fagverdier som OG/FG, IBU, alfasyreprosent og CO₂-volumer i riktig format. Farge oppgis i EBC hvis en tallverdi er kjent; konverter fra SRM eller Lovibond ved behov.
- Ikke konverter et ingrediensvolum til gram uten en pålitelig ingrediensspesifikk tetthet eller vekt fra kilden. Sukker oppgitt i US cup kan konverteres til **mL**, men ikke gjettes om til gram. Hvis en nødvendig enhetsvariant er ukjent, utelat mengden i stedet for å gjette. Antall pakker eller tabletter kan fortsatt oppgis som antall.
- `description`, `notes`, `checklist` og `hopSchedule` skal bare inneholde det bryggeren trenger under bryggingen: handlinger, tilsetningstidspunkt og relevante ingrediensegenskaper. Eksempel: «Tilsett ved kokestart.» eller «5 % alfasyre.»
- **Ikke skriv forklaringer om hvordan fila ble laget:** ingen regnestykker som «× 50/19», kommentarer som «lineært skalert», «kildens avrundede metriske mengder», «utbytte og tap må tilpasses anlegget», «mengde ikke oppgitt» eller «vekt og CO₂-mål er ikke oppgitt». Utelat ukjente felt uten å omtale dem i teksten. Behold konkrete instruksjoner fra kilden, som «Kontroller stabil FG før flasking.»
- Returner kun oppskriftsfila med én JSON-kodeblokk. Ikke kopier malens instruksjoner, sjekkliste eller eksempler inn i svaret, og ikke legg til innledning, konverteringsrapport, forbehold eller avsluttende kommentarer.

## Toppnivå

| Felt | Krav | Type / regel |
| --- | --- | --- |
| `format` | Obligatorisk | Tekst, nøyaktig `"guttabrew-recipe"` |
| `version` | Obligatorisk | Tall, nøyaktig `1` |
| `recipe` | Obligatorisk | Objekt med feltene nedenfor |

## `recipe`

| Felt | Krav | Type / regel |
| --- | --- | --- |
| `name` | Obligatorisk | Tekst, 2–160 tegn |
| `steps` | Obligatorisk | Liste med 1–100 steg i riktig utførelsesrekkefølge |
| `ingredients` | Obligatorisk | Liste med 1–200 ingredienser |
| `beerType` | Valgfritt | Tekst, maks. 120 tegn, eksempel `"Pale Ale"` |
| `flavorProfile` | Valgfritt | Tekst, maks. 1200 tegn |
| `color` | Valgfritt | Tekst, maks. 120 tegn, eksempel `"Gylden, ca. 12 EBC"` |
| `sourceUrl` | Valgfritt | Full `https://`- eller `http://`-lenke til kilden, maks. 2000 tegn |
| `defaults` | Valgfritt | Objekt med kjente målverdier, eventuelt `{}` eller `null` |

### `recipe.defaults`

Alle felt her er valgfrie. OG/FG er **tekst** i nøyaktig format `"1.056"` (tre desimaler). Bruk punktum, aldri desimalkomma. Når målet er én verdi, sett både From og To til samme verdi. From kan ikke være større enn To.

| Felt | Type / enhet |
| --- | --- |
| `ogFrom`, `ogTo` | OG som tekst, eksempel `"1.056"` |
| `fgFrom`, `fgTo` | FG som tekst, eksempel `"1.012"` |
| `batchSizeLiters` | Tall, ferdig batchvolum i liter, minst 0 |
| `ibu` | Tall, minst 0 |
| `co2Volumes` | Tall, CO₂-volumer, minst 0 |

Andre tall enn temperatur og rekkefølge må være mellom 0 og 1 000 000, med særgrensen for durationMinutes nedenfor. ABV beregnes av nettsiden ut fra OG/FG; ikke legg til et ABV-felt.

## Hvert objekt i `recipe.steps`

| Felt | Krav | Type / regel |
| --- | --- | --- |
| `stepId` | Obligatorisk | Unik tekst-ID, 1–80 tegn. Bruk enkle ID-er uten mellomrom, som `"innmesk"` |
| `stepType` | Obligatorisk | En av stegtypene i tabellen nedenfor |
| `title` | Obligatorisk | Tekst, 1–120 tegn, eksempel `"Hovedmesk"` |
| `order` | Valgfritt | Heltall som må stemme med plasseringen: 1, 2, 3 osv. Nettsiden setter dette automatisk hvis utelatt |
| `description` | Valgfritt | Instruksjon som tekst, maks. 3000 tegn |
| `durationMinutes` | Valgfritt | Tall, **alltid minutter**, fra 0 til 525 600. Eksempel: 14 dager = `20160`; 90 minutter = `90` |
| `temperatureC` | Valgfritt | Tall i °C, fra −50 til 150 |
| `co2Volumes` | Valgfritt | Tall, CO₂-volumer, minst 0 |
| `phase` | Valgfritt | Fasekobling; samme tillatte verdier som `stepType`. Utelat normalt: fase følger stegtype automatisk |
| `data` | Valgfritt | Objekt med stegtypespesifikke felt fra tabellen nedenfor; bruk `{}` når ingen er kjent |

### Tillatte stegtyper og `data`

Alle `data`-feltene er valgfrie. Tekstfelt har maks. 3000 tegn. Ingen andre `data`-felter er tillatt; legg øvrige detaljer i `description`.

| `stepType` | Betydning / automatisk fase | Tillatte felt i `data` |
| --- | --- | --- |
| `preparation` | Forberedelser | `checklist`: tekst |
| `mash` | Mesking | `waterAmountL`: tall i liter, minst 0; `waterToGrainRatio`: tekst, f.eks. `"3 L/kg"` |
| `sparge` | Skylling | `waterAmountL`: tall i liter, minst 0 |
| `boil` | Kok | `hopSchedule`: tekst med humletilsetninger og tidspunkt |
| `primary_fermentation` | Gjæring | `targetGravity`: tekst som `"1.012"` |
| `secondary_fermentation` | Sekundær gjæring | Ingen; bruk `{}` eller utelat |
| `cold_crash` | Cold crash | Ingen; bruk `{}` eller utelat |
| `carbonation` | Karbonering | `method`: tekst |
| `conditioning` | Modning | Ingen; bruk `{}` eller utelat |
| `custom` | Eget steg | Ingen; beskriv innholdet i `description`. `phase` kan koble det til en kjent fase |

Del mesking opp i separate steg ved ulike temperaturer og varigheter. Sammenhengende steg med `stepType: "mash"` får én samlet mesketidslinje. `planned` og `completed` er bryggstatus, **ikke** stegtyper eller `phase`-verdier.

## Hvert objekt i `recipe.ingredients`

| Felt | Krav | Type / regel |
| --- | --- | --- |
| `ingredientId` | Obligatorisk | Unik tekst-ID i ingredienslista, 1–80 tegn |
| `name` | Obligatorisk | Tekst, 1–160 tegn |
| `category` | Obligatorisk | `"fermentable"` (malt/sukker), `"hops"`, `"yeast"` eller `"other"` |
| `amount` | Valgfritt | **Tekst**, maks. 80 tegn, eksempel `"4.5"`. Ikke legg enhet i dette feltet når `unit` brukes |
| `unit` | Valgfritt | Tekst, maks. 40 tegn, eksempel `"kg"`, `"g"`, `"L"` eller `"pakke"` |
| `price` | Valgfritt | Tall i NOK for hele denne ingrediensmengden, ikke enhetspris. Minst 0. Utelat hvis ukjent |
| `notes` | Valgfritt | Tekst, maks. 1000 tegn |
| `stepIds` | Valgfritt | Liste med tekst-ID-er fra `steps[].stepId`, maks. 100. `[]`, `null` eller utelatt betyr ingen stegkobling |

Ingredienser skal knyttes til eksisterende steg-ID-er. Det kan være flere ingredienser per steg og flere steg per ingrediens. Ved humle på forskjellige tidspunkt: bruk separate ingrediensoppføringer med unike ingredientId-er, og beskriv tidspunktet i notes eller stegets hopSchedule. Ikke skriv ingrediensnavn eller stegnummer i `stepIds`.

## Gyldig eksempel – erstatt med oppskriften fra kilden

Eksemplet nedenfor er komplett nok til å teste import, men ikke en ferdig optimalisert bryggeoppskrift. Bytt navn, mengder, instruksjoner og verdier med kildeoppskriften. Ikke la eksempeldata bli stående ved en feil. Når KI-en returnerer fila, skal den kun ha én JSON-blokk totalt.

```json
{
  "format": "guttabrew-recipe",
  "version": 1,
  "recipe": {
    "name": "Eksempel – Pale Ale",
    "beerType": "Pale Ale",
    "sourceUrl": "https://example.com/oppskrift",
    "flavorProfile": "Frisk humlearoma og lett maltpreg.",
    "color": "Gylden",
    "defaults": {
      "ogFrom": "1.050",
      "ogTo": "1.050",
      "fgFrom": "1.010",
      "fgTo": "1.010",
      "batchSizeLiters": 20,
      "ibu": 30,
      "co2Volumes": 2.4
    },
    "steps": [
      { "stepId": "forberedelser", "stepType": "preparation", "title": "Forbered utstyr", "description": "Rengjør og klargjør utstyret.", "data": { "checklist": "Vask utstyr\nVei opp malt og humle" } },
      { "stepId": "hovedmesk", "stepType": "mash", "title": "Hovedmesk", "durationMinutes": 60, "temperatureC": 67, "data": { "waterAmountL": 15, "waterToGrainRatio": "3 L/kg" } },
      { "stepId": "skylling", "stepType": "sparge", "title": "Skyll malten", "durationMinutes": 20, "temperatureC": 76, "data": { "waterAmountL": 12 } },
      { "stepId": "kok", "stepType": "boil", "title": "Kok vørteren", "durationMinutes": 60, "temperatureC": 100, "data": { "hopSchedule": "Tilsett 30 g Cascade ved kokestart. Tilsett 20 g når det gjenstår 10 minutter." } },
      { "stepId": "gjaering", "stepType": "primary_fermentation", "title": "Gjæring", "durationMinutes": 20160, "temperatureC": 20, "description": "Tilsett gjær i avkjølt vørter. Kontroller stabil FG før videre behandling.", "data": { "targetGravity": "1.010" } },
      { "stepId": "modning", "stepType": "conditioning", "title": "Modning", "durationMinutes": 20160, "temperatureC": 12 }
    ],
    "ingredients": [
      { "ingredientId": "malt", "name": "Pale malt", "category": "fermentable", "amount": "5", "unit": "kg", "stepIds": ["hovedmesk"] },
      { "ingredientId": "bitterhumle", "name": "Cascade", "category": "hops", "amount": "30", "unit": "g", "notes": "Tilsettes ved kokestart.", "stepIds": ["kok"] },
      { "ingredientId": "aromahumle", "name": "Cascade", "category": "hops", "amount": "20", "unit": "g", "notes": "Tilsettes når det gjenstår 10 minutter av kok.", "stepIds": ["kok"] },
      { "ingredientId": "gjaer", "name": "US-05", "category": "yeast", "amount": "1", "unit": "pakke", "stepIds": ["gjaering"] }
    ]
  }
}
```

## Sjekkliste til KI før levering

1. Én JSON-blokk; gyldig JSON uten kommentarer inni.
2. Riktig format og version. Obligatoriske felt finnes og er ikke blanke.
3. Unike stepId-er og ingredientId-er. Alle stepIds peker til eksisterende stepId-er.
4. Stegene står i rekkefølge. Hvis order er med, er verdiene 1, 2, 3 osv.
5. Alle enheter er metriske, også i fritekst: kg/g, L/mL og °C; tid i durationMinutes er minutter. Ingen lb, oz, gallon, cup eller °F står igjen. Numeriske verdier har desimalpunktum.
6. OG/FG er tekst med tre desimaler. From ≤ To.
7. Ukjente valgfrie verdier er utelatt eller null. Ingen oppdiktede målinger eller priser.
8. Bare dokumenterte felt, stegtyper, faser og kategorier. Metadata fra en annen app er fjernet.

9. Fritekst er kort og praktisk. Ingen kommentarer om konvertering, skalering, antakelser eller manglende verdier; ingen ekstra tekst utenfor oppskriftsblokken.
