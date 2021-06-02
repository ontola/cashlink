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
  async getToken(@Param() params) {
    const tokenEncrypted = params.token;
    // return res.render('token', {
    //   message: 'Hello world!',
    // });
    const token = await this.tokenService.decrypt(tokenEncrypted);
    // const token = this.tokenService.decrypt(tokenEncrypted);
    return {
      token,
      validity: this.tokenService.checkValidity(token),
    };
  }

  @Post(':token')
  @Render('done')
  async postToken(@Param() params, @Body() paymentRequest: PaymentRequest) {
    const tokenEncrypted = params.token;
    const token = await this.tokenService.decrypt(tokenEncrypted);
    // TODO: Save token to DB with timestamp, prevent re-use, send money
    // send payment
    const payed = await this.tokenService.pay(
      token.amount,
      paymentRequest.pointer,
    );
    console.log('payed', payed);
    // save to DB
    return {
      pointer: paymentRequest.pointer,
      token,
      validity: true,
    };
  }

  @Get()
  endpointHelp(): string {
    return 'Add a token to this URL: /token/someToken82915';
  }
}
