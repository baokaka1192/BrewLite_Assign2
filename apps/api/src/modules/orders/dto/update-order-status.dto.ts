import { IsIn } from 'class-validator';

/** Statuses staff can set. PAID comes from payments; CANCELLED comes from the owner's cancel endpoint. */
export const STAFF_TARGET_STATUSES = ['PREPARING', 'READY', 'COMPLETED'] as const;
export type StaffTargetStatus = (typeof STAFF_TARGET_STATUSES)[number];

export class UpdateOrderStatusDto {
  @IsIn(STAFF_TARGET_STATUSES)
  status!: StaffTargetStatus;
}
