import { HttpException, Injectable } from '@nestjs/common';
import fetch from 'node-fetch';
import { JWK, JWE, util } from 'node-jose';

import { ConfigService } from '@nestjs/config';
import { Token } from './token.interface';
import { assert } from 'console';

const UPHOLD_SANDBOX_URL = 'https://api-sandbox.uphold.com';

@Injectable()
export class TokenService {
  /** Authorized Uphold SDK instance for communicating with the API */
  sdk: any;
  /** JOSE Key Store for storing cryptographic keys */
  keystore: JWK.KeyStore;
  /** Uphold Access token */
  accessToken: string;
  /** Uphold Card ID, e.g. bc9b3911-4bc1-4c6d-ac05-0ae87dcfc9b3 */
  cardID: string;
  /** PaymentPointer for receiving funds */
  paymentPointer: string;
  /** The key used for encrypting and decrypting the Commits */
  key: JWK.Key;

  constructor(private configService: ConfigService) {
    (async () => {
      this.keystore = JWK.createKeyStore();
      const newKey = await this.keystore.generate('oct', 256);
      console.log('Adding key ...', newKey);
      this.key = newKey;
      this.keystore.add(newKey);
      const jsonKey = this.key.toJSON(true);
      console.log('new Key:', jsonKey);
      const exampleToken: Token = {
        amount: 1125412,
        id: 'yolo',
      };
      const encryptedToken = await this.encrypt(exampleToken);
      const decryptedToken = await this.decrypt(encryptedToken);
      assert(JSON.stringify(exampleToken) == JSON.stringify(decryptedToken));
      console.log(
        `===== open this link in your browser!! ===== \n http://localhost:3000/token/${encryptedToken}`,
      );
      await this.initUphold();
    })();
  }

  checkValidity(token: Token): boolean {
    // TODO: query database, see if ID has been used
    return false;
  }

  /** Encrypts a Token, returns a base64 encrypted string */
  async encrypt(token: Token): Promise<string> {
    return await JWE.createEncrypt(this.key)
      .update(JSON.stringify(token))
      .final()
      .then(function (result) {
        const buffer = Buffer.from(JSON.stringify(result));
        const base64: string = util.base64url.encode(buffer);
        return base64;
      });
  }

  async decrypt(encryptedTokenString: string): Promise<Token> {
    try {
      const buffer = util.base64url.decode(encryptedTokenString);
      const encryptedToken = JSON.parse(buffer.toString());
      return await JWE.createDecrypt(this.key)
        .decrypt(encryptedToken)
        .then((result) => {
          const buffer = result.payload as any;
          const object = JSON.parse(buffer);
          if (object.amount == undefined) {
            throw new Error('Amount is undefined');
          }
          if (object.id == undefined) {
            throw new Error('Id is undefined');
          }
          return {
            amount: object.amount,
            id: object.id,
          };
        });
    } catch (e) {
      throw new HttpException(`Invalid token. ${e.message}`, 500);
    }
  }

  /** Create a payment pointer for a Card. Can only be done once per Card. */
  async generatePaymentPointerForCard(cardID: string): Promise<string> {
    const resp = await fetch(
      `${UPHOLD_SANDBOX_URL}/v0/me/cards/${this.cardID}/addresses`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.accessToken,
        },
        body: JSON.stringify({
          network: 'interledger',
        }),
      },
    );
    const body = await resp.text();
    const pointer = body.id;
    if (pointer == undefined) {
      throw new Error(
        'No payment pointer set. Maybe one already exists?' + body,
      );
    }
    return pointer;
  }

  async initUphold(): Promise<void> {
    const clientId = this.configService.get<string>('UPHOLD_CLIENT_ID');
    const clientSecret = this.configService.get<string>('UPHOLD_CLIENT_SECRET');
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
      throw new Error('No access token');
    }
    this.accessToken = tokenObject.access_token;

    const cards = await this.listCards();
    if (cards.length == 0) {
      throw new Error(
        'No Uphold Card ID found. The Uphold account appears to be empty. Please add an account',
      );
    }
    // TODO: pick the right card, instead of the first one
    this.cardID = await this.getTheRightCard();
  }

  /** Gets the card ID with the highest available funds */
  async getTheRightCard(): Promise<string> {
    const cards = await this.listCards();
    if (cards.length == 0) {
      throw new Error(
        'No Uphold Card ID found. The Uphold account appears to be empty. Please add an account',
      );
    }
    cards.sort((a, b) => b.available - a.available);
    return cards[0].id;
  }

  /** Get an Uphold API path, starting from https://api.uphold.com/v0/*/
  async getPath(path: string): Promise<string> {
    const resp = await fetch(`${UPHOLD_SANDBOX_URL}/v0/${path}`, {
      headers: {
        Authorization: 'Bearer ' + this.accessToken,
      },
    });
    return resp.text();
  }

  async getPaymentPointer(cardID: string): Promise<string> {
    const addresses: any = await this.listAddresses(cardID);
    const ppAddresses: any = [];
    addresses.map((addr) => {
      if (addr.type == 'interledger') {
        ppAddresses.push(addr);
      }
    });
    if (ppAddresses > 1) {
      throw new Error(
        'More than one Payment Pointer address for this card, how can this be?',
      );
    }
    if (ppAddresses < 1) {
      ppAddresses.push(await this.generatePaymentPointerForCard(cardID));
    }
    return ppAddresses[0].formats[0].value;
  }

  async listCards(): Promise<any[]> {
    const resp = await this.getPath('me/cards');
    const accounts: any[] = JSON.parse(resp);
    return accounts;
  }

  async listAddresses(cardID: string): Promise<any[]> {
    const resp = await this.getPath(`me/cards/${cardID}/addresses`);
    const addresses = JSON.parse(resp);
    return addresses;
  }

  async pay(amountEUR: number, pointer: string) {
    const resp = await fetch(
      `${UPHOLD_SANDBOX_URL}/v0/me/cards/${this.cardID}/transactions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.accessToken,
        },
        body: JSON.stringify({
          denomination: {
            amount: amountEUR,
            currency: 'EUR',
          },
          destination: pointer,
        }),
      },
    );
    console.log('pay', await resp.text());
  }
}
