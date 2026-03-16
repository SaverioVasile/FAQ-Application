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

| Scenario | `EXPO_PUBLIC_API_BASE_URL` |
|---|---|
| Simulatore iOS/Android | `http://localhost:8080` |
| Dispositivo fisico (stessa rete Wi-Fi) | `http://<IP_DEL_TUO_PC>:8080` |
| Produzione AWS | `https://your-backend.example.com` |

Per trovare il tuo IP locale su macOS: `ipconfig getifaddr en0`

## Funzionalità

- **Tab "Questionario"**: compilazione completa del test FAQ con validazione in tempo reale, selezione del compilatore e invio con feedback
- **Tab "Storico"**: lista delle ultime sottomissioni con pull-to-refresh, ricaricata automaticamente ad ogni apertura della tab

