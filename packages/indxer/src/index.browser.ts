import { createStorage } from 'unstorage'
import localStorageDriver from 'unstorage/drivers/localstorage'
import { DefaultEthersIndexer } from './indexer'

export * from './types'

export class EthersIndexer<NetworkName extends string, ContractName extends string> extends DefaultEthersIndexer<NetworkName, ContractName> {
  protected storage = createStorage({ driver: localStorageDriver({ base: 'app:' }) })
}
