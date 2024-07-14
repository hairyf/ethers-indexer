/* eslint-disable unicorn/prefer-node-protocol */
import fs from 'fs'
import { resolve } from 'path'
import type { DynamicModule } from '@nestjs/common'
import { EthersIndexer, type EthersIndexerOptions } from 'ethers-indexer'
import { EtherIndexerExplorer } from './indexer.explorer'
import { ETHERS_INDEXER_INSTANCES } from './indexer.constants'

export class EtherIndexerModule {
  static forRoot<NetworkName extends string, ContractName extends string>(options: EthersIndexerOptions<NetworkName, ContractName>): DynamicModule {
    const indexer = new EthersIndexer(options)
    const typeFileRows = [
      `import { EthersIndexer } from 'ethers-indexer'`,
      '\n\n',
      `export default new EthersIndexer(${JSON.stringify(options)})`,
    ]
    fs.writeFileSync(
      resolve(__dirname, 'indexer.instance.ts'),
      typeFileRows.join(''),
    )
    return {
      global: true,
      module: EtherIndexerModule,
      providers: [
        EtherIndexerExplorer,
        {
          provide: ETHERS_INDEXER_INSTANCES,
          useValue: indexer,
        },
      ],
    }
  }
}
