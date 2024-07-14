import { createStorage } from 'unstorage'
import fsLiteDriver from 'unstorage/drivers/fs-lite'
import { DefaultEthersIndexer } from './indexer'

export * from './types'

export class EthersIndexer<NetworkName extends string, ContractName extends string> extends DefaultEthersIndexer<NetworkName, ContractName> {
  protected storage = createStorage({ driver: fsLiteDriver({ base: './tmp' }) })
}
