import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Render,
  Res,
} from '@nestjs/common';
import { PaymentRequest } from '../token.interface';
import { TokenService } from '../token.service';

@Controller('token')
export class TokenController {
  constructor(private tokenService: TokenService) { }

  @Get(':token')
  @Render('token')
  getToken(@Param() params) {
    const tokenEncrypted = params.token;
    // return res.render('token', {
    //   message: 'Hello world!',
    // });
    const token = this.tokenService.decrypt(tokenEncrypted);
    // const token = this.tokenService.decrypt(tokenEncrypted);
    return {
      token,
      validity: this.tokenService.checkValidity(token),
    };
  }

  @Post(':token')
  @Render('done')
  postToken(@Param() params, @Body() paymentRequest: PaymentRequest) {
    const tokenEncrypted = params.token;
    const token = this.tokenService.decrypt(tokenEncrypted);
    // TODO: Save token to DB with timestamp, prevent re-use, send money
    return {
      token,
      validity: true,
    };
  }

  @Get()
  endpointHelp(): string {
    return 'Add a token to this URL: /token/someToken82915';
  }
}
