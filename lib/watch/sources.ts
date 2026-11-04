/** Ghana entertainment press with public RSS feeds, read on every watch run */
export const PRESS_FEEDS: { name: string; url: string }[] = [
  { name: '3Music', url: 'https://www.3music.tv/feed' },
  { name: 'GhanaWeb', url: 'https://www.ghanaweb.com/GhanaHomePage/entertainment/rss.xml' },
  { name: 'Pulse Ghana', url: 'https://www.pulse.com.gh/entertainment/rss' },
  { name: 'MyJoyOnline', url: 'https://www.myjoyonline.com/entertainment/feed/' },
  { name: 'Citi Newsroom', url: 'https://citinewsroom.com/category/entertainment/feed/' },
  { name: 'Graphic Showbiz', url: 'https://www.graphic.com.gh/entertainment.feed?type=rss' },
];

/** Google News search for one event (all outlets, last 21 days, Ghana edition) */
export const newsSearch = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(`"${q}" when:21d`)}&hl=en-GH&gl=GH&ceid=GH:en`;

/** Big acts from outside Ghana who often headline here (not on our artist list) */
export const VISITING_ACTS = [
  'Davido', 'Wizkid', 'Burna Boy', 'Rema', 'Asake', 'Ayra Starr', 'Tems', 'Olamide', 'Omah Lay', 'Fireboy DML', 'Tiwa Savage',
  'Kizz Daniel', 'Seyi Vibez', 'Shallipopi', 'Odumodublvck', 'Victony', 'Ruger', 'Flavour', 'Diamond Platnumz', 'Tyla',
  'Uncle Waffles', 'Black Coffee', 'Kabza De Small', 'DJ Maphorisa', 'Focalistic', 'Tyler ICU', 'Popcaan', 'Beenie Man',
  'Busy Signal', 'Vybz Kartel', 'Shenseea', 'Skillibeng', 'Spice', 'Konshens', 'Chris Brown', 'Burna', 'Wande Coal', 'Adekunle Gold',
];
