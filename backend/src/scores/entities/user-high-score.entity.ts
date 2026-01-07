import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_high_scores')
export class UserHighScore {
  @PrimaryColumn()
  user_id: number;

  @Column({ type: 'int' })
  value: number;

  @UpdateDateColumn()
  updated_at: Date;
}

