/**
 * File: packages/notifications/src/utils.ts
 * Purpose: Builds safe notification payload text and validates secret-resolved webhook endpoints.
 * Author: Raushan Raj
 */
import type { NetworkPolicy,NotificationRequest,SecretReference } from '../../contracts/src';
import type { SecretResolverRegistry } from '../../security/src/secrets';
import { assertNetworkAllowed } from '../../security/src/network-policy';
export async function resolveWebhookUrl(secrets:SecretResolverRegistry,reference:SecretReference,policy:NetworkPolicy):Promise<string>{const value=(await secrets.resolve(reference)).trim();const url=new URL(value);if(url.protocol!=='https:'&&url.hostname!=='127.0.0.1'&&url.hostname!=='localhost')throw new Error('Notification webhook endpoints must use HTTPS outside localhost');assertNetworkAllowed(url.toString(),policy);return url.toString();}
export function plainNotificationText(request:NotificationRequest):string{const prefix=`[${request.severity.toUpperCase()}] ${request.title}`;const links=request.links?.length?`\n${request.links.map(link=>`${link.label}: ${link.url}`).join('\n')}`:'';return `${prefix}\n${request.message}${links}`;}
