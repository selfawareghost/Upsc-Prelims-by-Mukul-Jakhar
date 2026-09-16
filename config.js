/* ==========================================================================
   SITE CONFIG — the single place that defines the structure of the site.
   When a note, paper or current-affairs file is added, flip its `ready` flag
   (or `q` / `key` for papers) to true here.
   ========================================================================== */
window.SITE = {
  owner: 'Mukul Jakhar',
  siteName: 'Prelims Notebook',

  /* ---------------------------------------------------------------- Subjects
     Topic id + section id + subject id form the note file path:
     data/notes/<subject>/<section>/<topic>.js                                */
  subjects: [
    {
      id: 'history', name: 'History',
      blurb: 'History of India and the Indian National Movement, from prehistory to 1947.',
      sections: []
    },
    {
      id: 'polity', name: 'Polity and Constitution',
      blurb: 'Constitution, political system, Panchayati Raj, public policy and rights issues.',
      sections: []
    },
    {
      id: 'geography', name: 'Geography',
      blurb: 'Physical, social and economic geography of India and the world.',
      sections: []
    },
    {
      id: 'economy', name: 'Economy and Social Development',
      blurb: 'Indian economy with sustainable development, poverty, inclusion, demographics and social sector initiatives.',
      sections: []
    },
    {
      id: 'environment', name: 'Environment and Ecology',
      blurb: 'Environmental ecology, biodiversity and climate change.',
      sections: []
    },
    {
      id: 'general-science', name: 'General Science',
      blurb: 'Physics, chemistry and biology at the level of everyday life and the human body.',
      sections: []
    },
    {
      id: 'science', name: 'Science and Technology',
      blurb: 'Developments in space, defence, biotechnology, computing and energy.',
      sections: []
    },
    {
      id: 'international', name: 'International Relations',
      blurb: 'India’s neighbourhood, global partnerships, organisations and groupings.',
      sections: []
    }
  ],

  /* ------------------------------------------------------ Current affairs
     File: data/current-affairs/<id>.js . `subject` links a category to its
     subject page so it also shows there.                                   */
  caCategories: [
    { id: 'history', name: 'History, Art and Culture', subject: 'history' },
    { id: 'polity', name: 'Polity and Governance', subject: 'polity' },
    { id: 'geography', name: 'Geography', subject: 'geography' },
    { id: 'economy', name: 'Economy and Social Development', subject: 'economy' },
    { id: 'environment', name: 'Environment and Ecology', subject: 'environment' },
    { id: 'general-science', name: 'General Science', subject: 'general-science' },
    { id: 'science', name: 'Science and Technology', subject: 'science' },
    { id: 'international', name: 'International Relations', subject: 'international' },
    { id: 'reports-indices', name: 'Reports and Indices' }
  ],

  /* ------------------------------------------------------- Previous papers
     Each paper has data/papers/<id>.js (answer key + page map) and page images
     in data/papers/img/<id>/.                                                 */
  papers: [
    { id: '2026', year: 2026, ready: true, provisional: true },
    { id: '2025', year: 2025, ready: true },
    { id: '2024', year: 2024, ready: true },
    { id: '2023', year: 2023, ready: true },
    { id: '2022', year: 2022, ready: true },
    { id: '2021', year: 2021, ready: true },
    { id: '2020', year: 2020, ready: true },
    { id: '2019', year: 2019, ready: true },
    { id: '2018', year: 2018, ready: true },
    { id: '2017', year: 2017, ready: true },
    { id: '2016', year: 2016, ready: true },
    { id: '2015', year: 2015, ready: true },
    { id: '2014', year: 2014, ready: true },
    { id: '2013', year: 2013, ready: true },
    { id: '2012', year: 2012, ready: true },
    { id: '2011', year: 2011, ready: true }
  ]
};
