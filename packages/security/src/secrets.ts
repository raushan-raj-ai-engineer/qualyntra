/**
 * File: packages/security/src/secrets.ts
 * Purpose: Resolves secret references through pluggable providers without persisting raw secret values in platform contracts.
 * Author: Raushan Raj
 */
import type { SecretReference,SecretResolver } from '../../contracts/src/governance';

export class SecretResolverRegistry{
  private readonly resolvers=new Map<string,SecretResolver>();
  register(resolver:SecretResolver):void{if(this.resolvers.has(resolver.id))throw new Error(`Secret resolver already registered: ${resolver.id}`);this.resolvers.set(resolver.id,resolver);}
  async resolve(reference:SecretReference):Promise<string>{
    const resolver=[...this.resolvers.values()].find(item=>item.supports(reference));
    if(!resolver)throw new Error(`No secret resolver registered for provider: ${reference.provider}`);
    return resolver.resolve(reference);
  }
}

export class EnvironmentSecretResolver implements SecretResolver{
  readonly id='environment';
  supports(reference:SecretReference):boolean{return reference.provider==='environment';}
  async resolve(reference:SecretReference):Promise<string>{
    if(!/^[A-Z][A-Z0-9_]*$/.test(reference.key))throw new Error('Environment secret keys must use uppercase environment-variable format');
    const value=process.env[reference.key];
    if(value===undefined)throw new Error(`Secret reference is unavailable: ${reference.key}`);
    return value;
  }
}
