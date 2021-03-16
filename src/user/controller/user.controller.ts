import { Controller, Get, Post } from '@nestjs/common';

@Controller('users')
export class UserController {
  @Post()
  create(): string {
    return 'Adds a new user';
  }

  @Get()
  findALl(): string {
    return 'Returns all users';
  }
}
