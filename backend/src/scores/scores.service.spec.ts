import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoresService } from './scores.service';
import { Score } from './entities/score.entity';
import { UserHighScore } from './entities/user-high-score.entity';
import { UserStats } from './entities/user-stats.entity';
import { EventsService } from '../events/events.service';

describe('ScoresService', () => {
  let service: ScoresService;
  let scoreRepository: Repository<Score>;
  let eventsService: EventsService;

  const mockScoreRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockHighScoreRepository = {
    findOne: jest.fn(),
  };

  const mockStatsRepository = {
    findOne: jest.fn(),
  };

  const mockEventsService = {
    publishScoreSubmitted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoresService,
        {
          provide: getRepositoryToken(Score),
          useValue: mockScoreRepository,
        },
        {
          provide: getRepositoryToken(UserHighScore),
          useValue: mockHighScoreRepository,
        },
        {
          provide: getRepositoryToken(UserStats),
          useValue: mockStatsRepository,
        },
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    }).compile();

    service = module.get<ScoresService>(ScoresService);
    scoreRepository = module.get<Repository<Score>>(getRepositoryToken(Score));
    eventsService = module.get<EventsService>(EventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitScore', () => {
    it('should return existing score if idempotency key exists', async () => {
      const userId = 1;
      const submitScoreDto = {
        value: 85,
        idempotency_key: 'test-key-123',
      };

      const existingScore = {
        id: 1,
        value: 85,
        idempotency_key: 'test-key-123',
      };

      mockScoreRepository.findOne.mockResolvedValue(existingScore);

      const result = await service.submitScore(userId, submitScoreDto);

      expect(result).toEqual({
        id: 1,
        value: 85,
        message: 'Score already submitted',
      });
      expect(mockScoreRepository.save).not.toHaveBeenCalled();
      expect(mockEventsService.publishScoreSubmitted).not.toHaveBeenCalled();
    });

    it('should create new score and publish event if idempotency key is new', async () => {
      const userId = 1;
      const submitScoreDto = {
        value: 90,
        idempotency_key: 'new-key-456',
      };

      mockScoreRepository.findOne.mockResolvedValue(null);
      mockScoreRepository.create.mockReturnValue({
        user_id: userId,
        value: 90,
        idempotency_key: 'new-key-456',
      });
      mockScoreRepository.save.mockResolvedValue({
        id: 2,
        user_id: userId,
        value: 90,
        idempotency_key: 'new-key-456',
      });

      const result = await service.submitScore(userId, submitScoreDto);

      expect(result).toEqual({
        id: 2,
        value: 90,
        message: 'Score submitted successfully',
      });
      expect(mockScoreRepository.save).toHaveBeenCalled();
      expect(mockEventsService.publishScoreSubmitted).toHaveBeenCalledWith({
        scoreId: 2,
        userId: 1,
        value: 90,
      });
    });
  });
});

