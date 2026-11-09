import { useLocation, useNavigate } from "react-router-dom";

// O'quv sahifalari bir deck, "all" (hamma decklar) yoki bir nechta deck bilan ishlaydi.
// Bir nechta deck: id lar vergul bilan, masalan /flashcards/study/<id1>,<id2>/learn
// ("Study manual" orqali qo'lda tanlangan to'plam)
const SEP = ",";

export const isMix = (deckId) => deckId.includes(SEP);
export const deckIdsOf = (deckId) => deckId.split(SEP);
export const studyPath = (ids, mode) => `/flashcards/study/${ids.join(SEP)}/${mode}`;

// Supabase so'roviga deck sharti
export function whereDeck(q, deckId) {
  if (deckId === "all") return q;
  return isMix(deckId) ? q.in("deck_id", deckIdsOf(deckId)) : q.eq("deck_id", deckId);
}

// O'quv sahifasidan qaytish: deck sahifasiga, hamma decklarda — Flashcards, to'plamda — Home
export function studyBack(deckId) {
  if (deckId === "all") return { to: "/flashcards", label: "nav.flashcards" };
  if (isMix(deckId)) return { to: "/home", label: "study.backHome" };
  return { to: `/flashcards/deck/${deckId}`, label: "study.backToDeck" };
}

// "Boshqa usulni tanlash": usullar ro'yxatiga qaytish.
// Translation ichidagi usuldan — Translation sahifasiga; Study manual'dan kelingan bo'lsa —
// o'sha oyna usullar bosqichida qayta ochiladi; aks holda deck sahifasidagi usullarga
export function useModeBack(deckId) {
  const navigate = useNavigate();
  const location = useLocation();
  const manual = location.state?.manual;
  const inUzbek =
    new URLSearchParams(location.search).get("m") === "uz" &&
    !location.pathname.endsWith("/uzbek");
  return () => {
    if (inUzbek)
      navigate(`/flashcards/study/${deckId}/uzbek`, { state: location.state });
    else if (manual) navigate(manual.from, { state: { reopenManual: manual.picked } });
    else navigate(studyBack(deckId).to);
  };
}
