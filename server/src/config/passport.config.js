import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import envConfig from './env.config.js';
import { getUserByGoogleId, getUserByEmail, createUser, updateUser } from '../dao/user.dao.js';

passport.use(
    new GoogleStrategy(
        {
            clientID: envConfig.GOOGLE_CLIENT_ID,
            clientSecret: envConfig.GOOGLE_CLIENT_SECRET,
            callbackURL:
                envConfig.GOOGLE_CALLBACK_URL || envConfig.SERVER_URL + '/api/auth/google/callback',
            passReqToCallback: true,
        },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                const googleId = profile.id;
                const email = profile.emails?.[0]?.value?.toLowerCase();

                if (!email) {
                    return done(new Error('No email found in Google profile'), null);
                }

                // Determine mode and role from short-lived cookie or OAuth state parameter
                let mode = req.cookies?.google_oauth_mode;
                let role = req.cookies?.google_oauth_role;
                if (!mode && req.query?.state) {
                    try {
                        const parsed = JSON.parse(req.query.state);
                        mode = parsed.mode;
                        role = parsed.role;
                    } catch {
                        // ignore state parse errors
                    }
                }
                mode = mode === 'register' ? 'register' : 'login';
                const assignedRole = role && role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
                const defaultAvatar = 'https://ik.imagekit.io/2bzzjhgkg/defaul_profile_image.jpeg';

                // Check for existing user by googleId
                let user = await getUserByGoogleId(googleId, true);
                if (user) {
                    if (user.isDeleted) {
                        return done(null, false, { message: 'account_deleted' });
                    }
                    if (mode === 'register') {
                        return done(null, false, { message: 'account_exists' });
                    }
                    return done(null, user, { isNew: false });
                }

                // Check for existing user by email (account linking for login mode)
                user = await getUserByEmail(email, true);
                if (user) {
                    if (user.isDeleted) {
                        return done(null, false, { message: 'account_deleted' });
                    }
                    if (mode === 'register') {
                        return done(null, false, { message: 'account_exists' });
                    }
                    // Link Google ID to existing account if not yet linked
                    if (!user.googleId) {
                        user = await updateUser(user.id, { googleId });
                    }
                    return done(null, user, { isNew: false });
                }

                // If in LOGIN mode and user does NOT exist, block sign-in
                if (mode === 'login') {
                    return done(null, false, { message: 'no_account' });
                }

                // REGISTER mode: Create new user
                const firstName = profile.name?.givenName || profile.displayName || 'Google';
                const lastName = profile.name?.familyName || 'User';
                const profileImage = profile.photos?.[0]?.value || defaultAvatar;

                user = await createUser({
                    email,
                    googleId,
                    firstName,
                    lastName,
                    profileImage,
                    role: assignedRole,
                    emailVerified: true,
                    isActive: true,
                    isDeleted: false,
                });

                return done(null, user, { isNew: true });
            } catch (error) {
                return done(error, null);
            }
        },
    ),
);

export default passport;
