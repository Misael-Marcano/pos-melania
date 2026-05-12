import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  { ignores: ['vitest.config.ts'] },
  ...nextCoreWebVitals,
  {
    rules: {
      // eslint-plugin-react-hooks v7 flags common valid patterns (sessionStorage, Portal mount, derived reset).
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
    },
  },
];

export default eslintConfig;
