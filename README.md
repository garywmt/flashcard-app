# Species Flashcard Study App

A simple Vite + React app for building and studying image-based flashcards.

## Features

- Multiple photos per species card
- Zoomable images
- Study mode with flip cards
- Quiz mode with multiple choice questions
- Local browser storage for your deck
- Import/export of decks as JSON

## Local development

```bash
npm install
npm run dev
```

## Deploy on Vercel

1. Create a GitHub repository and upload this project.
2. Import the repository into Vercel.
3. Deploy.
4. In Vercel, add your custom domain such as `flashcards.ebigsky.com`.
5. In GoDaddy DNS, add the CNAME record Vercel tells you to use.

## Notes

- The starter deck uses example remote images.
- Your own uploaded photo files are stored in browser local storage, so they stay on the device/browser where you created them.
- For a larger permanent shared deck, later you may want cloud storage and a database.
