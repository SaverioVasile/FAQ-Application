# FAQ Mobile – Expo (React Native)

App mobile per la somministrazione del questionario FAQ (Functional Activities Questionnaire), sviluppata con **Expo** e **React Native**. Utilizza lo stesso backend del progetto principale.

## Struttura

```
mobile/
├── App.js                        # Entry point, navigazione a tab
├── app.json                      # Configurazione Expo
├── babel.config.js
├── package.json
└── src/
    ├── config.js                 # URL del backend
    ├── constants/
    │   └── questions.js          # Domande e legenda punteggio
    ├── services/
    │   └── api.js                # Chiamate HTTP al backend
    └── screens/
        ├── QuestionnaireScreen.js  # Form FAQ
        └── SubmissionsScreen.js    # Storico sottomissioni
```

## Prerequisiti

- [Node.js](https://nodejs.org/) >= 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- App **Expo Go** sul dispositivo mobile (iOS o Android)

## Avvio

```bash
cd mobile
npm install
cp .env.example .env
# Modifica .env se usi un dispositivo fisico (vedi sotto)
npm start
```

Expo aprirà un QR code nel terminale o nel browser. Scansionalo con l'app **Expo Go** sul telefono.

## Configurazione URL backend

| Variabile | Descrizione |
|---|---|
| `EXPO_PUBLIC_API_TARGET` | `local` oppure `public` |
| `EXPO_PUBLIC_API_BASE_URL_LOCAL` | URL backend locale |
| `EXPO_PUBLIC_API_BASE_URL_PUBLIC` | URL backend pubblico |
| `EXPO_PUBLIC_API_BASE_URL` | Override diretto (opzionale, ha priorita') |

Esempio rapido in `.env`:

```dotenv
EXPO_PUBLIC_API_TARGET=local
EXPO_PUBLIC_API_BASE_URL_LOCAL=http://192.168.1.20:8080
EXPO_PUBLIC_API_BASE_URL_PUBLIC=https://your-backend.example.com
```

Per puntare all'istanza pubblica basta cambiare:

```dotenv
EXPO_PUBLIC_API_TARGET=public
```

Per trovare il tuo IP locale su macOS: `ipconfig getifaddr en0`

## Funzionalità

- **Tab "Questionario"**: compilazione completa del test FAQ con validazione in tempo reale, selezione del compilatore e invio con feedback
- **Tab "Storico"**: lista delle ultime sottomissioni con pull-to-refresh, ricaricata automaticamente ad ogni apertura della tab

