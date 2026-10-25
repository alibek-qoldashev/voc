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
    id: "write",
    min: 1,
    color: "text-rose",
    icon: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
  },
  {
    id: "match",
    min: 3,
    color: "text-[#c792ea]",
    icon: ["M4 4h7v7H4z", "M13 13h7v7h-7z", "M13 7.5h7", "M4 16.5h7"],
  },
];
