const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Clients
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("CRITICAL ERROR: Supabase environment variables (SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY) are missing!");
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log("Supabase Admin client initialized successfully!");

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Multer Storage Configuration (In-Memory for Supabase uploads)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper to log administrative actions
async function logActivity(action, details, req) {
    try {
        const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await supabaseAdmin.from('activity_log').insert({
            action,
            details,
            ip_address
        });
    } catch (e) {
        console.error("Failed to log activity:", e.message);
    }
}

// Authentication Token Validation Middleware
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token missing' });

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(403).json({ error: 'Token invalid or expired' });
        }
        
        // Fetch admin user settings
        const { data: adminUser } = await supabaseAdmin
            .from('admin_users')
            .select('*')
            .eq('id', user.id)
            .single();

        req.user = {
            id: user.id,
            email: user.email,
            username: adminUser ? adminUser.username : user.email.split('@')[0],
            session_timeout: adminUser ? adminUser.session_timeout : 30
        };
        next();
    } catch (err) {
        res.status(500).json({ error: 'Authentication check failed: ' + err.message });
    }
}

// Helper to get or create settings rows
async function getSettingsValue(key, defaultValue = {}) {
    const { data } = await supabaseAdmin.from('settings').select('value').eq('key', key).single();
    return data ? data.value : defaultValue;
}

async function setSettingsValue(key, value) {
    await supabaseAdmin.from('settings').upsert({ key, value });
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// POST Admin Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        let userEmail = username;

        // If the username is not an email, lookup email from admin_users table
        if (!username.includes('@')) {
            const { data: admin } = await supabaseAdmin
                .from('admin_users')
                .select('recovery_email')
                .eq('username', username)
                .single();

            if (!admin) {
                return res.status(401).json({ error: 'Invalid username credentials' });
            }
            userEmail = admin.recovery_email;
        }

        // Authenticate with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password
        });

        if (error) {
            return res.status(401).json({ error: error.message });
        }

        await logActivity('Login', `Administrator logged in: ${username}`, req);
        res.json({ token: data.session.access_token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Current User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json(req.user);
});

// GET Admin Profile Settings
app.get('/api/admin/settings', authenticateToken, async (req, res) => {
    try {
        const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', req.user.id).single();
        const { data: admin } = await supabaseAdmin.from('admin_users').select('*').eq('id', req.user.id).single();
        
        res.json({
            username: admin ? admin.username : req.user.username,
            recovery_email: req.user.email,
            session_timeout: admin ? admin.session_timeout : 30,
            profile_name: profile ? profile.profile_name : '',
            profile_image_url: profile ? profile.profile_image_url : '',
            theme: profile ? profile.theme : 'dark'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Update Admin Settings
app.post('/api/admin/settings', authenticateToken, async (req, res) => {
    const { username, password, recovery_email, session_timeout, profile_name, profile_image_url, theme } = req.body;
    
    try {
        // Update admin_users record
        await supabaseAdmin.from('admin_users').upsert({
            id: req.user.id,
            username: username || req.user.username,
            recovery_email: recovery_email || req.user.email,
            session_timeout: session_timeout || 30
        });

        // Update profiles record
        await supabaseAdmin.from('profiles').upsert({
            id: req.user.id,
            profile_name: profile_name || '',
            profile_image_url: profile_image_url || '',
            theme: theme || 'dark'
        });

        // Update password if provided
        if (password) {
            const { error: pwdErr } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
                password: password
            });
            if (pwdErr) throw pwdErr;
        }

        // Update email in Auth if recovery_email is modified
        if (recovery_email && recovery_email !== req.user.email) {
            const { error: emailErr } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
                email: recovery_email
            });
            if (emailErr) throw emailErr;
        }

        await logActivity('AdminSettings', 'Updated admin profile and security configurations', req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Logout
app.post('/api/admin/logout-all', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        await logActivity('Login', 'Logged out session', req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Activity Log
app.get('/api/admin/activity', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('activity_log')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(100);
            
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// CRUD: HERO SECTION
// ==========================================
app.get('/api/hero', async (req, res) => {
    try {
        let { data, error } = await supabase.from('hero').select('*').limit(1).single();
        if (error || !data) {
            // Seed a default row if none exists
            const defaultHero = {
                name: 'Shaik Hafijulrehaman',
                tagline: 'AI/ML Student | Full Stack Web Developer | Co-Founder @ UXI',
                description: 'I am a passionate Artificial Intelligence & Machine Learning student with a strong interest in Full Stack Development, AI Applications, and building scalable digital solutions.',
                resume_url: 'resume.pdf',
                avatar_url: 'images/removed_bg_hafi.png',
                background_url: '',
                background_type: 'image',
                video_path: ''
            };
            const { data: inserted } = await supabaseAdmin.from('hero').insert(defaultHero).select().single();
            data = inserted;
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/hero', authenticateToken, async (req, res) => {
    try {
        const { data: existing } = await supabase.from('hero').select('id').limit(1).single();
        let query;
        if (existing) {
            query = supabase.from('hero').update(req.body).eq('id', existing.id);
        } else {
            query = supabase.from('hero').insert(req.body);
        }
        const { error } = await query;
        if (error) throw error;
        await logActivity('Hero', 'Updated Hero section stats details', req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// CRUD: ABOUT SECTION
// ==========================================
app.get('/api/about', async (req, res) => {
    try {
        let { data, error } = await supabase.from('about').select('*').limit(1).single();
        if (error || !data) {
            const defaultAbout = {
                title: 'About Me',
                description: 'I am currently pursuing B.Tech in Artificial Intelligence & Machine Learning...',
                college: 'DVR & Dr. HS MIC College of Technology',
                degree: 'B.Tech',
                current_year: '3rd Year',
                cgpa: 8.8,
                location: 'Vijayawada, Andhra Pradesh, India',
                email: 'shaikhafizulrehaman@gmail.com',
                phone: '+91 9959593027',
                image_url: 'images/removed_bg_hafi.png'
            };
            const { data: inserted } = await supabaseAdmin.from('about').insert(defaultAbout).select().single();
            data = inserted;
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/about', authenticateToken, async (req, res) => {
    try {
        const { data: existing } = await supabase.from('about').select('id').limit(1).single();
        let query;
        if (existing) {
            query = supabase.from('about').update(req.body).eq('id', existing.id);
        } else {
            query = supabase.from('about').insert(req.body);
        }
        const { error } = await query;
        if (error) throw error;
        await logActivity('About', 'Updated About section content', req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// CRUD: SKILLS SECTION
// ==========================================
app.get('/api/skills', async (req, res) => {
    try {
        const { data, error } = await supabase.from('skills').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/skills', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('skills').insert(req.body);
        if (error) throw error;
        await logActivity('Skills', `Added skill: ${req.body.name}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/skills/reorder', authenticateToken, async (req, res) => {
    const orders = req.body;
    try {
        for (const [index, id] of orders.entries()) {
            await supabase.from('skills').update({ display_order: index }).eq('id', id);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/skills/:id', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('skills').update(req.body).eq('id', req.params.id);
        if (error) throw error;
        await logActivity('Skills', `Updated skill ID: ${req.params.id}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/skills/:id', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('skills').delete().eq('id', req.params.id);
        if (error) throw error;
        await logActivity('Skills', `Deleted skill ID: ${req.params.id}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// CRUD: PROJECTS SECTION
// ==========================================
app.get('/api/projects', async (req, res) => {
    try {
        const { data, error } = await supabase.from('projects').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('projects').select('*').eq('id', req.params.id).single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('projects').insert(req.body);
        if (error) throw error;
        await logActivity('Projects', `Created project: ${req.body.name}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/projects/reorder', authenticateToken, async (req, res) => {
    const orders = req.body;
    try {
        for (const [index, id] of orders.entries()) {
            await supabase.from('projects').update({ display_order: index }).eq('id', id);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('projects').update(req.body).eq('id', req.params.id);
        if (error) throw error;
        await logActivity('Projects', `Updated project ID: ${req.params.id}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
        if (error) throw error;
        await logActivity('Projects', `Deleted project ID: ${req.params.id}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// CRUD: TIMELINE SECTION
// ==========================================
app.get('/api/timeline', async (req, res) => {
    try {
        const { data, error } = await supabase.from('timeline').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/timeline/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('timeline').select('*').eq('id', req.params.id).single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/timeline', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('timeline').insert(req.body);
        if (error) throw error;
        await logActivity('Timeline', `Created timeline event: ${req.body.title}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/timeline/reorder', authenticateToken, async (req, res) => {
    const orders = req.body;
    try {
        for (const [index, id] of orders.entries()) {
            await supabase.from('timeline').update({ display_order: index }).eq('id', id);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/timeline/:id', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('timeline').update(req.body).eq('id', req.params.id);
        if (error) throw error;
        await logActivity('Timeline', `Updated timeline event ID: ${req.params.id}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/timeline/:id', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('timeline').delete().eq('id', req.params.id);
        if (error) throw error;
        await logActivity('Timeline', `Deleted timeline event ID: ${req.params.id}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// CRUD: CERTIFICATES SECTION
// ==========================================
app.get('/api/certificates', async (req, res) => {
    try {
        const { data, error } = await supabase.from('certificates').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/certificates/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('certificates').select('*').eq('id', req.params.id).single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/certificates', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('certificates').insert(req.body);
        if (error) throw error;
        await logActivity('Certificates', `Created certificate: ${req.body.title}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/certificates/reorder', authenticateToken, async (req, res) => {
    const orders = req.body;
    try {
        for (const [index, id] of orders.entries()) {
            await supabase.from('certificates').update({ display_order: index }).eq('id', id);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/certificates/:id', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('certificates').update(req.body).eq('id', req.params.id);
        if (error) throw error;
        await logActivity('Certificates', `Updated certificate ID: ${req.params.id}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/certificates/:id', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('certificates').delete().eq('id', req.params.id);
        if (error) throw error;
        await logActivity('Certificates', `Deleted certificate ID: ${req.params.id}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// CRUD: CONTACT SETTINGS
// ==========================================
app.get('/api/contact', async (req, res) => {
    try {
        let { data, error } = await supabase.from('contact_settings').select('*').limit(1).single();
        if (error || !data) {
            const defaultContact = { phone: '+91 9959593027', email: 'shaikhafijulrehaman@gmail.com', location: 'Vijayawada, Andhra Pradesh, India' };
            const { data: inserted } = await supabaseAdmin.from('contact_settings').insert(defaultContact).select().single();
            data = inserted;
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contact', authenticateToken, async (req, res) => {
    try {
        const { data: existing } = await supabase.from('contact_settings').select('id').limit(1).single();
        let query;
        if (existing) {
            query = supabase.from('contact_settings').update(req.body).eq('id', existing.id);
        } else {
            query = supabase.from('contact_settings').insert(req.body);
        }
        const { error } = await query;
        if (error) throw error;
        await logActivity('Contact', 'Updated Contact information parameters', req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// CRUD: SOCIAL LINKS
// ==========================================
app.get('/api/socials', async (req, res) => {
    try {
        let { data, error } = await supabase.from('social_links').select('*').limit(1).single();
        if (error || !data) {
            const defaultSocials = { github: 'https://github.com/shaikhafijulrehaman-ops', linkedin: 'https://www.linkedin.com/in/shaik-hafijulrehaman-b78793358', whatsapp: 'https://wa.me/919959593027' };
            const { data: inserted } = await supabaseAdmin.from('social_links').insert(defaultSocials).select().single();
            data = inserted;
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/socials', authenticateToken, async (req, res) => {
    try {
        const { data: existing } = await supabase.from('social_links').select('id').limit(1).single();
        let query;
        if (existing) {
            query = supabase.from('social_links').update(req.body).eq('id', existing.id);
        } else {
            query = supabase.from('social_links').insert(req.body);
        }
        const { error } = await query;
        if (error) throw error;
        await logActivity('Socials', 'Updated Social URLs configuration details', req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// CRUD: SEO SETTINGS
// ==========================================
app.get('/api/seo', async (req, res) => {
    try {
        let { data, error } = await supabase.from('seo_settings').select('*').limit(1).single();
        if (error || !data) {
            const defaultSEO = { title: 'Shaik Hafijulrehaman | AI/ML Student & Full Stack Developer', description: 'Building AI-powered applications and modern web experiences.', keywords: 'AI/ML Student, Full Stack Developer, Shaik Hafijulrehaman' };
            const { data: inserted } = await supabaseAdmin.from('seo_settings').insert(defaultSEO).select().single();
            data = inserted;
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/seo', authenticateToken, async (req, res) => {
    try {
        const { data: existing } = await supabase.from('seo_settings').select('id').limit(1).single();
        let query;
        if (existing) {
            query = supabase.from('seo_settings').update(req.body).eq('id', existing.id);
        } else {
            query = supabase.from('seo_settings').insert(req.body);
        }
        const { error } = await query;
        if (error) throw error;
        await logActivity('SEO', 'Updated SEO indexing tags details', req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// WEBSITE SETTINGS (FAVICONS)
// ==========================================
app.get('/api/settings', async (req, res) => {
    try {
        const value = await getSettingsValue('website_settings', { portfolio_favicon_url: '', uxi_favicon_url: '', admin_favicon_url: '' });
        res.json(value);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', authenticateToken, async (req, res) => {
    try {
        await setSettingsValue('website_settings', req.body);
        await logActivity('Settings', 'Updated Website Settings parameters', req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// MOBILE PORT NAVIGATION & FAB MENU SETTINGS
// ==========================================
app.get('/api/settings/fab', async (req, res) => {
    try {
        const value = await getSettingsValue('mobile_fab_settings', { is_enabled: true, custom_image_url: '', icon_class: 'fa-solid fa-bars', button_size: 60, position: 'bottom-right', bg_color: '#2563eb', border_radius: 50, glow_effect: true, animation_type: 'pulse', menu_items: [] });
        res.json(value);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings/fab', authenticateToken, async (req, res) => {
    try {
        await setSettingsValue('mobile_fab_settings', req.body);
        await logActivity('MobileFAB', 'Updated Mobile floating menu parameters', req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/settings/mobile-nav', async (req, res) => {
    try {
        const value = await getSettingsValue('mobile_navigation_settings', { is_enabled: true, is_fab_enabled: true, custom_image_url: '', icon_class: 'fa-solid fa-compass', button_size: 60, position: 'bottom-right', bg_color: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border_style: '1px solid rgba(255, 255, 255, 0.2)', shadow_style: '0 8px 32px 0 rgba(31, 38, 135, 0.3)', animation_type: 'pulse', menu_items: [] });
        res.json(value);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings/mobile-nav', authenticateToken, async (req, res) => {
    try {
        await setSettingsValue('mobile_navigation_settings', req.body);
        await logActivity('MobileNav', 'Updated Mobile navbar coordinates settings', req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// DYNAMIC BACKDROP BACKGROUNDS SETTINGS
// ==========================================
app.get('/api/backgrounds', async (req, res) => {
    try {
        const { data } = await supabaseAdmin.from('settings').select('value').eq('key', 'background_settings').single();
        if (data) return res.json(data.value);
        
        // Seed default
        const defaultBgs = { hero_bg_type: 'image', hero_bg_image: '', hero_bg_video: '', hero_overlay_enable: false, hero_overlay_color: '#000000', hero_overlay_opacity: 50, about_bg_image: '', projects_bg_image: '', uxi_bg_image: '', contact_bg_image: '' };
        await setSettingsValue('background_settings', defaultBgs);
        res.json(defaultBgs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/settings/backgrounds', async (req, res) => {
    try {
        const { data } = await supabaseAdmin.from('settings').select('value').eq('key', 'background_settings').single();
        if (data) return res.json(data.value);
        
        const defaultBgs = { hero_bg_type: 'image', hero_bg_image: '', hero_bg_video: '', hero_overlay_enable: false, hero_overlay_color: '#000000', hero_overlay_opacity: 50, about_bg_image: '', projects_bg_image: '', uxi_bg_image: '', contact_bg_image: '' };
        await setSettingsValue('background_settings', defaultBgs);
        res.json(defaultBgs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/backgrounds', authenticateToken, async (req, res) => {
    try {
        await setSettingsValue('background_settings', req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings/backgrounds', authenticateToken, async (req, res) => {
    try {
        await setSettingsValue('background_settings', req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// SUPABASE STORAGE ASSET UPLOADS AND MEDIA MANAGER
// ==========================================

// Upload files directly to Supabase Storage
app.post('/api/media/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const folder = req.query.folder || '';
    const fileName = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    try {
        // Upload to Supabase Storage 'media' bucket
        const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
            .from('media')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                duplex: 'half'
            });

        if (uploadErr) throw uploadErr;

        // Fetch public URL
        const { data: publicUrlData } = supabaseAdmin.storage
            .from('media')
            .getPublicUrl(filePath);

        const fileUrl = publicUrlData.publicUrl;

        // Record entry in media_library table
        const { data: dbData, error: dbErr } = await supabaseAdmin
            .from('media_library')
            .insert({
                name: fileName,
                url: fileUrl,
                size: req.file.size,
                mtime: new Date(),
                folder: folder || ''
            })
            .select()
            .single();

        if (dbErr) throw dbErr;

        res.json({ success: true, url: fileUrl, media: dbData });
    } catch (err) {
        res.status(500).json({ error: 'Supabase upload failed: ' + err.message });
    }
});

// Fetch paginated media gallery
app.get('/api/media', authenticateToken, async (req, res) => {
    const search = req.query.search || '';
    const folder = req.query.folder || '';
    const type = req.query.type || 'all'; // 'image', 'video', 'all'
    const sort = req.query.sort || 'newest';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    try {
        let query = supabaseAdmin
            .from('media_library')
            .select('*', { count: 'exact' })
            .eq('is_deleted', false);

        if (folder) {
            query = query.eq('folder', folder);
        } else {
            query = query.eq('folder', '');
        }

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        if (type === 'image') {
            query = query.or('name.ilike.%.png,name.ilike.%.jpg,name.ilike.%.jpeg,name.ilike.%.gif,name.ilike.%.svg,name.ilike.%.webp');
        } else if (type === 'video') {
            query = query.or('name.ilike.%.mp4,name.ilike.%.webm,name.ilike.%.ogg,name.ilike.%.mov');
        }

        if (sort === 'newest') {
            query = query.order('mtime', { ascending: false });
        } else if (sort === 'oldest') {
            query = query.order('mtime', { ascending: true });
        } else if (sort === 'alphabetical') {
            query = query.order('name', { ascending: true });
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, count, error } = await query;
        if (error) throw error;

        // Fetch folders list
        const { data: allItems } = await supabaseAdmin
            .from('media_library')
            .select('folder')
            .eq('is_deleted', false);
            
        const folders = [...new Set(allItems.map(item => item.folder).filter(f => f.length > 0))];

        res.json({
            files: data,
            folders: folders,
            totalFiles: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create folder (represented in path structures)
app.post('/api/media/folder', authenticateToken, async (req, res) => {
    const { name, parent } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required' });

    const folderPath = parent ? `${parent}/${name}` : name;
    
    try {
        // Create dummy placeholder to register folder in database
        const { error } = await supabaseAdmin.from('media_library').insert({
            name: `.folder_${Date.now()}`,
            url: '',
            size: 0,
            folder: folderPath,
            is_deleted: true // marked deleted so it is hidden in files, but keeps folder reference active
        });

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Check file usages
app.get('/api/media/usage', authenticateToken, async (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Asset name required' });

    try {
        const regexTerm = `%${name}%`;
        const inUse = [];

        // Check Hero
        const { data: hero } = await supabaseAdmin.from('hero')
            .select('*')
            .or(`avatar_url.ilike.${regexTerm},background_url.ilike.${regexTerm},video_path.ilike.${regexTerm}`);
        if (hero && hero.length > 0) inUse.push('Hero');

        // Check About
        const { data: about } = await supabaseAdmin.from('about')
            .select('*')
            .ilike('image_url', regexTerm);
        if (about && about.length > 0) inUse.push('About');

        // Check Projects
        const { data: projects } = await supabaseAdmin.from('projects')
            .select('*')
            .ilike('image_url', regexTerm);
        if (projects && projects.length > 0) inUse.push('Projects');

        // Check Certificates
        const { data: certs } = await supabaseAdmin.from('certificates')
            .select('*')
            .ilike('image_url', regexTerm);
        if (certs && certs.length > 0) inUse.push('Certificates');

        // Check Timeline
        const { data: timeline } = await supabaseAdmin.from('timeline')
            .select('*')
            .ilike('logo_url', regexTerm);
        if (timeline && timeline.length > 0) inUse.push('Timeline');

        // Check Team Members
        const { data: team } = await supabaseAdmin.from('team_members')
            .select('*')
            .ilike('photo_url', regexTerm);
        if (team && team.length > 0) inUse.push('Team Members');

        res.json({ inUse: inUse.length > 0, sections: inUse });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete file (soft-delete if in use, hard-delete if not)
app.delete('/api/media/:name', authenticateToken, async (req, res) => {
    const { name } = req.params;
    const folder = req.query.folder || '';
    const filePath = folder ? `${folder}/${name}` : name;

    try {
        const { data: media } = await supabaseAdmin.from('media_library').select('*').eq('name', name).single();
        if (!media) return res.status(404).json({ error: 'Asset not found' });

        // Query usages
        const usageRes = await fetch(`http://localhost:${PORT}/api/media/usage?name=${encodeURIComponent(name)}`, {
            headers: { 'Authorization': req.headers['authorization'] }
        }).then(r => r.json());

        if (usageRes.inUse) {
            // Soft delete
            await supabaseAdmin.from('media_library').update({ is_deleted: true }).eq('id', media.id);
            await logActivity('Media', `Soft-deleted in-use file: ${name}`, req);
            return res.json({ success: true, message: 'File is currently in use. Soft-deleted from Library view.' });
        }

        // Hard delete
        const { error: removeErr } = await supabaseAdmin.storage.from('media').remove([filePath]);
        if (removeErr) throw removeErr;

        await supabaseAdmin.from('media_library').delete().eq('id', media.id);
        await logActivity('Media', `Hard-deleted unused file: ${name}`, req);
        res.json({ success: true, message: 'Unused file deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rename file
app.put('/api/media/rename', authenticateToken, async (req, res) => {
    const { oldName, newName, folder } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: 'Old name and new name required' });

    const oldPath = folder ? `${folder}/${oldName}` : oldName;
    const newPath = folder ? `${folder}/${newName}` : newName;

    try {
        const { data: media } = await supabaseAdmin.from('media_library').select('*').eq('name', oldName).single();
        if (!media) return res.status(404).json({ error: 'Asset not found' });

        // Move/rename object in storage bucket
        const { error: moveErr } = await supabaseAdmin.storage.from('media').move(oldPath, newPath);
        if (moveErr) throw moveErr;

        // Fetch new URL
        const { data: publicUrlData } = supabaseAdmin.storage.from('media').getPublicUrl(newPath);
        const fileUrl = publicUrlData.publicUrl;

        // Update database entry
        await supabaseAdmin.from('media_library').update({
            name: newName,
            url: fileUrl,
            mtime: new Date()
        }).eq('id', media.id);

        await logActivity('Media', `Renamed asset from ${oldName} to ${newName}`, req);
        res.json({ success: true, url: fileUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Replace file content
app.post('/api/media/replace/:name', authenticateToken, upload.single('file'), async (req, res) => {
    const { name } = req.params;
    const folder = req.query.folder || '';
    const filePath = folder ? `${folder}/${name}` : name;

    if (!req.file) return res.status(400).json({ error: 'Replacement file required' });

    try {
        const { data: media } = await supabaseAdmin.from('media_library').select('*').eq('name', name).single();
        if (!media) return res.status(404).json({ error: 'Asset not found' });

        // Overwrite file content in Supabase storage
        const { error: replaceErr } = await supabaseAdmin.storage
            .from('media')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true,
                duplex: 'half'
            });

        if (replaceErr) throw replaceErr;

        // Fetch URL
        const { data: publicUrlData } = supabaseAdmin.storage.from('media').getPublicUrl(filePath);
        const fileUrl = publicUrlData.publicUrl;

        // Update DB
        await supabaseAdmin.from('media_library').update({
            url: fileUrl,
            size: req.file.size,
            mtime: new Date()
        }).eq('id', media.id);

        await logActivity('Media', `Replaced content for file: ${name}`, req);
        res.json({ success: true, url: fileUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Resume PDF Upload
app.post('/api/resume/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

    const fileName = `resume_${Date.now()}.pdf`;
    try {
        const { error: uploadErr } = await supabaseAdmin.storage
            .from('resume')
            .upload(fileName, req.file.buffer, {
                contentType: 'application/pdf',
                duplex: 'half'
            });

        if (uploadErr) throw uploadErr;

        const { data: publicUrlData } = supabaseAdmin.storage.from('resume').getPublicUrl(fileName);
        const fileUrl = publicUrlData.publicUrl;

        // Update hero resume URL
        const { data: existing } = await supabase.from('hero').select('id').limit(1).single();
        if (existing) {
            await supabase.from('hero').update({ resume_url: fileUrl }).eq('id', existing.id);
        }

        await logActivity('Resume', 'Uploaded new active Resume file', req);
        res.json({ success: true, url: fileUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// CRUD: UXI STARTUP PAGE GENERAL INFO
// ==========================================
app.get('/api/uxi/general', async (req, res) => {
    try {
        const value = await getSettingsValue('uxi_general', {
            logo_url: 'images/uxi_website.png',
            about_copy: 'UXI (Unified eXperience Intelligence) co-founded by passionate developers building modern digital solutions.',
            about_title: 'About UXI',
            about_story: 'UXI co-founded by passionate developers building modern digital solutions.',
            mission: 'To empower organizations with intelligence-driven experiences.',
            vision: 'A future where technology and human experience blend seamlessly.',
            founded_year: '2026',
            email: 'contact@uxitech.in',
            phone: '+91 9959593027',
            location: 'Vijayawada, Andhra Pradesh, India',
            website_link: 'https://uxitech.in',
            hero_title: 'UXI',
            hero_subtitle: 'Unified eXperience Intelligence',
            hero_desc: 'Building modern digital experiences through AI, Web Development and scalable software solutions.',
            linkedin: '#',
            github: '#',
            instagram: '#',
            whatsapp: '#',
            seo_title: 'UXI – Unified eXperience Intelligence',
            seo_desc: 'Building modern digital experiences through AI, Web Development and scalable software solutions.',
            seo_keywords: 'UXI, AI, Web Development',
            footer_text: '© UXI – Unified eXperience Intelligence',
            footer_btn_text: 'Visit UXITECH',
            footer_btn_link: 'https://uxitech.in',
            footer_tagline: 'Empowering the next generation of seamless web experiences.'
        });
        res.json(value);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/uxi/general', authenticateToken, async (req, res) => {
    try {
        await setSettingsValue('uxi_general', req.body);
        await logActivity('UXI', 'Updated UXI startup general settings details', req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// CRUD: UXI STARTUP PAGE TEAM MEMBERS
// ==========================================
app.get('/api/uxi/team', async (req, res) => {
    try {
        const { data, error } = await supabase.from('team_members').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/uxi/team/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('team_members').select('*').eq('id', req.params.id).single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/uxi/team', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('team_members').insert(req.body);
        if (error) throw error;
        await logActivity('UXI', `Created team member: ${req.body.name}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/uxi/team/reorder', authenticateToken, async (req, res) => {
    const orders = req.body;
    try {
        for (const [index, id] of orders.entries()) {
            await supabase.from('team_members').update({ display_order: index }).eq('id', id);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/uxi/team/:id', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('team_members').update(req.body).eq('id', req.params.id);
        if (error) throw error;
        await logActivity('UXI', `Updated team member ID: ${req.params.id}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/uxi/team/:id', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('team_members').delete().eq('id', req.params.id);
        if (error) throw error;
        await logActivity('UXI', `Deleted team member ID: ${req.params.id}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// CRUD: UXI STARTUP PAGE PROJECTS
// ==========================================
app.get('/api/uxi/projects', async (req, res) => {
    try {
        const { data, error } = await supabase.from('uxi_projects').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/uxi/projects/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('uxi_projects').select('*').eq('id', req.params.id).single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/uxi/projects', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('uxi_projects').insert(req.body);
        if (error) throw error;
        await logActivity('UXI', `Created UXI project: ${req.body.name}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/uxi/projects/reorder', authenticateToken, async (req, res) => {
    const orders = req.body;
    try {
        for (const [index, id] of orders.entries()) {
            await supabase.from('uxi_projects').update({ display_order: index }).eq('id', id);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/uxi/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('uxi_projects').update(req.body).eq('id', req.params.id);
        if (error) throw error;
        await logActivity('UXI', `Updated UXI project ID: ${req.params.id}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/uxi/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from('uxi_projects').delete().eq('id', req.params.id);
        if (error) throw error;
        await logActivity('UXI', `Deleted UXI project ID: ${req.params.id}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// SYSTEM EXPORTS & DATABASE BACKUPS SYSTEM
// ==========================================

// GET Database Export JSON Data
app.get('/api/admin/export', authenticateToken, async (req, res) => {
    try {
        const tables = ['hero', 'about', 'skills', 'projects', 'timeline', 'certificates', 'team_members', 'contact_settings', 'seo_settings', 'social_links', 'media_library', 'settings', 'admin_users', 'uxi_projects'];
        const dump = {};
        
        for (const table of tables) {
            const { data } = await supabaseAdmin.from(table).select('*');
            dump[table] = data || [];
        }
        
        res.json(dump);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Database Import JSON Data
app.post('/api/admin/import', authenticateToken, async (req, res) => {
    const data = req.body;
    try {
        const tables = ['hero', 'about', 'skills', 'projects', 'timeline', 'certificates', 'team_members', 'contact_settings', 'seo_settings', 'social_links', 'media_library', 'settings', 'admin_users', 'uxi_projects'];
        
        for (const table of tables) {
            if (data[table] && Array.from(data[table]).length > 0) {
                // Wipe table and insert fresh data
                await supabaseAdmin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
                const { error } = await supabaseAdmin.from(table).insert(data[table]);
                if (error) throw error;
            }
        }

        await logActivity('Import', 'Restored database configurations from direct JSON import', req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET list backups
app.get('/api/admin/backups', authenticateToken, async (req, res) => {
    try {
        const value = await getSettingsValue('db_backups', []);
        res.json(value);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create backup
app.post('/api/admin/backup', authenticateToken, async (req, res) => {
    try {
        const tables = ['hero', 'about', 'skills', 'projects', 'timeline', 'certificates', 'team_members', 'contact_settings', 'seo_settings', 'social_links', 'media_library', 'settings', 'admin_users', 'uxi_projects'];
        const dump = {};
        
        for (const table of tables) {
            const { data } = await supabaseAdmin.from(table).select('*');
            dump[table] = data || [];
        }

        const backups = await getSettingsValue('db_backups', []);
        const newBackup = {
            id: `backup_${Date.now()}`,
            timestamp: new Date(),
            data: dump
        };
        backups.push(newBackup);
        await setSettingsValue('db_backups', backups);

        await logActivity('Backup', 'Generated database backup snapshot', req);
        res.json({ success: true, backup: newBackup });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST restore backup
app.post('/api/admin/restore/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const backups = await getSettingsValue('db_backups', []);
        const backup = backups.find(b => b.id === id);
        if (!backup) return res.status(404).json({ error: 'Backup not found' });

        const tables = ['hero', 'about', 'skills', 'projects', 'timeline', 'certificates', 'team_members', 'contact_settings', 'seo_settings', 'social_links', 'media_library', 'settings', 'admin_users', 'uxi_projects'];
        const data = backup.data;

        for (const table of tables) {
            if (data[table]) {
                await supabaseAdmin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
                const { error } = await supabaseAdmin.from(table).insert(data[table]);
                if (error) throw error;
            }
        }

        await logActivity('Restore', `Restored database configuration from backup snapshot: ${id}`, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE delete backup
app.delete('/api/admin/backups/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        let backups = await getSettingsValue('db_backups', []);
        backups = backups.filter(b => b.id !== id);
        await setSettingsValue('db_backups', backups);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const [projRes, skillRes, certRes, timelineRes] = await Promise.all([
            supabase.from('projects').select('*', { count: 'exact', head: true }),
            supabase.from('skills').select('*', { count: 'exact', head: true }),
            supabase.from('certificates').select('*', { count: 'exact', head: true }),
            supabase.from('timeline').select('*', { count: 'exact', head: true })
        ]);
        
        res.json({
            projects: projRes.count || 0,
            skills: skillRes.count || 0,
            certificates: certRes.count || 0,
            timeline: timelineRes.count || 0
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET Mobile navigation Fab menu settings
app.get('/api/mobilenav/fab', async (req, res) => {
    try {
        const nav = await getSettingsValue('mobile_navigation_settings', {
            is_enabled: true,
            is_fab_enabled: true,
            custom_image_url: '',
            icon_class: 'fa-solid fa-compass',
            button_size: 60,
            position: 'bottom-right',
            bg_color: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            border_style: '1px solid rgba(255, 255, 255, 0.2)',
            shadow_style: '0 8px 32px 0 rgba(31, 38, 135, 0.3)',
            animation_type: 'pulse',
            menu_items: []
        });
        res.json(nav);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET Mobile navigation menu item by ID
app.get('/api/mobilenav/fab/:id', async (req, res) => {
    try {
        const nav = await getSettingsValue('mobile_navigation_settings', { menu_items: [] });
        const item = nav.menu_items.find(i => i.id === req.params.id || i._id === req.params.id);
        if (!item) return res.status(404).json({ error: 'Navigation item not found' });
        res.json(item);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST Create Mobile navigation menu item
app.post('/api/mobilenav/fab', authenticateToken, async (req, res) => {
    try {
        const nav = await getSettingsValue('mobile_navigation_settings', {
            is_enabled: true,
            is_fab_enabled: true,
            custom_image_url: '',
            icon_class: 'fa-solid fa-compass',
            button_size: 60,
            position: 'bottom-right',
            bg_color: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            border_style: '1px solid rgba(255, 255, 255, 0.2)',
            shadow_style: '0 8px 32px 0 rgba(31, 38, 135, 0.3)',
            animation_type: 'pulse',
            menu_items: []
        });
        
        const { label, description, icon_class, url, target_type, is_enabled } = req.body;
        const newItem = {
            id: `item_${Date.now()}`,
            _id: `item_${Date.now()}`,
            label,
            description: description || '',
            icon_class,
            url,
            target_type: target_type || 'scroll',
            is_enabled: is_enabled !== undefined ? !!is_enabled : true
        };
        
        nav.menu_items.push(newItem);
        await setSettingsValue('mobile_navigation_settings', nav);
        res.json({ success: true, item: newItem });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT Update Mobile navigation menu item
app.put('/api/mobilenav/fab/:id', authenticateToken, async (req, res) => {
    try {
        const nav = await getSettingsValue('mobile_navigation_settings', { menu_items: [] });
        const itemIndex = nav.menu_items.findIndex(i => i.id === req.params.id || i._id === req.params.id);
        if (itemIndex === -1) return res.status(404).json({ error: 'Navigation item not found' });
        
        const { label, description, icon_class, url, target_type, is_enabled } = req.body;
        nav.menu_items[itemIndex] = {
            ...nav.menu_items[itemIndex],
            label: label !== undefined ? label : nav.menu_items[itemIndex].label,
            description: description !== undefined ? description : nav.menu_items[itemIndex].description,
            icon_class: icon_class !== undefined ? icon_class : nav.menu_items[itemIndex].icon_class,
            url: url !== undefined ? url : nav.menu_items[itemIndex].url,
            target_type: target_type !== undefined ? target_type : nav.menu_items[itemIndex].target_type,
            is_enabled: is_enabled !== undefined ? !!is_enabled : nav.menu_items[itemIndex].is_enabled
        };
        
        await setSettingsValue('mobile_navigation_settings', nav);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE Mobile navigation menu item
app.delete('/api/mobilenav/fab/:id', authenticateToken, async (req, res) => {
    try {
        const nav = await getSettingsValue('mobile_navigation_settings', { menu_items: [] });
        nav.menu_items = nav.menu_items.filter(i => i.id !== req.params.id && i._id !== req.params.id);
        await setSettingsValue('mobile_navigation_settings', nav);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT Reorder Mobile navigation menu items
app.put('/api/mobilenav/fab/reorder', authenticateToken, async (req, res) => {
    try {
        const { orders } = req.body;
        const nav = await getSettingsValue('mobile_navigation_settings', { menu_items: [] });
        
        const reordered = [];
        for (const id of orders) {
            const item = nav.menu_items.find(i => i.id === id || i._id === id);
            if (item) reordered.push(item);
        }
        nav.menu_items = reordered;
        await setSettingsValue('mobile_navigation_settings', nav);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST Settings Logo direct file upload
app.post('/api/settings/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const fileName = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    try {
        const { error } = await supabaseAdmin.storage
            .from('media')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                duplex: 'half'
            });
        if (error) throw error;
        
        const { data } = supabaseAdmin.storage.from('media').getPublicUrl(fileName);
        res.json({ success: true, url: data.publicUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Delete media asset by path
app.post('/api/media/delete', authenticateToken, async (req, res) => {
    const { path: relativePath } = req.body;
    if (!relativePath) return res.status(400).json({ error: 'Path is required' });
    
    try {
        const filename = relativePath.split('/').pop();
        const { error: removeErr } = await supabaseAdmin.storage.from('media').remove([relativePath]);
        if (removeErr) throw removeErr;
        
        await supabaseAdmin.from('media_library').delete().eq('name', filename);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// SUPABASE DATABASE SEEDING ENGINE
// ==========================================
async function seedSupabaseDatabase() {
    try {
        // 1. Seed auth user admin account if empty
        const { data: authUsersList, error: authListErr } = await supabaseAdmin.auth.admin.listUsers();
        if (authListErr) throw authListErr;

        let activeAdminUserId = null;

        if (authUsersList.users.length === 0) {
            const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
                email: 'shaikhafijulrehaman@gmail.com',
                password: 'admin123',
                email_confirm: true
            });
            if (createErr) throw createErr;
            activeAdminUserId = newUser.user.id;
            console.log("Seeded default admin user in Supabase Auth: shaikhafijulrehaman@gmail.com / admin123");
        } else {
            activeAdminUserId = authUsersList.users[0].id;
        }

        // 2. Seed admin_users table
        const { count: adminCount } = await supabaseAdmin.from('admin_users').select('*', { count: 'exact', head: true });
        if (adminCount === 0 && activeAdminUserId) {
            await supabaseAdmin.from('admin_users').insert({
                id: activeAdminUserId,
                username: 'admin',
                recovery_email: 'shaikhafijulrehaman@gmail.com',
                session_timeout: 30
            });
            console.log("Seeded admin_users record.");
        }

        // 3. Seed profiles table
        const { count: profileCount } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
        if (profileCount === 0 && activeAdminUserId) {
            await supabaseAdmin.from('profiles').insert({
                id: activeAdminUserId,
                profile_name: 'Shaik Hafijulrehaman',
                profile_image_url: 'images/removed_bg_hafi.png',
                theme: 'dark'
            });
            console.log("Seeded admin profiles record.");
        }

        // 4. Seed Hero
        const { count: heroCount } = await supabaseAdmin.from('hero').select('*', { count: 'exact', head: true });
        if (heroCount === 0) {
            await supabaseAdmin.from('hero').insert({
                name: 'Shaik Hafijulrehaman',
                tagline: 'AI/ML Student | Full Stack Web Developer | Co-Founder @ UXI',
                description: 'I am a passionate Artificial Intelligence & Machine Learning student with a strong interest in Full Stack Development, AI Applications, and building scalable digital solutions.',
                resume_url: 'resume.pdf',
                avatar_url: 'images/removed_bg_hafi.png',
                background_url: '',
                background_type: 'image',
                video_path: '',
                overlay_color: '#000000',
                overlay_opacity: 0.5,
                brightness: 100,
                contrast: 100,
                blur: 0
            });
            console.log("Seeded default hero.");
        }

        // 5. Seed About
        const { count: aboutCount } = await supabaseAdmin.from('about').select('*', { count: 'exact', head: true });
        if (aboutCount === 0) {
            await supabaseAdmin.from('about').insert({
                title: 'About Me',
                description: 'I am currently pursuing B.Tech in Artificial Intelligence & Machine Learning at DVR & Dr. HS MIC College of Technology. Passionate about software craftsmanship, web intelligence, and backend systems.',
                college: 'DVR & Dr. HS MIC College of Technology',
                degree: 'B.Tech',
                current_year: '3rd Year',
                cgpa: 8.8,
                location: 'Vijayawada, Andhra Pradesh, India',
                email: 'shaikhafijulrehaman@gmail.com',
                phone: '+91 9959593027',
                image_url: 'images/removed_bg_hafi.png'
            });
            console.log("Seeded default about.");
        }

        // 6. Seed Skills
        const { count: skillsCount } = await supabaseAdmin.from('skills').select('*', { count: 'exact', head: true });
        if (skillsCount === 0) {
            const defaultSkills = [
                { name: 'HTML5 & CSS3', category: 'Frontend', icon_class: 'fa-brands fa-html5', color: '#e34f26', display_order: 1 },
                { name: 'JavaScript (ES6+)', category: 'Frontend', icon_class: 'fa-brands fa-js', color: '#f7df1e', display_order: 2 },
                { name: 'React.js & Redux', category: 'Frontend', icon_class: 'fa-brands fa-react', color: '#61dafb', display_order: 3 },
                { name: 'Node.js & Express', category: 'Backend', icon_class: 'fa-brands fa-node-js', color: '#339933', display_order: 4 },
                { name: 'Python & Django', category: 'Backend', icon_class: 'fa-brands fa-python', color: '#3776ab', display_order: 5 },
                { name: 'Git & GitHub', category: 'Tools', icon_class: 'fa-brands fa-git-alt', color: '#f05032', display_order: 6 },
                { name: 'Figma & UI Design', category: 'Design', icon_class: 'fa-brands fa-figma', color: '#f24e1e', display_order: 7 },
                { name: 'MongoDB', category: 'Databases', icon_class: 'fa-solid fa-database', color: '#47a248', display_order: 8 },
                { name: 'Supabase', category: 'Databases', icon_class: 'fa-solid fa-bolt', color: '#3ECF8E', display_order: 9 }
            ];
            await supabaseAdmin.from('skills').insert(defaultSkills);
            console.log("Seeded default skills.");
        }

        // 7. Seed Projects
        const { count: projectsCount } = await supabaseAdmin.from('projects').select('*', { count: 'exact', head: true });
        if (projectsCount === 0) {
            const defaultProjects = [
                { name: 'Unified Experience Intelligence', short_desc: 'Co-founded UXI, an AI-powered experience management suite.', technologies: ['React', 'Node.js', 'Supabase'], category: 'Full Stack', github_link: '#', live_link: '#', image_url: 'images/uxi_website.png', is_featured: true, display_order: 1 },
                { name: 'Personal Portfolio CMS', short_desc: 'Custom-built portfolio manager with safe uploads and media picker.', technologies: ['HTML', 'CSS', 'JavaScript'], category: 'Frontend', github_link: '#', live_link: '#', image_url: 'images/Pro1.png', is_featured: true, display_order: 2 }
            ];
            await supabaseAdmin.from('projects').insert(defaultProjects);
            console.log("Seeded default projects.");
        }

        // 8. Seed Timeline
        const { count: timelineCount } = await supabaseAdmin.from('timeline').select('*', { count: 'exact', head: true });
        if (timelineCount === 0) {
            const defaultTimeline = [
                { title: 'B.Tech', company: 'DVR & Dr. HS MIC College of Technology', description: 'Pursuing B.Tech in Artificial Intelligence & Machine Learning. Currently in 3rd Year with an outstanding current CGPA of 8.8. Actively involved in building AI applications and exploring machine learning methodologies.', start_date: '2023', end_date: 'Present', badge: 'Education', display_order: 1 },
                { title: 'AI Internship', company: 'IBM SkillsBuild', description: 'Acquired hands-on experience in training machine learning models, deploying APIs, and designing neural networks under guidance from industry mentors. Developed smart classification systems and analytics portals.', start_date: 'Summer', end_date: 'Internship', badge: 'Experience', display_order: 2 },
                { title: 'Community Service Internship', company: 'Academic outreach program', description: 'Leveraged digital skills to assist local communities, setting up administrative databases, organizing technical literacy programs, and building simple communication portals.', start_date: 'Community', end_date: 'Outreach', badge: 'Experience', display_order: 3 },
                { title: 'Web Development Projects', company: 'Self-initiated & Academic', description: 'Designed and deployed multiple complex applications integrating modern stacks like React, Node.js, and Supabase. Focused on secure authentications, API pipelines, and interactive user interfaces.', start_date: 'Ongoing', end_date: '', badge: 'Projects', display_order: 4 },
                { title: 'Freelance Projects', company: 'Independent Developer', description: 'Partnered with diverse clients to design web pages, implement custom admin portals, and automate workflows. Delivered fully responsive layouts optimized for loading speed and recruiter-friendly presentation.', start_date: 'Contract', end_date: '', badge: 'Freelance', display_order: 5 }
            ];
            await supabaseAdmin.from('timeline').insert(defaultTimeline);
            console.log("Seeded default timeline.");
        }

        // 9. Seed Certificates
        const { count: certificatesCount } = await supabaseAdmin.from('certificates').select('*', { count: 'exact', head: true });
        if (certificatesCount === 0) {
            const defaultCertificates = [
                { title: 'AI Foundations & Engineering', organization: 'IBM SkillsBuild', issue_date: 'Jan 2025', credential_link: '#', image_url: 'images/cert_placeholder.png', display_order: 1 },
                { title: 'Full Stack Development Core', organization: 'Google / Coursera', issue_date: 'Aug 2025', credential_link: '#', image_url: 'images/cert_placeholder.png', display_order: 2 },
                { title: 'Machine Learning Specialist', organization: 'Stanford / Coursera', issue_date: 'Mar 2026', credential_link: '#', image_url: 'images/cert_placeholder.png', display_order: 3 },
                { title: 'Python for Data Science', organization: 'IBM SkillsBuild', issue_date: 'Nov 2025', credential_link: '#', image_url: 'images/cert_placeholder.png', display_order: 4 }
            ];
            await supabaseAdmin.from('certificates').insert(defaultCertificates);
            console.log("Seeded default certificates.");
        }

        // 10. Seed Team Members
        const { count: teamCount } = await supabaseAdmin.from('team_members').select('*', { count: 'exact', head: true });
        if (teamCount === 0) {
            const defaultUXITeam = [
                {
                    name: 'Shaik Hafijulrehaman',
                    role: 'Co-Founder & AI/ML Lead',
                    bio: 'AI/ML student and Full-Stack Developer passionate about designing and building intelligent web experiences.',
                    responsibilities: 'Overseeing technical architecture, developing AI pipelines, and leading front-end integration.',
                    skills: ['Python', 'Machine Learning', 'React', 'Node.js', 'MongoDB'],
                    linkedin_link: 'https://www.linkedin.com/in/shaik-hafijulrehaman-b78793358',
                    github_link: 'https://github.com/shaikhafijulrehaman-ops',
                    photo_url: 'images/removed_bg_hafi.png',
                    display_order: 1
                },
                {
                    name: 'Jane Doe',
                    role: 'Co-Founder & Design Lead',
                    bio: 'UX Specialist focused on crafting high-fidelity design systems and responsive glassmorphic layouts.',
                    responsibilities: 'Leading user interface design, user research, and branding elements.',
                    skills: ['Figma', 'UI Design', 'CSS', 'Framer Motion'],
                    linkedin_link: '#',
                    photo_url: 'images/cert_placeholder.png',
                    display_order: 2
                }
            ];
            await supabaseAdmin.from('team_members').insert(defaultUXITeam);
            console.log("Seeded default team members.");
        }

        // 11. Seed Contact Settings
        const { count: contactCount } = await supabaseAdmin.from('contact_settings').select('*', { count: 'exact', head: true });
        if (contactCount === 0) {
            await supabaseAdmin.from('contact_settings').insert({
                phone: '+91 9959593027',
                email: 'shaikhafijulrehaman@gmail.com',
                location: 'Vijayawada, Andhra Pradesh, India'
            });
            console.log("Seeded default contact settings.");
        }

        // 12. Seed SEO Settings
        const { count: seoCount } = await supabaseAdmin.from('seo_settings').select('*', { count: 'exact', head: true });
        if (seoCount === 0) {
            await supabaseAdmin.from('seo_settings').insert({
                title: 'Shaik Hafijulrehaman | AI/ML Student & Full Stack Developer',
                description: 'Building AI-powered applications and modern web experiences.',
                keywords: 'AI/ML Student, Full Stack Developer, Shaik Hafijulrehaman',
                image_url: '',
                favicon_url: ''
            });
            console.log("Seeded default SEO settings.");
        }

        // 13. Seed Social Links
        const { count: socialsCount } = await supabaseAdmin.from('social_links').select('*', { count: 'exact', head: true });
        if (socialsCount === 0) {
            await supabaseAdmin.from('social_links').insert({
                github: 'https://github.com/shaikhafijulrehaman-ops',
                linkedin: 'https://www.linkedin.com/in/shaik-hafijulrehaman-b78793358',
                whatsapp: 'https://wa.me/919959593027'
            });
            console.log("Seeded default social links.");
        }

        // 14. Seed UXI Projects
        const { count: uxiProjectsCount } = await supabaseAdmin.from('uxi_projects').select('*', { count: 'exact', head: true });
        if (uxiProjectsCount === 0) {
            const defaultUXIProjects = [
                {
                    name: 'UXI Analytics Hub',
                    description: 'A real-time user behavior analytics dashboard that leverages machine learning to predict user churn and optimize micro-conversions.',
                    technologies: ['React', 'Node.js', 'TensorFlow.js', 'MongoDB'],
                    github_link: '#',
                    live_link: '#',
                    image_url: 'images/uxi_website.png',
                    status: 'Completed',
                    completion_date: 'June 2026',
                    expected_features: ['Real-time behavior tracking', 'Predictive churn modeling', 'Interactive charts', 'Glassmorphism dark theme'],
                    display_order: 1
                },
                {
                    name: 'UXI Adaptive Interface Agent',
                    description: 'An AI assistant that dynamically alters webpage CSS layout and typography in real-time based on user eye tracking and readability preferences.',
                    technologies: ['Python', 'FastAPI', 'OpenCV', 'WebSockets'],
                    github_link: '#',
                    live_link: '#',
                    image_url: 'images/cert_placeholder.png',
                    status: 'Upcoming',
                    dev_stage: 'Development',
                    expected_release: 'Dec 2026',
                    coming_soon: true,
                    progress_percent: 45,
                    expected_features: ['Eye-tracking integration', 'Real-time CSS alterations', 'Low-latency communication', 'Browser extension'],
                    display_order: 2
                }
            ];
            await supabaseAdmin.from('uxi_projects').insert(defaultUXIProjects);
            console.log("Seeded default UXI projects.");
        }

        // 15. Seed General Settings keys
        const { data: websiteData } = await supabaseAdmin.from('settings').select('*').eq('key', 'website_settings').single();
        if (!websiteData) {
            await setSettingsValue('website_settings', {
                portfolio_favicon_url: '',
                uxi_favicon_url: '',
                admin_favicon_url: ''
            });
            console.log("Seeded website settings.");
        }

        const { data: bgData } = await supabaseAdmin.from('settings').select('*').eq('key', 'background_settings').single();
        if (!bgData) {
            await setSettingsValue('background_settings', {
                hero_bg_type: 'image',
                hero_bg_image: '',
                hero_bg_video: '',
                hero_overlay_enable: false,
                hero_overlay_color: '#000000',
                hero_overlay_opacity: 50,
                about_bg_image: '',
                projects_bg_image: '',
                uxi_bg_image: '',
                contact_bg_image: ''
            });
            console.log("Seeded backgrounds settings.");
        }

        const { data: fabData } = await supabaseAdmin.from('settings').select('*').eq('key', 'mobile_fab_settings').single();
        if (!fabData) {
            await setSettingsValue('mobile_fab_settings', {
                is_enabled: true,
                custom_image_url: '',
                icon_class: 'fa-solid fa-bars',
                button_size: 60,
                position: 'bottom-right',
                bg_color: '#2563eb',
                border_radius: 50,
                glow_effect: true,
                animation_type: 'pulse',
                menu_items: []
            });
            console.log("Seeded mobile FAB settings.");
        }

        const { data: navData } = await supabaseAdmin.from('settings').select('*').eq('key', 'mobile_navigation_settings').single();
        if (!navData) {
            await setSettingsValue('mobile_navigation_settings', {
                is_enabled: true,
                is_fab_enabled: true,
                custom_image_url: '',
                icon_class: 'fa-solid fa-compass',
                button_size: 60,
                position: 'bottom-right',
                bg_color: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                border_style: '1px solid rgba(255, 255, 255, 0.2)',
                shadow_style: '0 8px 32px 0 rgba(31, 38, 135, 0.3)',
                animation_type: 'pulse',
                menu_items: []
            });
            console.log("Seeded mobile navigation settings.");
        }

        const { data: uxiGenData } = await supabaseAdmin.from('settings').select('*').eq('key', 'uxi_general').single();
        if (!uxiGenData) {
            await setSettingsValue('uxi_general', {
                logo_url: 'images/uxi_website.png',
                about_copy: 'UXI (Unified eXperience Intelligence) co-founded by passionate developers building modern digital solutions. We focus on integrating cutting edge Artificial Intelligence and Machine Learning techniques into seamless, intuitive user experiences.',
                about_title: 'About UXI',
                about_story: 'UXI co-founded by passionate developers building modern digital solutions.',
                mission: 'To empower organizations with intelligence-driven, premium user experience solutions.',
                vision: 'A future where design, intelligence, and code merge into invisible yet powerful human-computer interactions.',
                founded_year: '2026',
                email: 'contact@uxitech.in',
                phone: '+91 9959593027',
                location: 'Vijayawada, Andhra Pradesh, India',
                website_link: 'https://uxitech.in',
                hero_title: 'UXI',
                hero_subtitle: 'Unified eXperience Intelligence',
                hero_desc: 'Building modern digital experiences through AI, Web Development and scalable software solutions.',
                linkedin: '#',
                github: '#',
                instagram: '#',
                whatsapp: '#',
                seo_title: 'UXI – Unified eXperience Intelligence',
                seo_desc: 'Building modern digital experiences through AI, Web Development and scalable software solutions.',
                seo_keywords: 'UXI, AI, Web Development',
                footer_text: '© UXI – Unified eXperience Intelligence',
                footer_btn_text: 'Visit UXITECH',
                footer_btn_link: 'https://uxitech.in',
                footer_tagline: 'Empowering the next generation of seamless web experiences.'
            });
            console.log("Seeded UXI general settings.");
        }

        console.log("Supabase database seeding run completed successfully.");
    } catch (e) {
        console.error("Seeding Supabase database failed:", e.message);
    }
}

// ==========================================
// SUPABASE STORAGE INITIALIZATION ENGINE
// ==========================================
async function initializeSupabaseStorage() {
    const buckets = ['hero', 'projects', 'certificates', 'team', 'gallery', 'media', 'resume', 'logos'];
    for (const bucketName of buckets) {
        try {
            const { data, error } = await supabaseAdmin.storage.getBucket(bucketName);
            if (error || !data) {
                const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
                    public: true,
                    fileSizeLimit: 52428800 // 50MB
                });
                if (createError) {
                    console.error(`Failed to create bucket "${bucketName}":`, createError.message);
                } else {
                    console.log(`Successfully created public Supabase bucket: "${bucketName}"`);
                }
            } else {
                console.log(`Supabase bucket "${bucketName}" already exists.`);
            }
        } catch (e) {
            console.error(`Error checking/creating bucket "${bucketName}":`, e.message);
        }
    }
}

// Start Server & Run Seeder
app.listen(PORT, async () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    await initializeSupabaseStorage();
    await seedSupabaseDatabase();
});

module.exports = app;
