# Mind Pro — so'z yodlash ilovasi

Quizlet (O'rganish, Juftlash) + Anki (oraliqli takrorlash) birlashmasi.
React 18 + Vite 6 + Tailwind CSS 4. Ma'lumotlar brauzerning localStorage'ida saqlanadi.

## Ishga tushirish
    npm install
    npm run dev        # http://localhost:5173
    npm run build      # dist/ papkasi tayyor sayt

## Papka tuzilmasi
    src/
      lib/srs.js        Anki'ga o'xshash takrorlash algoritmi (SM-2)
      lib/utils.js      shuffle, speak (TTS), import parser
      store.jsx         holat (useReducer) + localStorage
      views/            Home, Deck, Study, Learn, Match
      components/ui.jsx umumiy tugma/maydonlar

## Klaviatura
    Takrorlash: Space = aylantirish, 1-4 = baholash
    O'rganish (test): 1-4 = variant tanlash
