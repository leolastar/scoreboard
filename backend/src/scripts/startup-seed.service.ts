import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StartupSeedService implements OnModuleInit {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // Wait a bit for database to be fully ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      await this.seedUsers();
    } catch (error) {
      console.error('Error during startup seeding:', error);
      // Don't fail startup if seeding fails
    }
  }

  private async seedUsers() {
    const userRepository = this.dataSource.getRepository(User);

    const testUsers = [
      { email: 'user1@test.com', password: 'password123' },
      { email: 'user2@test.com', password: 'password123' },
    ];

    for (const userData of testUsers) {
      const existingUser = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = userRepository.create({
          email: userData.email,
          password: hashedPassword,
        });
        await userRepository.save(user);
        console.log(`✓ Auto-seeded user: ${userData.email}`);
      }
    }
  }
}

