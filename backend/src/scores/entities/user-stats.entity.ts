import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_stats')
export class UserStats {
  @PrimaryColumn()
  user_id: number;

  @Column({ type: 'int', default: 0 })
  total_scores: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  average: number;

  @UpdateDateColumn()
  updated_at: Date;
}

