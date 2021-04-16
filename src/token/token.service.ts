import SDK from '@uphold/uphold-sdk-javascript';
import { HttpException, Injectable } from '@nestjs/common';
import fetch from 'node-fetch';

import { ConfigService } from '@nestjs/config';
import { Token } from './token.interface';
import jose from 'node-jose';

const UPHOLD_SANDBOX_URL = 'https://api-sandbox.uphold.com';

@Injectable()
export class TokenService {
  /** Authorized Uphold SDK instance for communicating with the API */
  sdk: any;
  /** JOSE Key Store for storing cryptographic keys */
  keystore: any;
  /** Uphold Access token */
  token: string;

  constructor(private configService: ConfigService) {
    (async () => {
      console.log('Initializing TokenService...');

      const clientId = this.configService.get<string>('UPHOLD_CLIENT_ID');
      const clientSecret = this.configService.get<string>(
        'UPHOLD_CLIENT_SECRET',
      );
      /** Initializes communication with Uphold API */
      const sdk = new SDK({
        // Remove this when in production
        baseUrl: UPHOLD_SANDBOX_URL,
        clientId,
        clientSecret,
      });
      this.sdk = sdk;
      // this.keystore = jose.JWK.createKeyStore();

      console.log('Starting Uphold Auth ...');

      // Client credentials flow
      // https://uphold.com/en/developer/api/documentation/#client-credentials-flow
      const authResp = await fetch(`${UPHOLD_SANDBOX_URL}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' +
            Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
        }),
      });

      const tokenObject = JSON.parse(await authResp.text());

      if (!tokenObject.access_token) {
        throw 'no access Token';
      }
      this.token = tokenObject.access_token;
      console.log('Got Uphold Access token...');

      this.listAccounts();

      // Next, get an Authorization code using the access_token

      // sdk
      //   // What do I put here?
      //   // https://github.com/uphold/uphold-sdk-javascript/issues/53
      //   .authorize(tokenObject.access_token);
      // .then(() => sdk.getMe())
      // .then((user) => {
      //   console.log('sdk', user);
      // });
    })();
  }

  checkValidity(token: Token): boolean {
    return false;
  }

  /** Encrypts a token, returns a base64 string */
  encrypt(token: Token): string {
    // Currently doesn't actually encrypt
    const key = Buffer.from(JSON.stringify(token)).toString('base64');
    return key;
    // const key = this.keystore.get();
    // return jose.JWE.createEncrypt(key)
    //   .update(JSON.stringify(token))
    //   .final()
    //   .then(function (result) {
    //     const output: string = jose.util.base64url.encode(result, 'utf8');
    //     return output;
    //     // {result} is a JSON Object -- JWE using the JSON General Serialization
    //     // Might need this: https://github.com/cisco/node-jose#uri-safe-base64
    //   });
  }

  decrypt(encryptedToken: string): Token {
    let decoded: Token = null;
    try {
      decoded = JSON.parse(Buffer.from(encryptedToken, 'base64').toString());
    } catch (e) {
      throw new HttpException(`Invalid token.${e.message}`, 500);
    }
    return {
      amount: decoded.amount,
      id: decoded.id,
    };
  }

  /** Get an Uphold API path, starting from https://api.uphold.com/v0/*/
  async getPath(path: string) {
    const resp = await fetch(`${UPHOLD_SANDBOX_URL}/v0/${path}`, {
      headers: {
        Authorization: 'Bearer ' + this.token,
      },
    });
    return resp.text();
  }

  async listAccounts() {
    const resp = await this.getPath('me/accounts ');
    console.log(`Accounts:`, resp);
  }
}
