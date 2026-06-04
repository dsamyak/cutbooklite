import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-default-key-please-change';
const SALT_ROUNDS = 12;

export const registerOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const existingOwner = await prisma.owner.findUnique({ where: { email } });
    if (existingOwner) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const owner = await prisma.owner.create({
      data: {
        email,
        password_hash,
        name,
        subscription: {
          create: {
            status: 'TRIAL',
            plan_name: 'MVP Free Trial'
          }
        }
      }
    });

    const token = jwt.sign({ userId: owner.id, role: 'OWNER', ownerId: owner.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      data: {
        id: owner.id,
        email: owner.email,
        name: owner.name,
        role: 'OWNER'
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Missing email or password' });
    }

    // Check owner first
    let user: any = await prisma.owner.findUnique({ where: { email } });
    let role: 'OWNER' | 'BARBER' = 'OWNER';
    let ownerId = user?.id;

    if (!user) {
      // Check barber
      user = await prisma.barber.findUnique({ where: { email } });
      role = 'BARBER';
      if (user) ownerId = user.owner_id;
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, role, ownerId }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
        ownerId
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

export const inviteBarber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name, tempPassword } = req.body;
    const ownerId = req.user!.ownerId;

    if (!email || !name || !tempPassword) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const existingBarber = await prisma.barber.findUnique({ where: { email } });
    if (existingBarber) {
      return res.status(400).json({ success: false, message: 'Barber already exists' });
    }

    const password_hash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    const barber = await prisma.barber.create({
      data: {
        email,
        name,
        password_hash,
        owner_id: ownerId
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: barber.id,
        email: barber.email,
        name: barber.name
      }
    });
  } catch (error) {
    next(error);
  }
};

export const acceptInvite = async (req: Request, res: Response, next: NextFunction) => {
  // In a real scenario, this would use a secure token sent to email.
  // For MVP, we can allow password change by providing current temporary password.
  try {
    const { email, tempPassword, newPassword } = req.body;
    
    if (!email || !tempPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const barber = await prisma.barber.findUnique({ where: { email } });
    if (!barber) return res.status(404).json({ success: false, message: 'Barber not found' });

    const isMatch = await bcrypt.compare(tempPassword, barber.password_hash);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid temp password' });

    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.barber.update({
      where: { email },
      data: { password_hash }
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};
