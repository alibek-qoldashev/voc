import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../lib/i18n";
import Logo, { BRAND } from "../components/Logo";
import Footer from "../components/Footer";

const EMAIL = "hello@mindpro.app";

// Har bir sahifa: sarlavha, kirish matni va bo'limlar (h — sarlavha, p — matn)
const CONTENT = {
  about: {
    en: {
      title: `About ${BRAND}`,
      intro: `${BRAND} is a vocabulary app for language learners, built in Tashkent. Collect the words you meet, then let the review schedule decide when to show each one again, so nothing you learn quietly fades away.`,
      sections: [
        {
          h: "What you can do",
          p: "Build decks of words with definitions, flip through them on a big board, and study them in five ways: Learn, Anki, Test, Exam and Match.",
        },
        {
          h: "How it remembers for you",
          p: "In Anki mode you rate each card Again, Hard, Good or Easy. Cards you know well come back after longer breaks, the hard ones come back sooner.",
        },
        {
          h: "Learn until it sticks",
          p: "Learn mode works in short rounds: first a multiple choice question, then the words you got right come back as written questions. Missed words return more often until every card is mastered.",
        },
      ],
    },
    ru: {
      title: `О ${BRAND}`,
      intro: `${BRAND} — приложение для изучения слов, созданное в Ташкенте. Собирайте новые слова, а расписание повторений само решит, когда показать каждое снова, чтобы ничего не забылось.`,
      sections: [
        {
          h: "Что можно делать",
          p: "Создавайте наборы слов с определениями, листайте их на большой карточке и учите пятью способами: Learn, Anki, Test, Exam и Match.",
        },
        {
          h: "Как приложение помнит за вас",
          p: "В режиме Anki вы оцениваете карточку: Again, Hard, Good или Easy. Знакомые слова возвращаются реже, трудные — чаще.",
        },
        {
          h: "Учите до полного запоминания",
          p: "Режим Learn идёт короткими раундами: сначала тест с вариантами, затем угаданные слова возвращаются как письменные вопросы. Ошибки повторяются чаще, пока все карточки не будут усвоены.",
        },
      ],
    },
    uz: {
      title: `${BRAND} haqida`,
      intro: `${BRAND} — Toshkentda yaratilgan so'z yodlash ilovasi. Uchragan so'zlaringizni yig'ing, qachon qayta ko'rsatishni esa takrorlash jadvali o'zi hal qiladi, shunda o'rganganlaringiz unutilmaydi.`,
      sections: [
        {
          h: "Nima qilish mumkin",
          p: "Ta'rifli so'zlardan to'plam tuzing, ularni katta kartada varaqlang va besh usulda yodlang: Learn, Anki, Test, Exam va Match.",
        },
        {
          h: "Ilova siz uchun qanday eslab qoladi",
          p: "Anki rejimida har bir kartani Again, Hard, Good yoki Easy deb baholaysiz. Yaxshi bilgan so'zlar uzoqroq tanaffusdan keyin, qiyinlari tezroq qaytadi.",
        },
        {
          h: "To'liq yodlaguncha",
          p: "Learn rejimi kichik raundlarda ishlaydi: avval variantli test, to'g'ri topilgan so'zlar keyin yozma savol bo'lib qaytadi. Xato qilingan so'zlar tez-tez chiqadi, barcha kartalar o'zlashtirilguncha davom etadi.",
        },
      ],
    },
  },

  help: {
    en: {
      title: "Help center",
      intro: "Answers to the questions people ask most.",
      sections: [
        {
          h: "How do I create a deck?",
          p: "Press + and choose Create deck, give it a name, then add words one by one. You can also paste a list, one word per line: term ; definition.",
        },
        {
          h: "How do I add or edit a word?",
          p: "Open the deck and press Add card at the bottom. To change the word on the board, press the pencil icon in its top right corner.",
        },
        {
          h: "Which study mode should I use?",
          p: "Learn goes from multiple choice to writing, round by round, until every card is mastered. Anki spaces out your reviews over days. Test asks multiple choice questions, Exam is a test you set up yourself (number of questions, true/false, multiple choice, matching, written), and Match is a quick pairing game.",
        },
        {
          h: "What do Again, Hard, Good and Easy mean?",
          p: "Anki mode uses SM-2 with learning steps. A new card comes back after 10 minutes, then 1 day, then about 3, 8 days and longer: each Good multiplies the interval by the card's ease (250% at the start). Hard grows it a little, Easy a lot, and Again sends the card back to relearning for 10 minutes. The counters show New (blue), Learning (red) and Review (green) cards.",
        },
        {
          h: "How do starred words work?",
          p: "Tap the star on the deck board. Then turn on starred only in the study settings or in the board options to practise just those words.",
        },
      ],
    },
    ru: {
      title: "Центр помощи",
      intro: "Ответы на самые частые вопросы.",
      sections: [
        {
          h: "Как создать набор?",
          p: "Нажмите «+» и выберите «Создать набор», дайте ему название и добавляйте слова по одному. Можно вставить список, по слову в строке: term ; definition.",
        },
        {
          h: "Как добавить или изменить слово?",
          p: "Откройте набор и нажмите «Добавить карточку» внизу. Чтобы изменить слово на карточке, нажмите на значок карандаша в правом верхнем углу.",
        },
        {
          h: "Какой режим выбрать?",
          p: "Learn ведёт от теста к письму, раунд за раундом, пока все карточки не будут усвоены. Anki распределяет повторения по дням. Test — вопросы с вариантами, Exam — экзамен, который вы настраиваете сами (число вопросов, верно/неверно, тест, сопоставление, письмо), Match — быстрая игра на пары.",
        },
        {
          h: "Что значат Again, Hard, Good и Easy?",
          p: "Режим Anki работает по SM-2 с шагами изучения. Новая карточка возвращается через 10 минут, затем через 1 день, потом примерно через 3, 8 дней и дольше: каждый Good умножает интервал на лёгкость карточки (вначале 250%). Hard немного удлиняет интервал, Easy — сильно, а Again отправляет карточку на переизучение через 10 минут. Счётчики показывают Новые (синие), Изучаются (красные) и Повторение (зелёные).",
        },
        {
          h: "Как работают избранные слова?",
          p: "Нажмите на звёздочку на карточке набора. Затем включите «только избранные» в настройках обучения или карточки.",
        },
      ],
    },
    uz: {
      title: "Yordam markazi",
      intro: "Eng ko'p beriladigan savollarga javoblar.",
      sections: [
        {
          h: "To'plam qanday yaratiladi?",
          p: "\"+\" tugmasini bosib \"To'plam yaratish\"ni tanlang, unga nom bering va so'zlarni birma-bir qo'shing. Ro'yxatni ham qo'yish mumkin, har qatorda bitta so'z: term ; definition.",
        },
        {
          h: "So'zni qanday qo'shaman yoki o'zgartiraman?",
          p: "To'plamni oching va pastdagi \"Karta qo'shish\" tugmasini bosing. Kartadagi so'zni o'zgartirish uchun uning o'ng yuqori burchagidagi qalam belgisini bosing.",
        },
        {
          h: "Qaysi rejimni tanlash kerak?",
          p: "Learn raundma-raund testdan yozma savolga o'tadi va barcha kartalar o'zlashtirilguncha davom etadi. Anki takrorlashlarni kunlarga taqsimlaydi. Test — variantli savollar, Exam — o'zingiz sozlaydigan imtihon (savollar soni, to'g'ri/noto'g'ri, test, juftlash, yozma), Match — tezkor juftlash o'yini.",
        },
        {
          h: "Again, Hard, Good va Easy nimani bildiradi?",
          p: "Anki rejimi o'rganish qadamlari bilan SM-2 asosida ishlaydi. Yangi karta 10 daqiqadan keyin, so'ng 1 kundan keyin, keyin taxminan 3, 8 kun va undan ko'proq oraliqda qaytadi: har bir Good oraliqni kartaning osonlik koeffitsiyentiga (boshida 250%) ko'paytiradi. Hard oraliqni biroz, Easy esa ancha uzaytiradi, Again kartani 10 daqiqalik qayta o'rganishga tushiradi. Hisoblagichlar Yangi (ko'k), O'rganilmoqda (qizil) va Takror (yashil) kartalarni ko'rsatadi.",
        },
        {
          h: "Yulduzchali so'zlar qanday ishlaydi?",
          p: "To'plam kartasidagi yulduzchani bosing. Keyin o'quv sozlamalarida yoki karta sozlamalarida faqat yulduzchalilarni yoqing.",
        },
      ],
    },
  },

  contact: {
    en: {
      title: "Contact",
      intro: "Questions, ideas or found a bug? Write to us, we read every message.",
      sections: [
        { h: "Email", email: EMAIL },
        {
          h: "Report a problem",
          p: "Tell us what you did, what you expected and what happened instead. A screenshot helps a lot.",
          email: EMAIL,
          subject: "Problem report",
        },
      ],
    },
    ru: {
      title: "Контакты",
      intro: "Вопросы, идеи или нашли ошибку? Напишите нам, мы читаем каждое письмо.",
      sections: [
        { h: "Почта", email: EMAIL },
        {
          h: "Сообщить о проблеме",
          p: "Опишите, что вы сделали, чего ожидали и что произошло. Скриншот очень поможет.",
          email: EMAIL,
          subject: "Problem report",
        },
      ],
    },
    uz: {
      title: "Aloqa",
      intro: "Savol, g'oya yoki xatolik topdingizmi? Bizga yozing, har bir xatni o'qiymiz.",
      sections: [
        { h: "Email", email: EMAIL },
        {
          h: "Muammo haqida xabar berish",
          p: "Nima qilganingizni, nimani kutganingizni va aslida nima bo'lganini yozing. Skrinshot juda yordam beradi.",
          email: EMAIL,
          subject: "Problem report",
        },
      ],
    },
  },

  privacy: {
    en: {
      title: "Privacy",
      intro: `This page explains what ${BRAND} keeps about you and why.`,
      sections: [
        {
          h: "What we store",
          p: "Your account email, the decks and cards you create, your study progress and, if you upload one, your profile photo. If you sign in with Google, we receive your email from Google.",
        },
        {
          h: "Kept on your device",
          p: "Your language, starred words and study settings are saved in your browser only. They do not leave your device.",
        },
        {
          h: "Pronunciation",
          p: "The speaker button uses your browser's built-in speech voice. Depending on your device, the browser may process that text.",
        },
        {
          h: "Deleting your data",
          p: "Go to Profile and choose Delete account. Your account and everything in it are removed.",
        },
        { h: "Questions", p: "Write to us any time.", email: EMAIL },
      ],
    },
    ru: {
      title: "Конфиденциальность",
      intro: `На этой странице объясняется, какие данные ${BRAND} хранит о вас и зачем.`,
      sections: [
        {
          h: "Что мы храним",
          p: "Почту вашего аккаунта, созданные наборы и карточки, прогресс обучения и фото профиля, если вы его загрузили. При входе через Google мы получаем от Google вашу почту.",
        },
        {
          h: "Хранится на вашем устройстве",
          p: "Язык, избранные слова и настройки обучения сохраняются только в вашем браузере и не покидают устройство.",
        },
        {
          h: "Произношение",
          p: "Кнопка динамика использует встроенный голос браузера. В зависимости от устройства браузер может обрабатывать этот текст.",
        },
        {
          h: "Удаление данных",
          p: "Откройте Профиль и нажмите «Удалить аккаунт». Аккаунт и все данные в нём будут удалены.",
        },
        { h: "Вопросы", p: "Пишите нам в любое время.", email: EMAIL },
      ],
    },
    uz: {
      title: "Maxfiylik",
      intro: `Bu sahifada ${BRAND} siz haqingizda nimani saqlashi va nima uchun ekani tushuntiriladi.`,
      sections: [
        {
          h: "Nimani saqlaymiz",
          p: "Hisobingiz emaili, siz yaratgan to'plamlar va kartalar, o'qish natijalaringiz va, agar yuklagan bo'lsangiz, profil rasmingiz. Google orqali kirsangiz, emailingizni Google'dan olamiz.",
        },
        {
          h: "Qurilmangizda saqlanadi",
          p: "Til, yulduzchali so'zlar va o'quv sozlamalari faqat brauzeringizda saqlanadi va qurilmangizdan chiqmaydi.",
        },
        {
          h: "Talaffuz",
          p: "Karnay tugmasi brauzerning o'rnatilgan ovozidan foydalanadi. Qurilmaga qarab brauzer bu matnni qayta ishlashi mumkin.",
        },
        {
          h: "Ma'lumotlarni o'chirish",
          p: "Profilga kiring va \"Hisobni o'chirish\" tugmasini bosing. Hisobingiz va undagi barcha ma'lumotlar o'chiriladi.",
        },
        { h: "Savollar", p: "Istalgan vaqtda bizga yozing.", email: EMAIL },
      ],
    },
  },
};

export default function Info({ page }) {
  const { lang, t } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const c = CONTENT[page][lang] ?? CONTENT[page].en;

  return (
    <div className="flex min-h-screen flex-col bg-night text-white">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link to={user ? "/home" : "/"} aria-label={BRAND}>
          <Logo className="text-2xl" />
        </Link>
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="text-sm text-mist hover:text-leaf"
        >
          ← {t("page.back")}
        </button>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16 pt-4">
        <h1 className="text-4xl font-extrabold">{c.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-mist">{c.intro}</p>

        <div className="mt-10 space-y-4">
          {c.sections.map((s) => (
            <section key={s.h} className="glass rounded-3xl p-6">
              <h2 className="text-xl font-bold">{s.h}</h2>
              {s.p && <p className="mt-2 leading-relaxed text-mist">{s.p}</p>}
              {s.email && (
                <a
                  href={`mailto:${s.email}${s.subject ? `?subject=${encodeURIComponent(s.subject)}` : ""}`}
                  className="mt-3 inline-block font-bold text-leaf hover:underline"
                >
                  {s.email}
                </a>
              )}
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
