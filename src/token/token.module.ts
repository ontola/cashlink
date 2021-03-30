import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TokenController } from './controller/token.controller';
import { TokenService } from './token.service';

@Module({
  imports: [ConfigModule],
  controllers: [TokenController],
  providers: [TokenService],
})
export class TokenModule { }
