/**
 * Generic "operation succeeded" response used across modules (auth, mail, …).
 * Lives in common/dto because it is not owned by any single feature module.
 */
export class MessageResponseDto {
  message!: string;
}
