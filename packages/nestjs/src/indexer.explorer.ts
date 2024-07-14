/* eslint-disable ts/no-unsafe-function-type */
import type {
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common'
import { Inject, Injectable } from '@nestjs/common'
import type { EthersIndexer } from 'ethers-indexer'
import type { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core'
import type { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper'
import { ETHERS_INDEXER_INSTANCES, ETHERS_INDEXER_TASK_ARGS, ETHERS_INDEXER_TASK_NAME } from './indexer.constants'

@Injectable()
export class EtherIndexerExplorer
implements OnApplicationBootstrap, OnApplicationShutdown {
  constructor(
    @Inject(ETHERS_INDEXER_INSTANCES)
    private readonly indexer: EthersIndexer<string, string>,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  explore() {
    const instanceWrappers: InstanceWrapper[] = [
      ...this.discoveryService.getControllers(),
      ...this.discoveryService.getProviders(),
    ]
    instanceWrappers.forEach((wrapper: InstanceWrapper) => {
      const { instance } = wrapper

      if (!instance || !Object.getPrototypeOf(instance)) {
        return
      }

      const processMethod = (name: string) =>
        wrapper.isDependencyTreeStatic() && this.lookupSchedulers(instance, name)

      // TODO(v4): remove this after dropping support for nestjs v9.3.2
      if (!Reflect.has(this.metadataScanner, 'getAllMethodNames')) {
        this.metadataScanner.scanFromPrototype(
          instance,
          Object.getPrototypeOf(instance),
          processMethod,
        )
        return
      }

      this.metadataScanner
        .getAllMethodNames(Object.getPrototypeOf(instance))
        .forEach(processMethod)
    })
  }

  lookupSchedulers(instance: Record<string, Function>, key: string) {
    const name = this.reflector.get(ETHERS_INDEXER_TASK_NAME, instance[key])
    const args = this.reflector.get(ETHERS_INDEXER_TASK_ARGS, instance[key])
    ;(this.indexer.task as Function)(name, ...args)
  }

  onApplicationBootstrap() {
    this.explore()
    this.indexer.start()
  }

  onApplicationShutdown() {
    this.indexer.stop()
  }
}
