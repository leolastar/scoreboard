import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

export async function autoSeed(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);

  // Create test users
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

