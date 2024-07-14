import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    { input: 'src/index.browser', format: 'esm' },
  ],
  declaration: true,
  clean: true,
  rollup: { emitCJS: true },
})
