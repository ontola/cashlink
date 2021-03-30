import { Controller, Get, Param } from '@nestjs/common';

@Controller('token')
export class TokenController {
  @Get(':token')
  getToken(@Param() params): string {
    const token = params.token;
    return `token for ${token}`;
  }

  @Get()
  endpointHelp(): string {
    return 'Add a token to this URL: /token/someToken82915';
  }
}
