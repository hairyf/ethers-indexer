import type { Block, EventLog, Interface, InterfaceAbi, TransactionResponse } from 'ethers'
import { Contract, JsonRpcProvider } from 'ethers'
import type { Storage } from 'unstorage'
import { createStorage } from 'unstorage'
import { arange } from './utils'
import type {
  EthersIndexerOptions,
  IndexerContext,
  IndexerContract,
  IndexerNetwork,
  IndexerTask,
} from './types'

export class DefaultEthersIndexer<NetworkName extends string, ContractName extends string> {
  protected storage: Storage = createStorage<any>()
  private loop: number | string
  private step: number
  private networks: IndexerNetwork<NetworkName>[]
  private contracts: IndexerContract<string, ContractName>[]
  private running: boolean = false
  private timeout: number

  private tasks: Record<string, any[]> = {}

  constructor(config?: EthersIndexerOptions<NetworkName, ContractName>) {
    this.storage = config?.storage || this.storage
    this.loop = config?.loop || 3000
    this.step = config?.step || 10
    this.networks = config?.networks || []
    this.contracts = config?.contracts || []
    this.timeout = config?.timeout || 1800000
  }

  task: IndexerTask<NetworkName, ContractName> = (name: string, ...args: any[]) => {
    const [filterOrAction, maybeAction] = args
    const isArgs0Action = typeof filterOrAction === 'function'
    const isARgs0Filter = typeof filterOrAction === 'object'
    const task = {
      fn: isArgs0Action ? filterOrAction : maybeAction,
      ...(isARgs0Filter ? filterOrAction : {}),
    }
    name = task.method ? `${name}:${task.method}` : name
    name = task.args ? `${name}:${task.args.filter((a: any) => a || 'undefined')}` : name
    this.tasks[name] = this.tasks[name] || []
    this.tasks[name].push(task)

    return () => {
    }
  }

  start = async () => {
    this.running = true
    const processes = this.networks.map(this.startNetworkTasks)
    await Promise.all(processes)
  }

  stop = () => {
    this.running = false
  }

  private startNetworkTasks = async (network: IndexerNetwork<NetworkName>) => {
    const provider = new JsonRpcProvider(network.rpc)
    const context: IndexerContext = { name: network.name, provider }
    const storeKey = `height:${network.name}`

    let locked = false
    const step = network.step || this.step
    const loop = network.loop || this.loop
    const getIndexerLastBlock = async () => {
      return await this.storage.getItem<number>(storeKey) || network.height || 0
    }
    const process = async () => {
      if (!this.exists(context.name) || locked)
        return

      locked = true

      const [startBlockNumber, lastBlockNumber] = await Promise.all([
        getIndexerLastBlock(),
        provider.getBlockNumber(),
      ])
      const endBlockNumber = Math.min(startBlockNumber + step - 1, lastBlockNumber)

      if (startBlockNumber > endBlockNumber) {
        locked = false
        return
      }

      await this.processBlocks(startBlockNumber, endBlockNumber, context)
      await this.storage.setItem(storeKey, endBlockNumber + 1)
    }
    const execute = () => {
      if (locked)
        return

      const timer = setTimeout(() => {
        console.warn(`[timeout] - ${context.name} has exceeded the timeout for indexing ${this.timeout}ms`)
        finish()
      }, this.timeout)
      process().finally(finish)

      function finish() {
        clearTimeout(timer)
        locked = false
      }
    }

    if (typeof loop === 'number') {
      const timer = setInterval(
        () => this.running
          ? execute()
          : clearInterval(timer),
        loop,
      )
    }
    else {
      // TODO
    }
  }

  private processBlocks = async (start: number, end: number, context: IndexerContext) => {
    const existsTransaction = this.exists(context.name, 'transaction')
    const existsBlock = this.exists(context.name, 'block')
    const existsEvent = this.exists(context.name, 'contract')

    if (existsTransaction || existsBlock)
      await this.processBlocksAndTransactions(start, end, context, existsTransaction)
    if (existsEvent)
      await this.processEvents(start, end, context)
  }

  private processBlocksAndTransactions = async (
    start: number,
    end: number,
    context: IndexerContext,
    transaction: boolean,
  ) => {
    const executeTransactions = async (block: Block) => {
      const transactionsProcesses = block.transactions.map(async (hash) => {
        const transaction = await context.provider.getTransaction(hash)
        if (!transaction)
          return
        this.execute(`${context.name}:transaction`, block, transaction)
        return transaction
      })
      const transactions = await Promise.all(transactionsProcesses).then(txs => txs.filter(Boolean) as TransactionResponse[])
      this.execute(`${context.name}:transactions`, block, transactions)
    }

    const executeBlock = async (number: number) => {
      const block = await context.provider.getBlock(number)
      if (!block)
        return
      this.execute(`${context.name}:block`, block, context)
      if (!transaction)
        return block
      await executeTransactions(block)
      return block
    }

    const processes = arange(start, end).map(executeBlock)
    const blocks = await Promise.all(processes).then(bs => bs.filter(Boolean) as Block[])
    this.execute(`${context.name}:blocks`, blocks)
  }

  private processEvents = async (start: number, end: number, context: IndexerContext) => {
    const executeEvents = async (contract: Contract, config: any) => {
      const name = config.args ? contract.filters[config.method](...config.args) : config.method
      const logs = await contract.queryFilter(name, start, end)
      const suffix = config.args ? `${config.args?.map((a: any) => a || 'undefined').join('.')}` : ''
      const eventsId = [context.name, 'contract', config.name, 'events', config.method, suffix].filter(Boolean)
      const eventId = [context.name, 'contract', config.name, 'event', config.method, suffix].filter(Boolean)
      for (const log of logs)
        this.execute(eventId.join(':'), log, context)
      this.execute(eventsId.join(':'), logs, context)
    }

    const events = Object.keys(this.tasks)
      .filter(name => name.startsWith(`${context.name}:contract`))
      .map((name) => {
        const [_1, _2, contract] = name.split(':')
        return { id: name, contract }
      })
      .flatMap(opts => this.tasks[opts.id].map(task => Object.assign(task, opts)))

    for (const { contract: name, method, args } of events) {
      const config = this.contracts.find(c => c.name === name)
      if (!config?.address || !config?.abi)
        continue
      const contract = new Contract(config.address, config.abi, context.provider)
      await executeEvents(contract, { name, method, args })
    }
  }

  private execute = async (name: string, ...args: any[]) => {
    if (!this.tasks[name])
      return

    await Promise.all(this.tasks[name].map(({ fn }) => fn(...args)))
  }

  private exists = (name: string, type?: string) => {
    return Object.keys(this.tasks)
      .filter(_name => _name.startsWith([name, type].filter(Boolean).join(':'))).length > 0
  }
}
