// Fable speaks six languages. The words of the Fable page and of the pair readings on cards, per language;
// Fable's own readings are written in the traveler's language by the model (lib/fable.ts). The choice lives
// in the zr_lang cookie (components/LangPicker.tsx), else the phone's Accept-Language, else English.

export const LANGS = ["en", "ru", "es", "zh", "ja", "de"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_NAME: Record<Lang, string> = { en: "English", ru: "Русский", es: "Español", zh: "中文", ja: "日本語", de: "Deutsch" };
// What the model is told to write in.
export const LANG_PROMPT: Record<Lang, string> = {
  en: "English", ru: "Russian", es: "Spanish", zh: "Simplified Chinese", ja: "Japanese", de: "German",
};
export const LANG_COOKIE = "zr_lang";

export function pickLang(cookie?: string | null, accept?: string | null): Lang {
  if (cookie && (LANGS as readonly string[]).includes(cookie)) return cookie as Lang;
  for (const part of (accept ?? "").split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if ((LANGS as readonly string[]).includes(code)) return code as Lang;
  }
  return "en";
}

const en = {
  title: "Fable reads", titleEm: "the party",
  intro: "Fable, the oracle of 2050, reads every traveler from their birthday sky: Sun, Moon, the year’s animal and tonight’s Moon.",
  tabYou: "You", tabFriends: "Friends", tabParty: "Party",
  readsYou: "Fable reads {name}",
  yourReading: "Your reading",
  loginFirst: "Fable reads you once you have a Kin. Log in with your email, or tap your pass to arrive.",
  login: "Log in with email", imNew: "I’m new",
  yourSky: "Your sky",
  sun: "Sun", moon: "Moon", year: "Year", tonight: "Tonight",
  moonOr: "or {sign}, by the hour you were born",
  yearOf: "{el} {animal}",
  tonightLine: "Tonight the Moon is in {moon} ({phase}). For a {sign} that lights your {house}: {theme}.",
  house: "{n} house",
  suitTitle: "Signs that suit you", suitSub: "The best matches for a {sign}, and who of them is here tonight.",
  why_trine: "same element: you flow", why_sextile: "complementary elements: an easy spark", why_opposition: "opposites: a magnetic pull",
  hereTonight: "Here tonight", nobodyYet: "Nobody of this sign has arrived yet.",
  friendsTitle: "You and your friends",
  friendsEmpty: "Become friends with someone or tap their pass, and Fable reads the two of you here.",
  friendsLogin: "Log in to see Fable read you with your friends.",
  pairReading: "Fable is reading the two of you…",
  youAnd: "You and {name}",
  partyTitle: "The party’s sky", travelers: "{n} TRAVELERS",
  noTravelers: "No travelers yet. The sky fills as people arrive.",
  leans: "The party leans {sign} ({k} of {n}).", rarest: "The rarest sign here is {sign}.", mostly: "Most of us are {el} signs.",
  whoIsWhat: "Who is what", elementsTitle: "Elements",
  reading: "Fable is reading…", lost: "Fable lost the signal. Look again in a minute.",
  language: "Language",
  fallback: "Tonight, {name}, your {sign} sky turns the room toward you, and your Kin finds you the one person you came to meet. In 2050 you keep the seat with the best view of what you built.",
  pairFallback: "{label}: you and {name} make a good story tonight. Find each other before midnight and swap one wild plan for 2050.",
  pair_flow: "Natural flow", pair_spark: "Easy spark", pair_magnet: "Magnetic opposites", pair_mirror: "Mirror twins", pair_forge: "Productive friction", pair_puzzle: "Plot twist",
  signs: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
  elements: { fire: "fire", earth: "earth", air: "air", water: "water" } as Record<string, string>,
  animals: ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"],
  cnElements: { Metal: "Metal", Water: "Water", Wood: "Wood", Fire: "Fire", Earth: "Earth" } as Record<string, string>,
  phases: ["new Moon", "waxing crescent", "first quarter", "waxing gibbous", "full Moon", "waning gibbous", "last quarter", "waning crescent"],
  houses: ["", "you and first impressions", "taste and pleasures", "talk and messages", "home and roots", "play, flirting and fun", "habits and rituals", "one-to-one meetings", "depth and secrets", "big ideas and far travel", "ambition and being seen", "friends, groups and parties", "dreams and what happens backstage"],
};
export type Dict = typeof en;

const ru: Dict = {
  title: "Fable читает", titleEm: "вечеринку",
  intro: "Fable, оракул 2050 года, читает каждого гостя по небу его дня рождения: Солнце, Луна, животное года и Луна этой ночи.",
  tabYou: "Ты", tabFriends: "Друзья", tabParty: "Вечеринка",
  readsYou: "Fable читает: {name}",
  yourReading: "Твоё предсказание",
  loginFirst: "Fable прочтёт тебя, когда у тебя появится Кин. Войди по email или приложи свой пропуск.",
  login: "Войти по email", imNew: "Я впервые",
  yourSky: "Твоё небо",
  sun: "Солнце", moon: "Луна", year: "Год", tonight: "Этой ночью",
  moonOr: "или {sign}, смотря по часу рождения",
  yearOf: "{animal}, стихия {el}",
  tonightLine: "Этой ночью Луна в знаке {moon} ({phase}). Для знака {sign} она освещает твой {house}: {theme}.",
  house: "{n}-й дом",
  suitTitle: "Знаки, которые тебе подходят", suitSub: "Лучшие пары для знака {sign} и кто из них уже здесь.",
  why_trine: "одна стихия: всё течёт само", why_sextile: "стихии дополняют друг друга: лёгкая искра", why_opposition: "противоположности: магнитное притяжение",
  hereTonight: "Сегодня здесь", nobodyYet: "Гостей этого знака пока нет.",
  friendsTitle: "Ты и твои друзья",
  friendsEmpty: "Подружись с кем-нибудь или приложи его пропуск, и Fable прочтёт вас двоих здесь.",
  friendsLogin: "Войди, чтобы Fable прочёл тебя вместе с друзьями.",
  pairReading: "Fable читает вас двоих…",
  youAnd: "Ты и {name}",
  partyTitle: "Небо вечеринки", travelers: "ГОСТЕЙ: {n}",
  noTravelers: "Пока никого. Небо заполнится, когда гости придут.",
  leans: "Больше всего здесь — {sign} ({k} из {n}).", rarest: "Самый редкий знак — {sign}.", mostly: "Больше всего знаков стихии {el}.",
  whoIsWhat: "Кто есть кто", elementsTitle: "Стихии",
  reading: "Fable читает…", lost: "Fable потерял сигнал. Загляни через минуту.",
  language: "Язык",
  fallback: "Этой ночью, {name}, твоё небо знака {sign} развернёт зал к тебе, а твой Кин найдёт того самого человека, ради которого ты здесь. В 2050 году у тебя место с лучшим видом на всё, что создано тобой.",
  pairFallback: "{label}: ты и {name} — хорошая история этой ночи. Найдите друг друга до полуночи и обменяйтесь одним безумным планом на 2050.",
  pair_flow: "Естественный поток", pair_spark: "Лёгкая искра", pair_magnet: "Магнит противоположностей", pair_mirror: "Зеркальные близнецы", pair_forge: "Полезное трение", pair_puzzle: "Неожиданный поворот",
  signs: ["Овен", "Телец", "Близнецы", "Рак", "Лев", "Дева", "Весы", "Скорпион", "Стрелец", "Козерог", "Водолей", "Рыбы"],
  elements: { fire: "Огонь", earth: "Земля", air: "Воздух", water: "Вода" },
  animals: ["Крыса", "Бык", "Тигр", "Кролик", "Дракон", "Змея", "Лошадь", "Коза", "Обезьяна", "Петух", "Собака", "Свинья"],
  cnElements: { Metal: "Металл", Water: "Вода", Wood: "Дерево", Fire: "Огонь", Earth: "Земля" },
  phases: ["новолуние", "растущий серп", "первая четверть", "растущая Луна", "полнолуние", "убывающая Луна", "последняя четверть", "убывающий серп"],
  houses: ["", "ты и первое впечатление", "вкус и удовольствия", "разговоры и сообщения", "дом и корни", "игра, флирт и веселье", "привычки и ритуалы", "встречи один на один", "глубина и тайны", "большие идеи и дальние путешествия", "амбиции и признание", "друзья, компании и вечеринки", "мечты и то, что за кулисами"],
};

const es: Dict = {
  title: "Fable lee", titleEm: "la fiesta",
  intro: "Fable, el oráculo de 2050, lee a cada viajero por el cielo de su cumpleaños: Sol, Luna, el animal del año y la Luna de esta noche.",
  tabYou: "Tú", tabFriends: "Amigos", tabParty: "Fiesta",
  readsYou: "Fable lee a {name}",
  yourReading: "Tu lectura",
  loginFirst: "Fable te lee cuando tengas tu Kin. Entra con tu email o toca tu pase para llegar.",
  login: "Entrar con email", imNew: "Soy nuevo",
  yourSky: "Tu cielo",
  sun: "Sol", moon: "Luna", year: "Año", tonight: "Esta noche",
  moonOr: "o {sign}, según la hora en que naciste",
  yearOf: "{animal} de {el}",
  tonightLine: "Esta noche la Luna está en {moon} ({phase}). Para {sign} ilumina tu {house}: {theme}.",
  house: "casa {n}",
  suitTitle: "Los signos que te van", suitSub: "Las mejores parejas para {sign}, y quién de ellos está aquí esta noche.",
  why_trine: "mismo elemento: fluyen", why_sextile: "elementos complementarios: chispa fácil", why_opposition: "opuestos: atracción magnética",
  hereTonight: "Aquí esta noche", nobodyYet: "Aún no ha llegado nadie de este signo.",
  friendsTitle: "Tú y tus amigos",
  friendsEmpty: "Hazte amigo de alguien o toca su pase, y Fable os leerá a los dos aquí.",
  friendsLogin: "Entra para que Fable te lea con tus amigos.",
  pairReading: "Fable os está leyendo a los dos…",
  youAnd: "Tú y {name}",
  partyTitle: "El cielo de la fiesta", travelers: "{n} VIAJEROS",
  noTravelers: "Aún no hay viajeros. El cielo se llena cuando llega la gente.",
  leans: "La fiesta tira a {sign} ({k} de {n}).", rarest: "El signo más raro aquí es {sign}.", mostly: "La mayoría somos signos de {el}.",
  whoIsWhat: "Quién es qué", elementsTitle: "Elementos",
  reading: "Fable está leyendo…", lost: "Fable perdió la señal. Vuelve a mirar en un minuto.",
  language: "Idioma",
  fallback: "Esta noche, {name}, tu cielo de {sign} gira la sala hacia ti, y tu Kin te encuentra a la persona que viniste a conocer. En 2050 tienes el asiento con la mejor vista de lo que construiste.",
  pairFallback: "{label}: tú y {name} sois una buena historia esta noche. Encontraos antes de medianoche y cambiad un plan loco para 2050.",
  pair_flow: "Flujo natural", pair_spark: "Chispa fácil", pair_magnet: "Opuestos magnéticos", pair_mirror: "Gemelos espejo", pair_forge: "Fricción productiva", pair_puzzle: "Giro de guion",
  signs: ["Aries", "Tauro", "Géminis", "Cáncer", "Leo", "Virgo", "Libra", "Escorpio", "Sagitario", "Capricornio", "Acuario", "Piscis"],
  elements: { fire: "fuego", earth: "tierra", air: "aire", water: "agua" },
  animals: ["Rata", "Buey", "Tigre", "Conejo", "Dragón", "Serpiente", "Caballo", "Cabra", "Mono", "Gallo", "Perro", "Cerdo"],
  cnElements: { Metal: "Metal", Water: "Agua", Wood: "Madera", Fire: "Fuego", Earth: "Tierra" },
  phases: ["luna nueva", "creciente", "cuarto creciente", "gibosa creciente", "luna llena", "gibosa menguante", "cuarto menguante", "menguante"],
  houses: ["", "tú y la primera impresión", "gustos y placeres", "charlas y mensajes", "hogar y raíces", "juego, coqueteo y diversión", "hábitos y rituales", "encuentros de tú a tú", "profundidad y secretos", "grandes ideas y viajes lejanos", "ambición y ser visto", "amigos, grupos y fiestas", "sueños y lo que pasa entre bastidores"],
};

const zh: Dict = {
  title: "Fable 解读", titleEm: "这场派对",
  intro: "Fable 是 2050 年的神谕，根据每位旅人生日那天的星空来解读：太阳、月亮、生肖，以及今晚的月亮。",
  tabYou: "我", tabFriends: "朋友", tabParty: "派对",
  readsYou: "Fable 解读 {name}",
  yourReading: "你的解读",
  loginFirst: "拥有 Kin 之后，Fable 就会为你解读。用邮箱登录，或轻触你的通行证入场。",
  login: "用邮箱登录", imNew: "我是新来的",
  yourSky: "你的星空",
  sun: "太阳", moon: "月亮", year: "生肖", tonight: "今晚",
  moonOr: "也可能是{sign}，取决于你出生的时辰",
  yearOf: "{el}{animal}",
  tonightLine: "今晚月亮位于{moon}（{phase}）。对{sign}来说，它照亮你的{house}：{theme}。",
  house: "第{n}宫",
  suitTitle: "最适合你的星座", suitSub: "与{sign}最合拍的星座，以及今晚在场的人。",
  why_trine: "同一元素：自然契合", why_sextile: "元素互补：轻松来电", why_opposition: "对立星座：磁铁般相吸",
  hereTonight: "今晚在场", nobodyYet: "这个星座的人还没到。",
  friendsTitle: "你和你的朋友",
  friendsEmpty: "和某人成为朋友或轻触对方的通行证，Fable 就会在这里解读你们俩。",
  friendsLogin: "登录后，Fable 会解读你和朋友们。",
  pairReading: "Fable 正在解读你们俩…",
  youAnd: "你和 {name}",
  partyTitle: "派对的星空", travelers: "{n} 位旅人",
  noTravelers: "还没有旅人。人们到来时，星空就会被填满。",
  leans: "派对里最多的是{sign}（{n} 人中有 {k} 人）。", rarest: "这里最少见的星座是{sign}。", mostly: "我们大多是{el}象星座。",
  whoIsWhat: "谁是什么星座", elementsTitle: "元素",
  reading: "Fable 正在解读…", lost: "Fable 失去了信号，请一分钟后再看。",
  language: "语言",
  fallback: "今晚，{name}，你的{sign}星空让整个房间转向你，你的 Kin 会帮你找到你此行想见的那个人。2050 年，你坐在最好的位置，看着你亲手建造的一切。",
  pairFallback: "{label}：今晚你和 {name} 是一个好故事。午夜前找到彼此，交换一个关于 2050 的疯狂计划。",
  pair_flow: "自然流动", pair_spark: "轻松来电", pair_magnet: "磁性对立", pair_mirror: "镜像双子", pair_forge: "有益的摩擦", pair_puzzle: "剧情反转",
  signs: ["白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"],
  elements: { fire: "火", earth: "土", air: "风", water: "水" },
  animals: ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"],
  cnElements: { Metal: "金", Water: "水", Wood: "木", Fire: "火", Earth: "土" },
  phases: ["新月", "蛾眉月", "上弦月", "盈凸月", "满月", "亏凸月", "下弦月", "残月"],
  houses: ["", "自我与第一印象", "品味与享受", "交谈与讯息", "家与根", "玩乐、调情与欢笑", "习惯与仪式", "一对一的相遇", "深处与秘密", "宏大想法与远行", "抱负与被看见", "朋友、团体与派对", "梦境与幕后之事"],
};

const ja: Dict = {
  title: "Fable が読む", titleEm: "このパーティー",
  intro: "2050年の神託 Fable は、誕生日の空から旅人を一人ずつ読み解きます。太陽、月、生まれ年の干支、そして今夜の月。",
  tabYou: "あなた", tabFriends: "友だち", tabParty: "パーティー",
  readsYou: "Fable が読む {name}",
  yourReading: "あなたのリーディング",
  loginFirst: "Kin ができたら Fable があなたを読みます。メールでログインするか、パスをタップして入場してください。",
  login: "メールでログイン", imNew: "はじめて",
  yourSky: "あなたの空",
  sun: "太陽", moon: "月", year: "干支", tonight: "今夜",
  moonOr: "生まれた時刻によっては{sign}",
  yearOf: "{el}の{animal}",
  tonightLine: "今夜の月は{moon}（{phase}）。{sign}にとっては{house}を照らします：{theme}。",
  house: "第{n}ハウス",
  suitTitle: "あなたと相性のいい星座", suitSub: "{sign}と相性抜群の星座と、今夜ここにいる人たち。",
  why_trine: "同じエレメント：自然に流れる", why_sextile: "補い合うエレメント：気軽な火花", why_opposition: "正反対：磁石のように引き合う",
  hereTonight: "今夜ここに", nobodyYet: "この星座の人はまだ来ていません。",
  friendsTitle: "あなたと友だち",
  friendsEmpty: "誰かと友だちになるか、その人のパスをタップすると、Fable が二人を読みます。",
  friendsLogin: "ログインすると、Fable があなたと友だちを読みます。",
  pairReading: "Fable が二人を読んでいます…",
  youAnd: "あなたと {name}",
  partyTitle: "パーティーの空", travelers: "旅人 {n} 人",
  noTravelers: "まだ旅人はいません。人が来るにつれて空が満ちていきます。",
  leans: "このパーティーは{sign}が多め（{n} 人中 {k} 人）。", rarest: "ここで一番珍しいのは{sign}。", mostly: "いちばん多いのは{el}の星座。",
  whoIsWhat: "誰が何座", elementsTitle: "エレメント",
  reading: "Fable が読んでいます…", lost: "Fable の信号が途切れました。1分後にもう一度どうぞ。",
  language: "言語",
  fallback: "今夜、{name}、{sign}の空が部屋をあなたのほうへ向け、あなたの Kin が会いに来たその一人を見つけてくれます。2050年、あなたは自分で築いたものを一番よく見渡せる席に座っています。",
  pairFallback: "{label}：今夜、あなたと {name} はいい物語になります。真夜中までにお互いを見つけて、2050年のとびきりの計画をひとつ交換して。",
  pair_flow: "自然な流れ", pair_spark: "気軽な火花", pair_magnet: "引き合う正反対", pair_mirror: "鏡の双子", pair_forge: "実りある摩擦", pair_puzzle: "どんでん返し",
  signs: ["牡羊座", "牡牛座", "双子座", "蟹座", "獅子座", "乙女座", "天秤座", "蠍座", "射手座", "山羊座", "水瓶座", "魚座"],
  elements: { fire: "火", earth: "地", air: "風", water: "水" },
  animals: ["ネズミ", "ウシ", "トラ", "ウサギ", "タツ", "ヘビ", "ウマ", "ヒツジ", "サル", "トリ", "イヌ", "イノシシ"],
  cnElements: { Metal: "金", Water: "水", Wood: "木", Fire: "火", Earth: "土" },
  phases: ["新月", "三日月", "上弦", "満ちゆく月", "満月", "欠けゆく月", "下弦", "有明月"],
  houses: ["", "自分と第一印象", "好みと楽しみ", "会話とメッセージ", "家とルーツ", "遊び、ときめき、楽しさ", "習慣と小さな儀式", "一対一の出会い", "深さと秘密", "大きなアイデアと遠い旅", "野心と注目", "友だち、仲間、パーティー", "夢と舞台裏"],
};

const de: Dict = {
  title: "Fable liest", titleEm: "die Party",
  intro: "Fable, das Orakel von 2050, liest jeden Reisenden aus dem Himmel seines Geburtstags: Sonne, Mond, das Tier des Jahres und der Mond von heute Nacht.",
  tabYou: "Du", tabFriends: "Freunde", tabParty: "Party",
  readsYou: "Fable liest {name}",
  yourReading: "Deine Deutung",
  loginFirst: "Fable liest dich, sobald du ein Kin hast. Melde dich mit deiner E-Mail an oder tippe deinen Pass an.",
  login: "Mit E-Mail anmelden", imNew: "Ich bin neu",
  yourSky: "Dein Himmel",
  sun: "Sonne", moon: "Mond", year: "Jahr", tonight: "Heute Nacht",
  moonOr: "oder {sign}, je nach Geburtsstunde",
  yearOf: "{animal} ({el})",
  tonightLine: "Heute Nacht steht der Mond in {moon} ({phase}). Für {sign} erhellt er dein {house}: {theme}.",
  house: "{n}. Haus",
  suitTitle: "Zeichen, die zu dir passen", suitSub: "Die besten Partner für {sign} und wer davon heute hier ist.",
  why_trine: "gleiches Element: ihr fließt", why_sextile: "ergänzende Elemente: ein leichter Funke", why_opposition: "Gegensätze: magnetische Anziehung",
  hereTonight: "Heute hier", nobodyYet: "Von diesem Zeichen ist noch niemand da.",
  friendsTitle: "Du und deine Freunde",
  friendsEmpty: "Freunde dich mit jemandem an oder tippe seinen Pass an, dann liest Fable euch beide hier.",
  friendsLogin: "Melde dich an, damit Fable dich mit deinen Freunden liest.",
  pairReading: "Fable liest euch beide…",
  youAnd: "Du und {name}",
  partyTitle: "Der Himmel der Party", travelers: "{n} REISENDE",
  noTravelers: "Noch keine Reisenden. Der Himmel füllt sich, wenn die Leute kommen.",
  leans: "Die Party tendiert zu {sign} ({k} von {n}).", rarest: "Das seltenste Zeichen hier ist {sign}.", mostly: "Die meisten von uns sind Zeichen des Elements {el}.",
  whoIsWhat: "Wer ist was", elementsTitle: "Elemente",
  reading: "Fable liest…", lost: "Fable hat das Signal verloren. Schau in einer Minute noch mal.",
  language: "Sprache",
  fallback: "Heute Nacht, {name}, dreht dein {sign}-Himmel den Raum zu dir, und dein Kin findet die eine Person, für die du gekommen bist. 2050 hast du den Platz mit dem besten Blick auf das, was du gebaut hast.",
  pairFallback: "{label}: Du und {name} seid heute Nacht eine gute Geschichte. Findet euch vor Mitternacht und tauscht einen verrückten Plan für 2050.",
  pair_flow: "Natürlicher Fluss", pair_spark: "Leichter Funke", pair_magnet: "Magnetische Gegensätze", pair_mirror: "Spiegelzwillinge", pair_forge: "Produktive Reibung", pair_puzzle: "Plot-Twist",
  signs: ["Widder", "Stier", "Zwillinge", "Krebs", "Löwe", "Jungfrau", "Waage", "Skorpion", "Schütze", "Steinbock", "Wassermann", "Fische"],
  elements: { fire: "Feuer", earth: "Erde", air: "Luft", water: "Wasser" },
  animals: ["Ratte", "Büffel", "Tiger", "Hase", "Drache", "Schlange", "Pferd", "Ziege", "Affe", "Hahn", "Hund", "Schwein"],
  cnElements: { Metal: "Metall", Water: "Wasser", Wood: "Holz", Fire: "Feuer", Earth: "Erde" },
  phases: ["Neumond", "zunehmende Sichel", "erstes Viertel", "zunehmender Mond", "Vollmond", "abnehmender Mond", "letztes Viertel", "abnehmende Sichel"],
  houses: ["", "du und der erste Eindruck", "Geschmack und Genuss", "Gespräche und Nachrichten", "Zuhause und Wurzeln", "Spiel, Flirt und Spaß", "Gewohnheiten und Rituale", "Begegnungen zu zweit", "Tiefe und Geheimnisse", "große Ideen und weite Reisen", "Ehrgeiz und gesehen werden", "Freunde, Gruppen und Partys", "Träume und was hinter den Kulissen geschieht"],
};

export const DICTS: Record<Lang, Dict> = { en, ru, es, zh, ja, de };

export function t(lang: Lang, key: keyof Dict, vars: Record<string, string | number> = {}): string {
  const s = (DICTS[lang][key] ?? en[key]) as string;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

const SIGN_ORDER = en.signs;
export const signName = (lang: Lang, sign: string) => DICTS[lang].signs[SIGN_ORDER.indexOf(sign)] ?? sign;
export const animalName = (lang: Lang, i: number) => DICTS[lang].animals[i] ?? "";
export const elementName = (lang: Lang, el: string) => DICTS[lang].elements[el] ?? el;
export const phaseName = (lang: Lang, phase: string) => {
  const i = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"].indexOf(phase);
  return DICTS[lang].phases[i] ?? phase;
};
const ORD = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
export const houseName = (lang: Lang, n: number) => t(lang, "house", { n: lang === "en" ? ORD(n) : n });
