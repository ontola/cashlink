import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserDto } from '../dto/user.dto';
import { UserService } from '../service/user/user.service';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) { }

  @Post('/')
  create(@Body() user: UserDto): Promise<UserDto> {
    console.log('posting a user: ', user);
    return this.userService.create(user);
  }

  @Get('/')
  findAll(): Promise<UserDto[]> {
    return this.userService.findAll();
  }
}
