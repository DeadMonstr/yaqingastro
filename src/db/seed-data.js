// Меню из макета docs/design/menu.dc.html (константа CATS): стартовое наполнение пустой базы.
// Тексты скопированы дословно; в узбекском — типографский апостроф ’ (U+2019).
export const SEED_MENU = [
  {
    slug: 'breakfast',
    name: { ru: 'Завтраки', uz: 'Nonushtalar', en: 'Breakfast' },
    dishes: [
      {
        name: { ru: 'Английский завтрак', uz: 'Ingliz nonushtasi', en: 'English breakfast' },
        desc: { ru: 'Яичница, говяжий бекон, колбаски, фасоль, томаты гриль и тост.', uz: 'Quymoq, mol go’shtidan bekon, kolbasachalar, loviya, grilda pomidor va tost.', en: 'Fried eggs, beef bacon, sausages, beans, grilled tomatoes and toast.' },
        amount: 420, unit: 'g', price: 95000
      },
      {
        name: { ru: 'Сырники со сметаной', uz: 'Smetanali sirniki', en: 'Syrniki with sour cream' },
        desc: { ru: 'Творожные сырники со сметаной и ягодным соусом.', uz: 'Tvorogli sirniki, smetana va rezavor sous bilan.', en: 'Cottage cheese pancakes with sour cream and berry sauce.' },
        amount: 250, unit: 'g', price: 52000
      },
      {
        name: { ru: 'Яйца Бенедикт', uz: 'Benedikt tuxumi', en: 'Eggs Benedict' },
        desc: { ru: 'Яйца пашот на бриоши с голландским соусом и шпинатом.', uz: 'Brioshda pashot tuxum, gollandcha sous va ismaloq bilan.', en: 'Poached eggs on brioche with hollandaise and spinach.' },
        amount: 280, unit: 'g', price: 68000
      },
      {
        name: { ru: 'Шакшука', uz: 'Shakshuka', en: 'Shakshuka' },
        desc: { ru: 'Яйца, томлёные в пряном томатном соусе, с лепёшкой.', uz: 'Ziravorli pomidor sousida pishirilgan tuxum, non bilan.', en: 'Eggs simmered in spiced tomato sauce, served with flatbread.' },
        amount: 320, unit: 'g', price: 58000
      },
      {
        name: { ru: 'Овсяная каша с ягодами', uz: 'Rezavorli suli bo’tqasi', en: 'Oatmeal with berries' },
        desc: { ru: 'На молоке, с мёдом, бананом и свежими ягодами.', uz: 'Sutda, asal, banan va yangi rezavorlar bilan.', en: 'Cooked in milk, with honey, banana and fresh berries.' },
        amount: 300, unit: 'g', price: 42000
      }
    ]
  },
  {
    slug: 'drinks',
    name: { ru: 'Кофе и напитки', uz: 'Qahva va ichimliklar', en: 'Coffee & Drinks' },
    dishes: [
      {
        name: { ru: 'Капучино', uz: 'Kapuchino', en: 'Cappuccino' },
        desc: { ru: 'Двойной эспрессо и бархатная молочная пена.', uz: 'Ikki hissa espresso va mayin sut ko’pigi.', en: 'Double espresso with velvety milk foam.' },
        amount: 300, unit: 'ml', price: 38000
      },
      {
        name: { ru: 'Флэт уайт', uz: 'Flet uayt', en: 'Flat white' },
        desc: { ru: 'Насыщенный эспрессо с тонким слоем молока.', uz: 'Quyuq espresso va yupqa sut qatlami.', en: 'Rich espresso with a thin layer of steamed milk.' },
        amount: 250, unit: 'ml', price: 40000
      },
      {
        name: { ru: 'Лавандовый раф', uz: 'Lavandali raf', en: 'Lavender raf' },
        desc: { ru: 'Сливочный кофе с лавандовым сиропом.', uz: 'Lavanda siropli qaymoqli qahva.', en: 'Creamy coffee with lavender syrup.' },
        amount: 350, unit: 'ml', price: 45000
      },
      {
        name: { ru: 'Матча латте', uz: 'Matcha latte', en: 'Matcha latte' },
        desc: { ru: 'Японский чай матча на молоке.', uz: 'Sutli yapon matcha choyi.', en: 'Japanese matcha whisked with steamed milk.' },
        amount: 350, unit: 'ml', price: 46000
      },
      {
        name: { ru: 'Чай с чабрецом', uz: 'Kakliko’tli choy', en: 'Thyme tea' },
        desc: { ru: 'Чёрный чай с чабрецом, лимоном и мёдом. Чайник.', uz: 'Qora choy, kakliko’t, limon va asal bilan. Choynak.', en: 'Black tea with thyme, lemon and honey. Teapot.' },
        amount: 600, unit: 'ml', price: 30000
      },
      {
        name: { ru: 'Лимонад маракуйя', uz: 'Marakuyya limonadi', en: 'Passion fruit lemonade' },
        desc: { ru: 'Освежающий лимонад с маракуйей и мятой.', uz: 'Marakuyya va yalpizli tetiklantiruvchi limonad.', en: 'Refreshing lemonade with passion fruit and mint.' },
        amount: 400, unit: 'ml', price: 42000
      }
    ]
  },
  {
    slug: 'desserts',
    name: { ru: 'Выпечка и десерты', uz: 'Pishiriqlar va desertlar', en: 'Bakery & Desserts' },
    dishes: [
      {
        name: { ru: 'Чизкейк Нью-Йорк', uz: 'Nyu-York chizkeyki', en: 'New York cheesecake' },
        desc: { ru: 'Классический чизкейк с ягодным соусом.', uz: 'Rezavor sousli klassik chizkeyk.', en: 'Classic baked cheesecake with berry sauce.' },
        amount: 150, unit: 'g', price: 55000
      },
      {
        name: { ru: 'Круассан', uz: 'Kruassan', en: 'Butter croissant' },
        desc: { ru: 'Слоёный круассан на сливочном масле.', uz: 'Sariyog’li qatlamli kruassan.', en: 'Flaky all-butter croissant.' },
        amount: 80, unit: 'g', price: 28000
      },
      {
        name: { ru: 'Медовик', uz: 'Asalli tort', en: 'Honey cake' },
        desc: { ru: 'Тонкие медовые коржи со сметанным кремом.', uz: 'Yupqa asalli qatlamlar, smetanali krem bilan.', en: 'Thin honey layers with sour cream frosting.' },
        amount: 160, unit: 'g', price: 42000
      },
      {
        name: { ru: 'Тирамису', uz: 'Tiramisu', en: 'Tiramisu' },
        desc: { ru: 'Савоярди, маскарпоне и эспрессо.', uz: 'Savoyardi, maskarpone va espresso.', en: 'Savoiardi, mascarpone and espresso.' },
        amount: 170, unit: 'g', price: 52000
      },
      {
        name: { ru: 'Синнабон', uz: 'Dolchinli bulochka', en: 'Cinnamon roll' },
        desc: { ru: 'Булочка с корицей и сливочным кремом.', uz: 'Dolchinli bulochka, qaymoqli krem bilan.', en: 'Cinnamon roll with cream cheese frosting.' },
        amount: 130, unit: 'g', price: 34000
      }
    ]
  },
  {
    slug: 'salads',
    name: { ru: 'Салаты', uz: 'Salatlar', en: 'Salads' },
    dishes: [
      {
        name: { ru: 'Цезарь с курицей', uz: 'Tovuqli Sezar', en: 'Chicken Caesar' },
        desc: { ru: 'Романо, курица гриль, пармезан, крутоны и соус цезарь.', uz: 'Romano, grilda tovuq, parmezan, kruton va Sezar sousi.', en: 'Romaine, grilled chicken, parmesan, croutons and Caesar dressing.' },
        amount: 280, unit: 'g', price: 62000
      },
      {
        name: { ru: 'Греческий', uz: 'Yunoncha salat', en: 'Greek salad' },
        desc: { ru: 'Свежие овощи, фета, оливки и орегано.', uz: 'Yangi sabzavotlar, feta, zaytun va oregano.', en: 'Fresh vegetables, feta, olives and oregano.' },
        amount: 260, unit: 'g', price: 54000
      },
      {
        name: { ru: 'Тёплый салат с говядиной', uz: 'Mol go’shtli iliq salat', en: 'Warm beef salad' },
        desc: { ru: 'Говядина, микс салатов, томаты черри и кунжутная заправка.', uz: 'Mol go’shti, salat barglari, cherri pomidor va kunjutli sous.', en: 'Seared beef, mixed greens, cherry tomatoes and sesame dressing.' },
        amount: 250, unit: 'g', price: 72000
      },
      {
        name: { ru: 'Ачичук', uz: 'Achchiq-chuchuk', en: 'Achichuk' },
        desc: { ru: 'Томаты, лук и острый перец по-узбекски.', uz: 'Pomidor, piyoz va achchiq qalampir.', en: 'Uzbek tomato, onion and chili salad.' },
        amount: 220, unit: 'g', price: 32000
      }
    ]
  },
  {
    slug: 'soups',
    name: { ru: 'Первые блюда', uz: 'Sho’rvalar', en: 'Soups' },
    dishes: [
      {
        name: { ru: 'Крем-суп из тыквы', uz: 'Qovoqli krem-sho’rva', en: 'Pumpkin cream soup' },
        desc: { ru: 'С гренками, тыквенными семечками и сливками.', uz: 'Suxari, qovoq urug’i va qaymoq bilan.', en: 'With croutons, pumpkin seeds and cream.' },
        amount: 300, unit: 'ml', price: 46000
      },
      {
        name: { ru: 'Шурпа', uz: 'Sho’rva', en: 'Shurpa' },
        desc: { ru: 'Наваристый бульон из баранины с овощами.', uz: 'Qo’y go’shtidan quyuq sho’rva, sabzavotlar bilan.', en: 'Rich lamb broth with vegetables.' },
        amount: 400, unit: 'ml', price: 52000
      },
      {
        name: { ru: 'Чечевичный суп', uz: 'Yasmiqli sho’rva', en: 'Lentil soup' },
        desc: { ru: 'Красная чечевица, лимон и зира.', uz: 'Qizil yasmiq, limon va zira.', en: 'Red lentils, lemon and cumin.' },
        amount: 300, unit: 'ml', price: 38000
      },
      {
        name: { ru: 'Грибной крем-суп', uz: 'Qo’ziqorinli krem-sho’rva', en: 'Mushroom cream soup' },
        desc: { ru: 'Шампиньоны, сливки и трюфельное масло.', uz: 'Shampinyon, qaymoq va tryufel moyi.', en: 'Champignons, cream and truffle oil.' },
        amount: 300, unit: 'ml', price: 48000
      }
    ]
  }
]
