import { IsInt, Min, Max, IsString, IsNotEmpty } from 'class-validator';

export class SubmitScoreDto {
  @IsInt()
  @Min(0)
  @Max(100)
  value: number;

  @IsString()
  @IsNotEmpty()
  idempotency_key: string;
}

