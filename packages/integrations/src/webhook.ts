/**
 * File: packages/integrations/src/webhook.ts
 * Purpose: Verifies HMAC-SHA256 webhook signatures through secret references without persisting webhook secrets.
 * Author: Raushan Raj
 */
import { createHmac,timingSafeEqual } from 'node:crypto';
import type { WebhookVerifier,WebhookVerificationRequest,WebhookVerificationResult } from '../../contracts/src/integration';
import type { SecretResolverRegistry } from '../../security/src/secrets';
export class HmacSha256WebhookVerifier implements WebhookVerifier{
  constructor(private readonly secrets:SecretResolverRegistry,private readonly prefix='sha256='){}
  async verify(request:WebhookVerificationRequest):Promise<WebhookVerificationResult>{if(!request.signature)return{valid:false,algorithm:'hmac-sha256',reason:'signature missing'};const secret=await this.secrets.resolve(request.secret);const body=typeof request.body==='string'?Buffer.from(request.body):Buffer.from(request.body);const expected=`${this.prefix}${createHmac('sha256',secret).update(body).digest('hex')}`;const actual=request.signature.trim();const valid=Buffer.byteLength(expected)===Buffer.byteLength(actual)&&timingSafeEqual(Buffer.from(expected),Buffer.from(actual));return{valid,algorithm:'hmac-sha256',reason:valid?undefined:'signature mismatch'};}
}
