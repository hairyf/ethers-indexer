import { SetMetadata, applyDecorators } from '@nestjs/common'
import type { EthersIndexer, IndexerTask } from 'ethers-indexer'

import { ETHERS_INDEXER_TASK_ARGS, ETHERS_INDEXER_TASK_NAME } from '../indexer.constants'

type NetworkNames<T> = T extends EthersIndexer<infer V, string> ? V : string
type ContractNames<T> = T extends EthersIndexer<string, infer V> ? V : string

type ApplyIndexerTaskDecorator = IndexerTask<
  NetworkNames<typeof import('../indexer.instance')['default']>,
  ContractNames<typeof import('../indexer.instance')['default']>,
  MethodDecorator
>

export const Task: ApplyIndexerTaskDecorator = (name, ...args: any[]) => {
  return applyDecorators(
    SetMetadata(ETHERS_INDEXER_TASK_ARGS, args),
    SetMetadata(ETHERS_INDEXER_TASK_NAME, name),
  )
}
