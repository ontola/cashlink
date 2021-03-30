import SDK from '@uphold/uphold-sdk-javascript';
import { Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { Token } from './token.interface';

@Injectable()
export class TokenService {
  sdk: any;
  constructor(private configService: ConfigService) {
    /** Initializes communication with Uphold API */
    const sdk = new SDK({
      // Remove this when in production
      baseUrl: 'http://api-sandbox.uphold.com',
      clientId: this.configService.get<string>('UPHOLD_CLIENT_ID'),
      clientSecret: this.configService.get<string>('UPHOLD_CLIENT_SECRET'),
    });
    this.sdk = sdk;

    sdk
      // What do I put here?
      // https://github.com/uphold/uphold-sdk-javascript/issues/53
      .authorize('code')
      .then(() => sdk.getMe())
      .then((user) => {
        console.log('sdk', user);
      });
  }

  decrypt(encryptedToken: string, jwk: string): Token {
    encryptedToken;
  }
}
