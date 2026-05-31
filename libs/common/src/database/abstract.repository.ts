
import { EntityManager, FindOptionsRelations, FindOptionsWhere, QueryDeepPartialEntity, Repository } from "typeorm";
import { AbstractEntity } from "./abstract.entity";
import { Logger, NotFoundException } from "@nestjs/common";

export abstract class AbstractRepository<T extends AbstractEntity<T>> {
  protected abstract readonly logger: Logger; 

  constructor(
    private readonly entityRepository: Repository<T>,
    private readonly entityManager: EntityManager
  ) {}
  
  async create(entity: T): Promise<T> {
    return this.entityManager.save(entity);
  }

  async findOne(where: FindOptionsWhere<T>, relations?: FindOptionsRelations<T>): Promise<T> {
    const entity = await this.entityRepository.findOne({ where, relations });

    if (!entity) {
      this.logger.warn(`Entity not found with where: ${JSON.stringify(where)}`);
      throw new NotFoundException(`Entity not found`);
    }

    return entity;
  }

  async findOneAndUpdate(where: FindOptionsWhere<T>, partialEntity: QueryDeepPartialEntity<T>): Promise<T> {
     const updateResult = await this.entityRepository.update(where, partialEntity);

    if (!updateResult.affected) {
      this.logger.warn(`Entity not found for update with where: ${JSON.stringify(where)}`);
      throw new NotFoundException(`Entity not found`);
    }

    return this.findOne(where);
  }

  async find(where?: FindOptionsWhere<T>): Promise<T[]> {
    return this.entityRepository.find({ where });
  }

  async findOneAndDelete(where: FindOptionsWhere<T>): Promise<T> {
    const entity = await this.findOne(where);
    await this.entityRepository.delete(where);
    return entity;
  }
}