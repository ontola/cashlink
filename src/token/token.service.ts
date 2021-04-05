import SDK from '@uphold/uphold-sdk-javascript';
import { Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { Token } from './token.interface';
import jose from 'node-jose';

@Injectable()
export class TokenService {
  /** Authorized Uphold SDK instance for communicating with the API */
  sdk: any;
  /** JOSE Key Store for storing cryptographic keys */
  keystore: any;

  constructor(private configService: ConfigService) {
    /** Initializes communication with Uphold API */
    const sdk = new SDK({
      // Remove this when in production
      baseUrl: 'http://api-sandbox.uphold.com',
      clientId: this.configService.get<string>('UPHOLD_CLIENT_ID'),
      clientSecret: this.configService.get<string>('UPHOLD_CLIENT_SECRET'),
    });
    this.sdk = sdk;
    this.keystore = jose.JWK.createKeyStore();

    sdk
      // What do I put here?
      // https://github.com/uphold/uphold-sdk-javascript/issues/53
      .authorize('code')
      .then(() => sdk.getMe())
      .then((user) => {
        console.log('sdk', user);
      });
  }

  /** Encrypts a token, returns a base64 string */
  encrypt(token: Token): Promise<string> {
    const key = this.keystore.get();
    return jose.JWE.createEncrypt(key)
      .update(JSON.stringify(token))
      .final()
      .then(function (result) {
        const output: string = jose.util.base64url.encode(result, 'utf8');
        return output;
        // {result} is a JSON Object -- JWE using the JSON General Serialization
        // Might need this: https://github.com/cisco/node-jose#uri-safe-base64
      });
  }

  decrypt(encryptedToken: string, jwk: string): Token {
    encryptedToken;
  }
}
