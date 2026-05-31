import { AbstractRepository } from "@app/common";
import { Injectable, Logger } from "@nestjs/common";
import { Reservation } from "./models/reservation.entity";
import { EntityManager, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class ReservationsRepository extends AbstractRepository<Reservation> {
  protected logger: Logger = new Logger(ReservationsRepository.name);

  constructor(
    @InjectRepository(Reservation) reservationRepository: Repository<Reservation>,
    entityManager: EntityManager
  ) {
    super(reservationRepository, entityManager);
  }

}