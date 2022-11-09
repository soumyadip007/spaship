import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { AUTH_DETAILS } from 'src/configuration';
import { ExceptionsService } from 'src/server/exceptions/exceptions.service';
import jwt_decode from 'jwt-decode';
import { IDataServices } from 'src/repository/data-services.abstract';
import { ApikeyFactory } from '../api-key/service/apikey.factory';

@Injectable()
export class AuthenticationGuard extends AuthGuard('jwt') {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dataServices: IDataServices,
    private readonly apikeyFactory: ApikeyFactory,
    private readonly exceptionsService: ExceptionsService
  ) {
    super();
  }

  /* @internal
   * Validating JWT and API Key
   * Token Format : Bearer {JWT} / Bearer {APIKey}
   * TODO : This should be imporovsed with Authorization
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    let bearerToken: string;

    try {
      bearerToken = context.getArgs()[0].headers.authorization.split(' ')[1];
    } catch (err) {
      this.exceptionsService.badRequestException({ message: 'Authentication token missing.' });
    }
    try {
      // Checking that token is JWT or API Key
      jwt_decode(bearerToken);
    } catch (err) {
      // Validating the API Key

      const { propertyIdentifier, env } = context.getArgs()[0].params;
      if (propertyIdentifier && env) {
        const hashKey = this.apikeyFactory.getHashKey(bearerToken);
        const response = (await this.dataServices.apikey.getByAny({ propertyIdentifier, env, hashKey }))[0];
        if (response) {
          const expiredDate = response.expiredDate;
          if (expiredDate && expiredDate.getTime() <= new Date().getTime())
            this.exceptionsService.badRequestException({ message: 'API Key is expired.' });
          return true;
        } else this.exceptionsService.badRequestException({ message: 'Invalid Token.' });
      }
    }
    const secret: string = this.getSecretKey();
    const options: Object = { secret, algorithms: ['RS256'] };
    let validated: boolean = false;
    try {
      // Validating the JWT Token
      validated = Boolean(this.jwtService.verify(bearerToken, options));
      if (validated) return true;
    } catch (err) {
      this.exceptionsService.UnauthorizedException(err.message);
    }
    return false;
  }

  private getSecretKey(): string {
    const publicKey = AUTH_DETAILS.pubkey;
    if (publicKey && publicKey.trim().length > 0) return this.formatAsPem(publicKey);
  }

  private formatAsPem(key: string): string {
    const keyHeader = '-----BEGIN PUBLIC KEY-----';
    const keyFooter = '-----END PUBLIC KEY-----';
    let formatKey = '';
    if (key.startsWith(keyHeader) && key.endsWith(keyFooter)) {
      return key;
    }
    if (key.split('\n').length == 1) {
      while (key.length > 0) {
        formatKey += `${key.substring(0, 64)}\n`;
        key = key.substring(64);
      }
    }
    return `${keyHeader}\n${formatKey}${keyFooter}`;
  }
}