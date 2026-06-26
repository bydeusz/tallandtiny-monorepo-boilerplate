import { defineConfig } from 'orval';

export default defineConfig({
  tallandtiny: {
    input: {
      target: 'http://localhost:3001/api/docs-json',
    },
    output: {
      mode: 'tags-split',
      target: './src/generated/endpoints',
      schemas: './src/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      prettier: true,
      override: {
        mutator: {
          path: './src/mutator/custom-axios.ts',
          name: 'customAxios',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
