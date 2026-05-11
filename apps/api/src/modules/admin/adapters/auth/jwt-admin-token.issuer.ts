import { JwtService } from '@nestjs/jwt';
import type {
  AdminTokenIssuer,
  IssueAdminTokenCommand,
} from '../../application/ports/admin-token-issuer.port';

export class JwtAdminTokenIssuer implements AdminTokenIssuer {
  public constructor(private readonly jwtService: JwtService) {}

  public issue(command: IssueAdminTokenCommand): string {
    return this.jwtService.sign({
      sub: command.adminId,
      email: command.email,
    });
  }
}
