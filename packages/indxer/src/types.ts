import type { Block, EventLog, Interface, InterfaceAbi, JsonRpcProvider, TransactionResponse } from 'ethers'
import type { Storage } from 'unstorage'

export interface IndexerContext {
  provider: JsonRpcProvider
  name: string
}

export interface IndexerActions {
  blocks: (blocks: Block[], context: IndexerContext) => void
  block: (block: Block, context: IndexerContext) => void

  transactions: (block: Block, transactions: TransactionResponse[], context: IndexerContext) => void
  transaction: (block: Block, transaction: TransactionResponse, context: IndexerContext) => void

  events: (events: EventLog[], context: IndexerContext) => void
  event: (event: EventLog, context: IndexerContext) => void
}

export interface IndexerContract<NetworkName extends string, ContractName extends string> {
  /**
   * Contract name
   */
  name: ContractName
  /**
   * Corresponding network
   */
  network: NetworkName
  /**
   * Contract address
   */
  address: string
  /**
   * Contract interface
   */
  abi: Interface | InterfaceAbi

}

export interface IndexerNetwork<Name extends string> {
  /**
   * Query identifier name
   */
  name: Name
  /**
   * Querying RPC
   */
  rpc: string
  /**
   * Initial query height
   *
   * @default 0
   */
  height?: number
  /**
   * Loop is a special attribute that can be either a number or a string
   * When it is a number, it will loop using an interval
   * When it is a corn string, it will loop using corn
   *
   * @default 3000
   */
  loop?: number
  /**
   * Number of blocks queried each time
   *
   * @default 10
   */
  step?: number
}

export interface IndexerContractFilter {
  method: string
  args?: any[]
}

export interface EthersIndexerOptions<NetworkName extends string, ContractName extends string> {
  /**
   * storage of index height
   */
  storage?: Storage
  /**
   * Loop is a special attribute that can be either a number or a string
   * When it is a number, it will loop using an interval
   * When it is a corn string, it will loop using corn
   *
   * @default 3000
   */
  loop?: number | string
  /**
   * Number of blocks queried each time
   *
   * @default 10
   */
  step?: number

  /**
   * The queried contracts
   */
  contracts?: IndexerContract<NetworkName, ContractName>[]

  /**
   * The queried networks
   */
  networks: IndexerNetwork<NetworkName>[]

  timeout?: number
}

export interface IndexerTask<NetworkName extends string, ContractName extends string, Returns = void> {
  (name: `${NetworkName}:blocks`, action: IndexerActions['blocks']): Returns
  (name: `${NetworkName}:block`, action: IndexerActions['block']): Returns
  (name: `${NetworkName}:transactions`, action: IndexerActions['transactions']): Returns
  (name: `${NetworkName}:transaction`, action: IndexerActions['transaction']): Returns
  (name: `${NetworkName}:contract:${ContractName}:events`, filter: IndexerContractFilter, args: any[], action: IndexerActions['events']): Returns
  (name: `${NetworkName}:contract:${ContractName}:event`, filter: IndexerContractFilter, args: any[], action: IndexerActions['event']): Returns
  (name: `${NetworkName}:contract:${ContractName}:events`, filter: IndexerContractFilter, action: IndexerActions['events']): Returns
  (name: `${NetworkName}:contract:${ContractName}:event`, filter: IndexerContractFilter, action: IndexerActions['event']): Returns
}
