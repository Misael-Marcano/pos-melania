/** Antes de cargar `app` — evita Morgan y otros efectos de desarrollo en tests */
process.env.NODE_ENV = 'test';
