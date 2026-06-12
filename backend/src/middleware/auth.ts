import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { MemberRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  projectRole?: MemberRole;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Նույնականացումը պահանջվում է' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Անվավեր նույնականացման նշան' });
  }
}
