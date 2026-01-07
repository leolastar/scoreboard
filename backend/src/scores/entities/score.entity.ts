import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('scores')
@Index(['idempotency_key'], { unique: true })
export class Score {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  value: number;

  @Column({ unique: true })
  idempotency_key: string;

  @CreateDateColumn()
  created_at: Date;
}

