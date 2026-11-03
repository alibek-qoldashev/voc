// O'quv rejimlari: deck sahifasidagi tugmalar va o'quv sahifalari tepasidagi menyu.
// Nomi va tavsifi tarjimada: mode.<id> va mode.<id>.text
export const MODES = [
  {
    id: "learn",
    min: 1,
    color: "text-leaf",
    icon: ["M21 12a9 9 0 1 1-3-6.7", "M21 4v5h-5"],
  },
  {
    id: "standard",
    min: 1,
    color: "text-sky",
    icon: ["M4 7h12v13H4z", "M8 3h12v13"],
  },
  {
    id: "test",
    min: 4,
    color: "text-amber",
    icon: ["M9 11l2 2 4-4", "M5 3h14v18H5z"],
  },
  {
    id: "exam",
    min: 2,
    color: "text-rose",
    icon: ["M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2", "M9 3h6v4H9z", "M9 12h6", "M9 16h4"],
  },
  {
    id: "match",
    min: 3,
    color: "text-[#c792ea]",
    icon: ["M4 4h7v7H4z", "M13 13h7v7h-7z", "M13 7.5h7", "M4 16.5h7"],
  },
];
