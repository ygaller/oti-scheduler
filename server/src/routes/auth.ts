import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { IUserRepository } from '../repositories/UserRepository';
import { secretManager } from '../config/secrets';

const router = express.Router();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Get JWT secret from secure manager (auto-generated)
const getJwtSecret = () => secretManager.getJwtSecret();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware to verify JWT token
export const authenticateToken = async (req: any, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    const userRepository = req.userRepository as IUserRepository;
    
    // Verify session exists and is not expired
    const session = await userRepository.findSessionByToken(token);
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export function createAuthRouter(userRepository: IUserRepository) {
  // Google OAuth login
  router.post('/google', async (req, res) => {
    try {
      const { credential, code } = req.body;
      
      let googleUser;
      
      if (credential) {
        // Handle Google Identity Services credential (JWT token)
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        if (!payload) {
          return res.status(400).json({ error: 'Invalid Google credential' });
        }
        
        googleUser = {
          googleId: payload.sub,
          email: payload.email!,
          name: payload.name,
          picture: payload.picture,
        };
      } else if (code) {
        // Handle OAuth2 authorization code flow
        const { tokens } = await googleClient.getToken({
          code,
          redirect_uri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`
        });
        
        googleClient.setCredentials(tokens);
        const userInfo = await googleClient.request({
          url: 'https://www.googleapis.com/oauth2/v2/userinfo'
        });
        
        const userData = userInfo.data as any;
        googleUser = {
          googleId: userData.id,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
        };
      } else {
        return res.status(400).json({ error: 'Either credential or code is required' });
      }

      // Find or create user
      let user = await userRepository.findByGoogleId(googleUser.googleId);
      
      if (!user) {
        // Check if user exists with same email
        const existingUser = await userRepository.findByEmail(googleUser.email);
        if (existingUser) {
          return res.status(400).json({ 
            error: 'An account with this email already exists' 
          });
        }
        
        // Create new user
        user = await userRepository.create(googleUser);
      } else {
        // Update last login
        user = await userRepository.updateLastLogin(user.id);
      }

      // Create JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        getJwtSecret(),
        { expiresIn: '7d' }
      );

      // Create session record
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
      await userRepository.createSession(user.id, token, expiresAt);

      // Clean up expired sessions
      await userRepository.deleteExpiredSessions();

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
        token
      });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // Verify current session
  router.get('/verify', authenticateToken, async (req: any, res) => {
    try {
      const user = await userRepository.findById(req.user.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      });
    } catch (error) {
      console.error('Verify session error:', error);
      res.status(500).json({ error: 'Session verification failed' });
    }
  });

  // Logout
  router.post('/logout', authenticateToken, async (req: any, res) => {
    try {
      await userRepository.deleteSession(req.token);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Security info endpoint (for debugging/admin)
  router.get('/security-info', (req, res) => {
    const secretInfo = secretManager.getSecretInfo();
    res.json({
      jwtSecret: {
        exists: secretInfo.exists,
        length: secretInfo.length,
        isSecure: secretInfo.length && secretInfo.length >= 64,
        path: secretInfo.path.split('/').pop() // Only show filename for security
      },
      googleOAuth: {
        configured: !!GOOGLE_CLIENT_ID,
        clientIdLength: GOOGLE_CLIENT_ID?.length || 0
      }
    });
  });

  return router;
}

export default createAuthRouter;
