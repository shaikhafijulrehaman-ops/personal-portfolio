const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client with fallback support
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    try {
        supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        console.log("Supabase Client initialized successfully!");
    } catch (err) {
        console.error("Failed to initialize Supabase client:", err);
    }
} else {
    console.warn("Supabase credentials missing from environment. Falling back to MongoDB for UXI.");
}

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_fallback';

// Middleware
app.use(cors());
app.use(express.json());

// Static serving of frontend files is removed (handled separately by frontend project)
// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create local uploads folder structures if they don't exist
const mediaDir = path.join(__dirname, 'uploads', 'media');
const resumeDir = path.join(__dirname, 'uploads', 'resumes');
try {
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
    if (!fs.existsSync(resumeDir)) fs.mkdirSync(resumeDir, { recursive: true });
} catch (e) {
    console.warn("Could not create local upload directories (expected in serverless environments):", e.message);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, resumeDir);
        } else {
            cb(null, mediaDir);
        }
    },
    filename: (req, file, cb) => {
        const fileExt = path.extname(file.originalname);
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}${fileExt}`;
        cb(null, fileName);
    }
});
const upload = multer({ storage });

// ==========================================
// Mongoose Models & Schemas
// ==========================================

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    recovery_email: { type: String, default: 'shaikhafizulrehaman@gmail.com' },
    session_timeout: { type: Number, default: 30 },
    token_version: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

const BackupSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    data: { type: mongoose.Schema.Types.Mixed, required: true }
});
const Backup = mongoose.model('Backup', BackupSchema);

const HeroSchema = new mongoose.Schema({
    name: { type: String, default: 'Shaik Hafijulrehaman' },
    tagline: { type: String, default: 'AI/ML Student | Full Stack Web Developer | Co-Founder @ UXI' },
    description: { type: String, default: 'I am a passionate Artificial Intelligence & Machine Learning student with a strong interest in Full Stack Development, AI Applications, and building scalable digital solutions.' },
    resume_url: { type: String, default: 'resume.pdf' },
    avatar_url: { type: String, default: 'images/removed_bg_hafi.png' },
    background_url: { type: String, default: '' },
    background_type: { type: String, default: 'image' },
    video_path: { type: String, default: '' },
    overlay_color: { type: String, default: '#000000' },
    overlay_opacity: { type: Number, default: 0.5 },
    brightness: { type: Number, default: 100 },
    contrast: { type: Number, default: 100 },
    blur: { type: Number, default: 0 }
});
const Hero = mongoose.model('Hero', HeroSchema);

const AboutSchema = new mongoose.Schema({
    title: { type: String, default: 'About Me' },
    description: { type: String, default: 'I am currently pursuing B.Tech in Artificial Intelligence & Machine Learning at DVR & Dr. HS MIC College of Technology...' },
    college: { type: String, default: 'DVR & Dr. HS MIC College of Technology' },
    degree: { type: String, default: 'B.Tech' },
    current_year: { type: String, default: '3rd Year' },
    cgpa: { type: Number, default: 8.8 },
    location: { type: String, default: 'Vijayawada, Andhra Pradesh, India' },
    email: { type: String, default: 'shaikhafizulrehaman@gmail.com' },
    phone: { type: String, default: '+91 9959593027' },
    image_url: { type: String, default: 'images/removed_bg_hafi.png' }
});
const About = mongoose.model('About', AboutSchema);

const SkillSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    icon_class: { type: String, default: 'fa-solid fa-code' },
    color: { type: String, default: '#ffffff' },
    display_order: { type: Number, default: 0 },
    is_visible: { type: Boolean, default: true }
});
const Skill = mongoose.model('Skill', SkillSchema);

const ProjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    short_desc: { type: String, required: true },
    long_desc: String,
    technologies: [String],
    category: { type: String, default: 'Frontend' },
    github_link: { type: String, default: '#' },
    live_link: { type: String, default: '#' },
    image_url: { type: String, default: '' },
    is_featured: { type: Boolean, default: false },
    display_order: { type: Number, default: 0 },
    status: { type: String, default: 'Completed' }, // 'Completed', 'Upcoming', 'Draft'
    completion_date: { type: String, default: '' },
    dev_stage: { type: String, default: 'Planning' }, // 'Planning', 'UI Design', 'Development', 'Testing'
    expected_release: { type: String, default: '' },
    coming_soon: { type: Boolean, default: false },
    progress_percent: { type: Number, default: 0 },
    expected_features: [String]
});
const Project = mongoose.model('Project', ProjectSchema);

const UXIGeneralSchema = new mongoose.Schema({
    logo_url: { type: String, default: 'images/uxi_website.png' },
    about_copy: { type: String, default: 'UXI (Unified eXperience Intelligence) co-founded by passionate developers building modern digital solutions.' },
    about_title: { type: String, default: 'About UXI' },
    about_story: { type: String, default: 'UXI co-founded by passionate developers building modern digital solutions.' },
    mission: { type: String, default: 'To empower organizations with intelligence-driven experiences.' },
    vision: { type: String, default: 'A future where technology and human experience blend seamlessly.' },
    founded_year: { type: String, default: '2026' },
    email: { type: String, default: 'contact@uxitech.in' },
    phone: { type: String, default: '+91 9959593027' },
    location: { type: String, default: 'Vijayawada, Andhra Pradesh, India' },
    website_link: { type: String, default: 'https://uxitech.in' },
    
    // Hero details
    hero_title: { type: String, default: 'UXI' },
    hero_subtitle: { type: String, default: 'Unified eXperience Intelligence' },
    hero_desc: { type: String, default: 'Building modern digital experiences through AI, Web Development and scalable software solutions.' },

    // Socials
    linkedin: { type: String, default: '#' },
    github: { type: String, default: '#' },
    instagram: { type: String, default: '#' },
    whatsapp: { type: String, default: '#' },

    // SEO
    seo_title: { type: String, default: 'UXI – Unified eXperience Intelligence' },
    seo_desc: { type: String, default: 'Building modern digital experiences through AI, Web Development and scalable software solutions.' },
    seo_keywords: { type: String, default: 'UXI, AI, Web Development' },

    // Footer
    footer_text: { type: String, default: '© UXI – Unified eXperience Intelligence' },
    footer_btn_text: { type: String, default: 'Visit UXITECH' },
    footer_btn_link: { type: String, default: 'https://uxitech.in' },
    footer_tagline: { type: String, default: 'Empowering the next generation of seamless web experiences.' }
});
const UXIGeneral = mongoose.model('UXIGeneral', UXIGeneralSchema);

const UXITeamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, required: true },
    bio: String,
    responsibilities: String,
    skills: [String],
    linkedin_link: { type: String, default: '#' },
    github_link: { type: String, default: '#' },
    photo_url: { type: String, default: '' },
    display_order: { type: Number, default: 0 }
});
const UXITeam = mongoose.model('UXITeam', UXITeamSchema);

const UXIProjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    technologies: [String],
    github_link: { type: String, default: '#' },
    live_link: { type: String, default: '#' },
    image_url: { type: String, default: '' },
    status: { type: String, default: 'Completed' }, // 'Completed' or 'Upcoming'
    completion_date: { type: String, default: '' },
    dev_stage: { type: String, default: 'Planning' },
    expected_release: { type: String, default: '' },
    coming_soon: { type: Boolean, default: false },
    progress_percent: { type: Number, default: 0 },
    expected_features: [String],
    display_order: { type: Number, default: 0 }
});
const UXIProject = mongoose.model('UXIProject', UXIProjectSchema);

const TimelineSchema = new mongoose.Schema({
    title: { type: String, required: true },
    company: String,
    description: String,
    start_date: { type: String, required: true },
    end_date: { type: String, default: 'Present' },
    badge: { type: String, default: 'Experience' },
    display_order: { type: Number, default: 0 },
    logo_url: { type: String, default: '' }
});
const Timeline = mongoose.model('Timeline', TimelineSchema);

const CertificateSchema = new mongoose.Schema({
    title: { type: String, required: true },
    organization: { type: String, required: true },
    issue_date: { type: String, required: true },
    credential_link: { type: String, default: '#' },
    image_url: { type: String, default: 'images/cert_placeholder.png' },
    display_order: { type: Number, default: 0 },
    is_visible: { type: Boolean, default: true }
});
const Certificate = mongoose.model('Certificate', CertificateSchema);

const ContactSchema = new mongoose.Schema({
    phone: { type: String, default: '+91 9959593027' },
    email: { type: String, default: 'shaikhafizulrehaman@gmail.com' },
    location: { type: String, default: 'Vijayawada, Andhra Pradesh, India' }
});
const Contact = mongoose.model('Contact', ContactSchema);

const SocialLinkSchema = new mongoose.Schema({
    github: { type: String, default: 'https://github.com/shaikhafijulrehaman-ops' },
    linkedin: { type: String, default: 'https://www.linkedin.com/in/shaik-hafijulrehaman-b78793358' },
    whatsapp: { type: String, default: 'https://wa.me/919959593027' }
});
const SocialLink = mongoose.model('SocialLink', SocialLinkSchema);

const SEOSchema = new mongoose.Schema({
    title: { type: String, default: 'Shaik Hafijulrehaman | AI/ML Student & Full Stack Developer' },
    description: { type: String, default: 'Building AI-powered applications and modern web experiences.' },
    keywords: { type: String, default: 'AI/ML Student, Full Stack Developer, Shaik Hafijulrehaman' },
    image_url: { type: String, default: '' },
    favicon_url: { type: String, default: '' }
});
const SEO = mongoose.model('SEO', SEOSchema);

const WebsiteSettingsSchema = new mongoose.Schema({
    portfolio_favicon_url: { type: String, default: '' },
    uxi_favicon_url: { type: String, default: '' },
    admin_favicon_url: { type: String, default: '' }
});
const WebsiteSettings = mongoose.model('WebsiteSettings', WebsiteSettingsSchema);

const MobileFABMenuItemSchema = new mongoose.Schema({
    label: { type: String, required: true },
    icon_class: { type: String, required: true },
    url: { type: String, required: true }
});

const MobileFABSettingsSchema = new mongoose.Schema({
    is_enabled: { type: Boolean, default: true },
    custom_image_url: { type: String, default: '' },
    icon_class: { type: String, default: 'fa-solid fa-bars' },
    button_size: { type: Number, default: 60 },
    position: { type: String, default: 'bottom-right' },
    bg_color: { type: String, default: '#2563eb' },
    border_radius: { type: Number, default: 50 }, // in percentage
    glow_effect: { type: Boolean, default: true },
    animation_type: { type: String, default: 'pulse' },
    menu_items: { type: [MobileFABMenuItemSchema], default: [] }
});
const MobileFABSettings = mongoose.model('MobileFABSettings', MobileFABSettingsSchema);

const MobileNavigationItemSchema = new mongoose.Schema({
    label: { type: String, required: true },
    description: { type: String, default: '' },
    icon_class: { type: String, required: true },
    url: { type: String, required: true },
    target_type: { type: String, default: 'scroll' }, // scroll or link
    is_enabled: { type: Boolean, default: true }
});

const MobileNavigationSettingsSchema = new mongoose.Schema({
    is_enabled: { type: Boolean, default: true },
    is_fab_enabled: { type: Boolean, default: true },
    custom_image_url: { type: String, default: '' },
    icon_class: { type: String, default: 'fa-solid fa-compass' },
    button_size: { type: Number, default: 60 },
    position: { type: String, default: 'bottom-right' }, // bottom-right or bottom-left
    bg_color: { type: String, default: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
    border_style: { type: String, default: '1px solid rgba(255, 255, 255, 0.2)' },
    shadow_style: { type: String, default: '0 8px 32px 0 rgba(31, 38, 135, 0.3)' },
    animation_type: { type: String, default: 'pulse' },
    menu_items: { type: [MobileNavigationItemSchema], default: [] }
});
const MobileNavigationSettings = mongoose.model('MobileNavigationSettings', MobileNavigationSettingsSchema);

const BackgroundSettingsSchema = new mongoose.Schema({
    hero_bg_type: { type: String, default: 'image' }, // 'image' or 'video'
    hero_bg_image: { type: String, default: '' },
    hero_bg_video: { type: String, default: '' },
    about_bg_image: { type: String, default: '' },
    projects_bg_image: { type: String, default: '' },
    uxi_bg_image: { type: String, default: '' },
    contact_bg_image: { type: String, default: '' }
});
const BackgroundSettings = mongoose.model('BackgroundSettings', BackgroundSettingsSchema);

const ActivityLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    details: { type: String, required: true },
    ip_address: { type: String }
});
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

async function logActivity(action, details, req) {
    try {
        const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : 'System';
        const log = new ActivityLog({ action, details, ip_address: ip });
        await log.save();
    } catch (e) {
        console.error("Activity logging failed:", e);
    }
}

// ==========================================
// Authentication Middleware
// ==========================================

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token missing' });

    jwt.verify(token, JWT_SECRET, async (err, payload) => {
        if (err) return res.status(403).json({ error: 'Token invalid or expired' });
        
        try {
            const user = await User.findById(payload.id);
            if (!user || user.token_version !== payload.token_version) {
                return res.status(403).json({ error: 'Session invalidated or user not found' });
            }
            req.user = user;
            next();
        } catch (dbErr) {
            res.status(500).json({ error: 'Database error verifying token' });
        }
    });
}

// ==========================================
// Authentication Routes
// ==========================================

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: 'User does not exist.' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Incorrect password.' });

        const token = jwt.sign({ id: user._id, username: user.username, token_version: user.token_version }, JWT_SECRET, { expiresIn: '24h' });
        await logActivity('Login', `Administrator logged in: ${user.username}`, req);
        res.json({ token });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ 
        username: req.user.username,
        recovery_email: req.user.recovery_email,
        session_timeout: req.user.session_timeout || 30
    });
});

// ==========================================
// Admin Panel Settings, Backups, and Exports
// ==========================================

app.get('/api/admin/settings', authenticateToken, (req, res) => {
    res.json({
        username: req.user.username,
        recovery_email: req.user.recovery_email,
        session_timeout: req.user.session_timeout || 30
    });
});

app.get('/api/admin/activity', authenticateToken, async (req, res) => {
    try {
        const logs = await ActivityLog.find({}).sort({ timestamp: -1 }).limit(150);
        res.json(logs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/settings', authenticateToken, async (req, res) => {
    const { username, password, recovery_email, session_timeout } = req.body;
    try {
        const user = req.user;
        if (username) {
            if (username !== user.username) {
                const exists = await User.findOne({ username });
                if (exists) return res.status(400).json({ error: 'Username already taken.' });
                user.username = username;
            }
        }
        if (password) {
            user.password = await bcrypt.hash(password, 10);
            user.token_version += 1;
        }
        if (recovery_email) user.recovery_email = recovery_email;
        if (session_timeout) user.session_timeout = Number(session_timeout);
        
        await user.save();
        await logActivity('Edit', 'Updated administrator credentials / settings', req);
        
        const token = jwt.sign({ id: user._id, username: user.username, token_version: user.token_version }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/logout-all', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        user.token_version += 1;
        await user.save();
        await logActivity('Login', 'Logged out all active device sessions', req);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/export', authenticateToken, async (req, res) => {
    try {
        const [hero, about, skills, projects, timeline, certificates, contact, socials, seo, website, mobilenav, backgrounds, uxiGeneral, uxiTeam, uxiProjects] = await Promise.all([
            Hero.find({}), About.find({}), Skill.find({}), Project.find({}), Timeline.find({}), Certificate.find({}),
            Contact.find({}), SocialLink.find({}), SEO.find({}), WebsiteSettings.find({}), MobileNavigationSettings.find({}),
            BackgroundSettings.find({}), UXIGeneral.find({}), UXITeam.find({}), UXIProject.find({})
        ]);
        res.json({
            hero, about, skills, projects, timeline, certificates, contact, socials, seo, website, mobilenav, backgrounds, uxiGeneral, uxiTeam, uxiProjects
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/import', authenticateToken, async (req, res) => {
    const data = req.body;
    try {
        if (data.hero) { await Hero.deleteMany({}); await Hero.insertMany(data.hero); }
        if (data.about) { await About.deleteMany({}); await About.insertMany(data.about); }
        if (data.skills) { await Skill.deleteMany({}); await Skill.insertMany(data.skills); }
        if (data.projects) { await Project.deleteMany({}); await Project.insertMany(data.projects); }
        if (data.timeline) { await Timeline.deleteMany({}); await Timeline.insertMany(data.timeline); }
        if (data.certificates) { await Certificate.deleteMany({}); await Certificate.insertMany(data.certificates); }
        if (data.contact) { await Contact.deleteMany({}); await Contact.insertMany(data.contact); }
        if (data.socials) { await SocialLink.deleteMany({}); await SocialLink.insertMany(data.socials); }
        if (data.seo) { await SEO.deleteMany({}); await SEO.insertMany(data.seo); }
        if (data.website) { await WebsiteSettings.deleteMany({}); await WebsiteSettings.insertMany(data.website); }
        if (data.mobilenav) { await MobileNavigationSettings.deleteMany({}); await MobileNavigationSettings.insertMany(data.mobilenav); }
        if (data.backgrounds) { await BackgroundSettings.deleteMany({}); await BackgroundSettings.insertMany(data.backgrounds); }
        if (data.uxiGeneral) { await UXIGeneral.deleteMany({}); await UXIGeneral.insertMany(data.uxiGeneral); }
        if (data.uxiTeam) { await UXITeam.deleteMany({}); await UXITeam.insertMany(data.uxiTeam); }
        if (data.uxiProjects) { await UXIProject.deleteMany({}); await UXIProject.insertMany(data.uxiProjects); }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/backup', authenticateToken, async (req, res) => {
    try {
        const [hero, about, skills, projects, timeline, certificates, contact, socials, seo, website, mobilenav, backgrounds, uxiGeneral, uxiTeam, uxiProjects] = await Promise.all([
            Hero.find({}), About.find({}), Skill.find({}), Project.find({}), Timeline.find({}), Certificate.find({}),
            Contact.find({}), SocialLink.find({}), SEO.find({}), WebsiteSettings.find({}), MobileNavigationSettings.find({}),
            BackgroundSettings.find({}), UXIGeneral.find({}), UXITeam.find({}), UXIProject.find({})
        ]);
        const snapshot = {
            hero, about, skills, projects, timeline, certificates, contact, socials, seo, website, mobilenav, backgrounds, uxiGeneral, uxiTeam, uxiProjects
        };
        const backup = new Backup({ data: snapshot });
        await backup.save();
        await logActivity('Publish', `Created database backup snapshot (ID: ${backup._id})`, req);
        res.json({ success: true, timestamp: backup.timestamp, id: backup._id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/backups', authenticateToken, async (req, res) => {
    try {
        const backups = await Backup.find({}, { timestamp: 1 }).sort({ timestamp: -1 });
        res.json(backups);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/restore/:id', authenticateToken, async (req, res) => {
    try {
        const backup = await Backup.findById(req.params.id);
        if (!backup) return res.status(404).json({ error: 'Backup not found' });
        const data = backup.data;
        if (data.hero) { await Hero.deleteMany({}); await Hero.insertMany(data.hero); }
        if (data.about) { await About.deleteMany({}); await About.insertMany(data.about); }
        if (data.skills) { await Skill.deleteMany({}); await Skill.insertMany(data.skills); }
        if (data.projects) { await Project.deleteMany({}); await Project.insertMany(data.projects); }
        if (data.timeline) { await Timeline.deleteMany({}); await Timeline.insertMany(data.timeline); }
        if (data.certificates) { await Certificate.deleteMany({}); await Certificate.insertMany(data.certificates); }
        if (data.contact) { await Contact.deleteMany({}); await Contact.insertMany(data.contact); }
        if (data.socials) { await SocialLink.deleteMany({}); await SocialLink.insertMany(data.socials); }
        if (data.seo) { await SEO.deleteMany({}); await SEO.insertMany(data.seo); }
        if (data.website) { await WebsiteSettings.deleteMany({}); await WebsiteSettings.insertMany(data.website); }
        if (data.mobilenav) { await MobileNavigationSettings.deleteMany({}); await MobileNavigationSettings.insertMany(data.mobilenav); }
        if (data.backgrounds) { await BackgroundSettings.deleteMany({}); await BackgroundSettings.insertMany(data.backgrounds); }
        if (data.uxiGeneral) { await UXIGeneral.deleteMany({}); await UXIGeneral.insertMany(data.uxiGeneral); }
        if (data.uxiTeam) { await UXITeam.deleteMany({}); await UXITeam.insertMany(data.uxiTeam); }
        if (data.uxiProjects) { await UXIProject.deleteMany({}); await UXIProject.insertMany(data.uxiProjects); }
        await logActivity('Publish', `Restored database from snapshot (Date: ${new Date(backup.timestamp).toLocaleString()})`, req);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/backups/:id', authenticateToken, async (req, res) => {
    try {
        await Backup.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// CRUD API Routes
// ==========================================

// Dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const [projCount, skillCount, certCount, timelineCount] = await Promise.all([
            Project.countDocuments(),
            Skill.countDocuments(),
            Certificate.countDocuments(),
            Timeline.countDocuments()
        ]);
        res.json({ projects: projCount, skills: skillCount, certificates: certCount, timeline: timelineCount });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Hero Section
// Hero Section
app.get('/api/hero', async (req, res) => {
    let heroData = null;
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('hero')
                .select('*')
                .limit(1)
                .maybeSingle();
            if (!error && data) {
                // Map Supabase fields to match MongoDB schema fields
                heroData = {
                    _id: data.id,
                    name: data.name,
                    tagline: data.tagline,
                    description: data.description,
                    avatar_url: data.avatar_url,
                    background_url: data.image_path || '',
                    background_type: data.background_type || 'image',
                    video_path: data.video_path || '',
                    overlay_color: data.overlay_color || '#000000',
                    overlay_opacity: data.overlay_opacity !== undefined ? data.overlay_opacity : 0.5,
                    brightness: data.brightness !== undefined ? data.brightness : 100,
                    contrast: data.contrast !== undefined ? data.contrast : 100,
                    blur: data.blur !== undefined ? data.blur : 0
                };
            }
        } catch (e) {
            console.error("Failed to load hero settings from Supabase:", e.message);
        }
    }

    if (!heroData) {
        // Fallback to MongoDB
        const hero = await Hero.findOne() || new Hero();
        heroData = hero;
    }
    res.json(heroData);
});
app.post('/api/hero', authenticateToken, async (req, res) => {
    const { 
        name, tagline, description, avatar_url, background_url,
        background_type, video_path, overlay_color, overlay_opacity,
        brightness, contrast, blur 
    } = req.body;

    let hero = await Hero.findOne();
    if (!hero) hero = new Hero();
    
    hero.name = name;
    hero.tagline = tagline;
    hero.description = description;
    hero.avatar_url = avatar_url;
    hero.background_url = background_url || '';
    hero.background_type = background_type || 'image';
    hero.video_path = video_path || '';
    hero.overlay_color = overlay_color || '#000000';
    hero.overlay_opacity = overlay_opacity !== undefined ? Number(overlay_opacity) : 0.5;
    hero.brightness = brightness !== undefined ? Number(brightness) : 100;
    hero.contrast = contrast !== undefined ? Number(contrast) : 100;
    hero.blur = blur !== undefined ? Number(blur) : 0;
    await hero.save();

    if (supabase) {
        try {
            // Find existing to get ID (upsert handles updates based on PK)
            const { data: existing } = await supabase.from('hero').select('id').limit(1);
            const record = {
                name,
                tagline,
                description,
                avatar_url,
                image_path: background_url || '',
                background_type: background_type || 'image',
                video_path: video_path || '',
                overlay_color: overlay_color || '#000000',
                overlay_opacity: overlay_opacity !== undefined ? Number(overlay_opacity) : 0.5,
                brightness: brightness !== undefined ? Number(brightness) : 100,
                contrast: contrast !== undefined ? Number(contrast) : 100,
                blur: blur !== undefined ? Number(blur) : 0
            };
            if (existing && existing.length > 0) {
                record.id = existing[0].id;
            }
            const { error } = await supabase.from('hero').upsert(record);
            if (error) console.error("Supabase upsert hero error:", error);
        } catch (e) {
            console.error("Failed to sync hero settings to Supabase:", e.message);
        }
    }

    res.json(hero);
});

// About Section
app.get('/api/about', async (req, res) => {
    const about = await About.findOne() || new About();
    res.json(about);
});
app.post('/api/about', authenticateToken, async (req, res) => {
    const { title, description, college, degree, current_year, cgpa, location, email, phone, image_url } = req.body;
    let about = await About.findOne();
    if (!about) about = new About();
    about.title = title;
    about.description = description;
    about.college = college;
    about.degree = degree;
    about.current_year = current_year;
    about.cgpa = cgpa;
    about.location = location;
    about.email = email;
    about.phone = phone;
    about.image_url = image_url;
    await about.save();
    res.json(about);
});

// Skills Section
app.get('/api/skills', async (req, res) => {
    const skills = await Skill.find().sort('display_order');
    res.json(skills);
});
app.get('/api/skills/:id', async (req, res) => {
    try {
        const skill = await Skill.findById(req.params.id);
        if (!skill) return res.status(404).json({ error: 'Skill not found' });
        res.json(skill);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post('/api/skills', authenticateToken, async (req, res) => {
    const { name, category, icon_class, color, is_visible } = req.body;
    const order = await Skill.countDocuments();
    const skill = new Skill({ name, category, icon_class, color, is_visible, display_order: order });
    await skill.save();
    res.json(skill);
});
app.put('/api/skills/reorder', authenticateToken, async (req, res) => {
    const { orders } = req.body; // Array of IDs in order
    try {
        const promises = orders.map((id, index) => 
            Skill.findByIdAndUpdate(id, { display_order: index })
        );
        await Promise.all(promises);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.put('/api/skills/:id', authenticateToken, async (req, res) => {
    const { name, category, icon_class, color, is_visible } = req.body;
    const skill = await Skill.findByIdAndUpdate(req.params.id, {
        name, category, icon_class, color, is_visible
    }, { new: true });
    res.json(skill);
});
app.delete('/api/skills/:id', authenticateToken, async (req, res) => {
    await Skill.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// Projects Section
app.get('/api/projects', async (req, res) => {
    const projects = await Project.find().sort('display_order');
    res.json(projects);
});
app.get('/api/projects/:id', async (req, res) => {
    try {
        const proj = await Project.findById(req.params.id);
        if (!proj) return res.status(404).json({ error: 'Project not found' });
        res.json(proj);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post('/api/projects', authenticateToken, async (req, res) => {
    const { name, short_desc, long_desc, technologies, category, github_link, live_link, image_url, is_featured, status, completion_date, dev_stage, expected_release, coming_soon, progress_percent, expected_features } = req.body;
    const order = await Project.countDocuments();
    const proj = new Project({ 
        name, short_desc, long_desc, technologies, category, github_link, live_link, image_url, is_featured, status,
        completion_date, dev_stage, expected_release, coming_soon, progress_percent, expected_features,
        display_order: order 
    });
    await proj.save();
    res.json(proj);
});
app.put('/api/projects/reorder', authenticateToken, async (req, res) => {
    const { orders } = req.body;
    try {
        const promises = orders.map((id, index) => 
            Project.findByIdAndUpdate(id, { display_order: index })
        );
        await Promise.all(promises);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
    const { name, short_desc, long_desc, technologies, category, github_link, live_link, image_url, is_featured, status, completion_date, dev_stage, expected_release, coming_soon, progress_percent, expected_features } = req.body;
    const proj = await Project.findByIdAndUpdate(req.params.id, {
        name, short_desc, long_desc, technologies, category, github_link, live_link, image_url, is_featured, status,
        completion_date, dev_stage, expected_release, coming_soon, progress_percent, expected_features
    }, { new: true });
    res.json(proj);
});
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// Timeline Section
app.get('/api/timeline', async (req, res) => {
    const timeline = await Timeline.find().sort('display_order');
    res.json(timeline);
});
app.get('/api/timeline/:id', async (req, res) => {
    try {
        const item = await Timeline.findById(req.params.id);
        if (!item) return res.status(404).json({ error: 'Timeline entry not found' });
        res.json(item);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post('/api/timeline', authenticateToken, async (req, res) => {
    const { title, company, description, start_date, end_date, badge, logo_url } = req.body;
    const order = await Timeline.countDocuments();
    const item = new Timeline({ title, company, description, start_date, end_date, badge, display_order: order, logo_url });
    await item.save();
    res.json(item);
});
app.put('/api/timeline/:id', authenticateToken, async (req, res) => {
    const { title, company, description, start_date, end_date, badge, logo_url } = req.body;
    const item = await Timeline.findByIdAndUpdate(req.params.id, {
        title, company, description, start_date, end_date, badge, logo_url
    }, { new: true });
    res.json(item);
});
app.delete('/api/timeline/:id', authenticateToken, async (req, res) => {
    await Timeline.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.put('/api/timeline/reorder', authenticateToken, async (req, res) => {
    const { orders } = req.body;
    try {
        const promises = orders.map((id, index) => 
            Timeline.findByIdAndUpdate(id, { display_order: index })
        );
        await Promise.all(promises);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Certifications Section
app.get('/api/certificates', async (req, res) => {
    const certs = await Certificate.find().sort('display_order');
    res.json(certs);
});
app.get('/api/certificates/:id', async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.id);
        if (!cert) return res.status(404).json({ error: 'Certificate not found' });
        res.json(cert);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post('/api/certificates', authenticateToken, async (req, res) => {
    const { title, organization, issue_date, credential_link, image_url, is_visible } = req.body;
    const order = await Certificate.countDocuments();
    const cert = new Certificate({ title, organization, issue_date, credential_link, image_url, is_visible, display_order: order });
    await cert.save();
    res.json(cert);
});
app.put('/api/certificates/:id', authenticateToken, async (req, res) => {
    const { title, organization, issue_date, credential_link, image_url, is_visible } = req.body;
    const cert = await Certificate.findByIdAndUpdate(req.params.id, {
        title, organization, issue_date, credential_link, image_url, is_visible
    }, { new: true });
    res.json(cert);
});
app.delete('/api/certificates/:id', authenticateToken, async (req, res) => {
    await Certificate.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.put('/api/certificates/reorder', authenticateToken, async (req, res) => {
    const { orders } = req.body;
    try {
        const promises = orders.map((id, index) => 
            Certificate.findByIdAndUpdate(id, { display_order: index })
        );
        await Promise.all(promises);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Contact Section
app.get('/api/contact', async (req, res) => {
    const contact = await Contact.findOne() || new Contact();
    res.json(contact);
});
app.post('/api/contact', authenticateToken, async (req, res) => {
    const { phone, email, location } = req.body;
    let contact = await Contact.findOne();
    if (!contact) contact = new Contact();
    contact.phone = phone;
    contact.email = email;
    contact.location = location;
    await contact.save();
    res.json(contact);
});

// Social Links Section
app.get('/api/socials', async (req, res) => {
    const socials = await SocialLink.findOne() || new SocialLink();
    res.json(socials);
});
app.post('/api/socials', authenticateToken, async (req, res) => {
    const { github, linkedin, whatsapp } = req.body;
    let socials = await SocialLink.findOne();
    if (!socials) socials = new SocialLink();
    socials.github = github;
    socials.linkedin = linkedin;
    socials.whatsapp = whatsapp;
    await socials.save();
    res.json(socials);
});

// SEO Settings
app.get('/api/seo', async (req, res) => {
    const seo = await SEO.findOne() || new SEO();
    res.json(seo);
});
app.post('/api/seo', authenticateToken, async (req, res) => {
    const { title, description, keywords, image_url, favicon_url } = req.body;
    let seo = await SEO.findOne();
    if (!seo) seo = new SEO();
    seo.title = title;
    seo.description = description;
    seo.keywords = keywords;
    seo.image_url = image_url || '';
    seo.favicon_url = favicon_url || '';
    await seo.save();
    res.json(seo);
});

// Website Settings Section
app.get('/api/settings', async (req, res) => {
    const settings = await WebsiteSettings.findOne() || new WebsiteSettings();
    res.json(settings);
});

app.post('/api/settings', authenticateToken, async (req, res) => {
    const { portfolio_favicon_url, uxi_favicon_url, admin_favicon_url } = req.body;
    let settings = await WebsiteSettings.findOne();
    if (!settings) settings = new WebsiteSettings();
    settings.portfolio_favicon_url = portfolio_favicon_url || '';
    settings.uxi_favicon_url = uxi_favicon_url || '';
    settings.admin_favicon_url = admin_favicon_url || '';
    await settings.save();
    res.json(settings);
});

// Mobile FAB Settings Section
app.get('/api/settings/fab', async (req, res) => {
    let fabData = null;
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('mobile_fab_settings')
                .select('*')
                .limit(1)
                .maybeSingle();
            if (!error && data) {
                fabData = {
                    _id: data.id,
                    is_enabled: data.is_enabled,
                    custom_image_url: data.custom_image_url || '',
                    icon_class: data.icon_class || 'fa-solid fa-bars',
                    button_size: data.button_size !== undefined ? data.button_size : 60,
                    position: data.position || 'bottom-right',
                    bg_color: data.bg_color || '#2563eb',
                    border_radius: data.border_radius !== undefined ? data.border_radius : 50,
                    glow_effect: data.glow_effect !== undefined ? data.glow_effect : true,
                    animation_type: data.animation_type || 'pulse',
                    menu_items: typeof data.menu_items === 'string' ? JSON.parse(data.menu_items) : (data.menu_items || [])
                };
            }
        } catch (e) {
            console.error("Failed to load FAB settings from Supabase:", e.message);
        }
    }

    if (!fabData) {
        // Fallback to MongoDB
        let fab = await MobileFABSettings.findOne();
        if (!fab) {
            fab = new MobileFABSettings({
                is_enabled: true,
                custom_image_url: '',
                icon_class: 'fa-solid fa-bars',
                button_size: 60,
                position: 'bottom-right',
                bg_color: '#2563eb',
                border_radius: 50,
                glow_effect: true,
                animation_type: 'pulse',
                menu_items: [
                    { label: 'GitHub', icon_class: 'fa-brands fa-github', url: 'https://github.com' },
                    { label: 'LinkedIn', icon_class: 'fa-brands fa-linkedin', url: 'https://linkedin.com' },
                    { label: 'Email', icon_class: 'fa-solid fa-envelope', url: 'mailto:test@example.com' },
                    { label: 'WhatsApp', icon_class: 'fa-brands fa-whatsapp', url: 'https://wa.me/1234567890' },
                    { label: 'Resume', icon_class: 'fa-solid fa-file-pdf', url: '/resume.pdf' },
                    { label: 'Call', icon_class: 'fa-solid fa-phone', url: 'tel:+1234567890' }
                ]
            });
            await fab.save();
        }
        fabData = fab;
    }
    res.json(fabData);
});

app.post('/api/settings/fab', authenticateToken, async (req, res) => {
    const {
        is_enabled, custom_image_url, icon_class, button_size,
        position, bg_color, border_radius, glow_effect, animation_type,
        menu_items
    } = req.body;

    let fab = await MobileFABSettings.findOne();
    if (!fab) fab = new MobileFABSettings();

    fab.is_enabled = is_enabled !== undefined ? !!is_enabled : true;
    fab.custom_image_url = custom_image_url || '';
    fab.icon_class = icon_class || 'fa-solid fa-bars';
    fab.button_size = button_size !== undefined ? Number(button_size) : 60;
    fab.position = position || 'bottom-right';
    fab.bg_color = bg_color || '#2563eb';
    fab.border_radius = border_radius !== undefined ? Number(border_radius) : 50;
    fab.glow_effect = glow_effect !== undefined ? !!glow_effect : true;
    fab.animation_type = animation_type || 'pulse';
    fab.menu_items = menu_items || [];
    await fab.save();

    if (supabase) {
        try {
            const { data: existing } = await supabase.from('mobile_fab_settings').select('id').limit(1);
            const record = {
                is_enabled: is_enabled !== undefined ? !!is_enabled : true,
                custom_image_url: custom_image_url || '',
                icon_class: icon_class || 'fa-solid fa-bars',
                button_size: button_size !== undefined ? Number(button_size) : 60,
                position: position || 'bottom-right',
                bg_color: bg_color || '#2563eb',
                border_radius: border_radius !== undefined ? Number(border_radius) : 50,
                glow_effect: glow_effect !== undefined ? !!glow_effect : true,
                animation_type: animation_type || 'pulse',
                menu_items: menu_items || []
            };
            if (existing && existing.length > 0) {
                record.id = existing[0].id;
            }
            const { error } = await supabase.from('mobile_fab_settings').upsert(record);
            if (error) console.error("Supabase upsert mobile_fab_settings error:", error);
        } catch (e) {
            console.error("Failed to sync FAB settings to Supabase:", e.message);
        }
    }

    res.json(fab);
});

// Mobile Navigation Settings Section
app.get('/api/settings/mobile-nav', async (req, res) => {
    let navData = null;
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('mobile_navigation_settings')
                .select('*')
                .limit(1)
                .maybeSingle();
            if (!error && data) {
                navData = {
                    _id: data.id,
                    is_enabled: data.is_enabled,
                    is_fab_enabled: data.is_fab_enabled,
                    custom_image_url: data.custom_image_url || '',
                    icon_class: data.icon_class || 'fa-solid fa-compass',
                    button_size: data.button_size !== undefined ? data.button_size : 60,
                    position: data.position || 'bottom-right',
                    bg_color: data.bg_color || 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    border_style: data.border_style || '1px solid rgba(255, 255, 255, 0.2)',
                    shadow_style: data.shadow_style || '0 8px 32px 0 rgba(31, 38, 135, 0.3)',
                    animation_type: data.animation_type || 'pulse',
                    menu_items: typeof data.menu_items === 'string' ? JSON.parse(data.menu_items) : (data.menu_items || [])
                };
            }
        } catch (e) {
            console.error("Failed to load Mobile Navigation settings from Supabase:", e.message);
        }
    }

    if (!navData) {
        // Fallback to MongoDB
        let nav = await MobileNavigationSettings.findOne();
        if (!nav) {
            nav = new MobileNavigationSettings({
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
                menu_items: [
                    { label: "Home", description: "Return to Hero Section", icon_class: "fa-solid fa-house", url: "#home", target_type: "scroll", is_enabled: true },
                    { label: "About", description: "Learn more about me", icon_class: "fa-solid fa-user", url: "#about", target_type: "scroll", is_enabled: true },
                    { label: "Skills", description: "Technologies I use", icon_class: "fa-solid fa-list-check", url: "#skills", target_type: "scroll", is_enabled: true },
                    { label: "Projects", description: "View completed projects", icon_class: "fa-solid fa-briefcase", url: "#projects", target_type: "scroll", is_enabled: true },
                    { label: "Timeline", description: "Journey & Experience", icon_class: "fa-solid fa-timeline", url: "#experience", target_type: "scroll", is_enabled: true },
                    { label: "Certifications", description: "Professional certifications", icon_class: "fa-solid fa-award", url: "#certifications", target_type: "scroll", is_enabled: true },
                    { label: "GitHub", description: "Open GitHub Profile", icon_class: "fa-brands fa-github", url: "https://github.com/shaikhafijulrehaman-ops", target_type: "link", is_enabled: true },
                    { label: "Contact", description: "Get in touch", icon_class: "fa-solid fa-envelope", url: "#contact", target_type: "scroll", is_enabled: true }
                ]
            });
            await nav.save();
        }
        navData = nav;
    }
    res.json(navData);
});

app.post('/api/settings/mobile-nav', authenticateToken, async (req, res) => {
    const {
        is_enabled, is_fab_enabled, custom_image_url, icon_class, button_size,
        position, bg_color, border_style, shadow_style, animation_type,
        menu_items
    } = req.body;

    let nav = await MobileNavigationSettings.findOne();
    if (!nav) nav = new MobileNavigationSettings();

    nav.is_enabled = is_enabled !== undefined ? !!is_enabled : true;
    nav.is_fab_enabled = is_fab_enabled !== undefined ? !!is_fab_enabled : true;
    nav.custom_image_url = custom_image_url || '';
    nav.icon_class = icon_class || 'fa-solid fa-compass';
    nav.button_size = button_size !== undefined ? Number(button_size) : 60;
    nav.position = position || 'bottom-right';
    nav.bg_color = bg_color || 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
    nav.border_style = border_style || '1px solid rgba(255, 255, 255, 0.2)';
    nav.shadow_style = shadow_style || '0 8px 32px 0 rgba(31, 38, 135, 0.3)';
    nav.animation_type = animation_type || 'pulse';
    nav.menu_items = menu_items || [];
    await nav.save();

    if (supabase) {
        try {
            const { data: existing } = await supabase.from('mobile_navigation_settings').select('id').limit(1);
            const record = {
                is_enabled: is_enabled !== undefined ? !!is_enabled : true,
                is_fab_enabled: is_fab_enabled !== undefined ? !!is_fab_enabled : true,
                custom_image_url: custom_image_url || '',
                icon_class: icon_class || 'fa-solid fa-compass',
                button_size: button_size !== undefined ? Number(button_size) : 60,
                position: position || 'bottom-right',
                bg_color: bg_color || 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                border_style: border_style || '1px solid rgba(255, 255, 255, 0.2)',
                shadow_style: shadow_style || '0 8px 32px 0 rgba(31, 38, 135, 0.3)',
                animation_type: animation_type || 'pulse',
                menu_items: menu_items || []
            };
            if (existing && existing.length > 0) {
                record.id = existing[0].id;
            }
            const { error } = await supabase.from('mobile_navigation_settings').upsert(record);
            if (error) console.error("Supabase upsert mobile_navigation_settings error:", error);
        } catch (e) {
            console.error("Failed to sync Mobile Navigation settings to Supabase:", e.message);
        }
    }

    res.json(nav);
});

// Mobile FAB/Navigation menu items CRUD
app.get('/api/mobilenav/fab', async (req, res) => {
    try {
        let nav = await MobileNavigationSettings.findOne();
        if (!nav) {
            nav = new MobileNavigationSettings();
            await nav.save();
        }
        res.json(nav.menu_items || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/mobilenav/fab/:id', async (req, res) => {
    try {
        let nav = await MobileNavigationSettings.findOne();
        if (!nav) return res.status(404).json({ error: 'Navigation settings not found' });
        const item = nav.menu_items.id(req.params.id);
        if (!item) return res.status(404).json({ error: 'Navigation item not found' });
        res.json(item);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/mobilenav/fab', authenticateToken, async (req, res) => {
    try {
        const { label, description, icon_class, url, target_type, is_active } = req.body;
        let nav = await MobileNavigationSettings.findOne();
        if (!nav) nav = new MobileNavigationSettings();
        const newItem = { label, description, icon_class, url, target_type, is_active: is_active !== undefined ? !!is_active : true };
        nav.menu_items.push(newItem);
        await nav.save();
        res.json(nav.menu_items[nav.menu_items.length - 1]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/mobilenav/fab/:id', authenticateToken, async (req, res) => {
    try {
        const { label, description, icon_class, url, target_type, is_active } = req.body;
        let nav = await MobileNavigationSettings.findOne();
        if (!nav) return res.status(404).json({ error: 'Navigation settings not found' });
        const item = nav.menu_items.id(req.params.id);
        if (!item) return res.status(404).json({ error: 'Navigation item not found' });
        
        item.label = label || item.label;
        item.description = description !== undefined ? description : item.description;
        item.icon_class = icon_class || item.icon_class;
        item.url = url || item.url;
        item.target_type = target_type || item.target_type;
        item.is_active = is_active !== undefined ? !!is_active : item.is_active;
        
        await nav.save();
        res.json(item);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/mobilenav/fab/:id', authenticateToken, async (req, res) => {
    try {
        let nav = await MobileNavigationSettings.findOne();
        if (!nav) return res.status(404).json({ error: 'Navigation settings not found' });
        nav.menu_items.pull(req.params.id);
        await nav.save();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/mobilenav/fab/reorder', authenticateToken, async (req, res) => {
    try {
        const { orders } = req.body;
        let nav = await MobileNavigationSettings.findOne();
        if (!nav) return res.status(404).json({ error: 'Navigation settings not found' });
        
        const reordered = [];
        orders.forEach(id => {
            const item = nav.menu_items.id(id);
            if (item) reordered.push(item);
        });
        nav.menu_items = reordered;
        await nav.save();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/settings/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Default fallback local URL
    let fileUrl = `/uploads/media/${req.file.filename}`;
    
    if (supabase) {
        try {
            const fileBuffer = fs.readFileSync(req.file.path);
            const bucketName = 'media';
            const fileName = `favicons/${Date.now()}_${req.file.filename}`;
            
            // Try uploading
            let { data, error } = await supabase.storage
                .from(bucketName)
                .upload(fileName, fileBuffer, {
                    contentType: req.file.mimetype,
                    duplex: 'half'
                });
                
            if (error && error.message && error.message.includes('bucket not found')) {
                // Try creating bucket
                console.log(`Bucket ${bucketName} not found, creating it...`);
                const { error: createError } = await supabase.storage.createBucket(bucketName, {
                    public: true
                });
                if (!createError) {
                    const retry = await supabase.storage
                        .from(bucketName)
                        .upload(fileName, fileBuffer, {
                            contentType: req.file.mimetype,
                            duplex: 'half'
                        });
                    if (retry.error) throw retry.error;
                    data = retry.data;
                } else {
                    throw new Error(`Failed to create bucket: ${createError.message}`);
                }
            } else if (error) {
                throw error;
            }
            
            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);
                
            if (publicUrlData && publicUrlData.publicUrl) {
                fileUrl = publicUrlData.publicUrl;
                // Delete the local file to clean up disk since it's uploaded to Supabase
                try {
                    fs.unlinkSync(req.file.path);
                } catch (err) {
                    console.error("Failed to delete temp file:", err);
                }
            }
        } catch (err) {
            console.error("Supabase storage upload failed, falling back to local storage:", err.message);
        }
    }
    
    res.json({ success: true, url: fileUrl });
});

// GET Background Settings
app.get('/api/settings/backgrounds', async (req, res) => {
    let settings = await BackgroundSettings.findOne();
    if (!settings) {
        settings = new BackgroundSettings();
        await settings.save();
    }
    res.json(settings);
});

// POST Background Settings
app.post('/api/settings/backgrounds', authenticateToken, async (req, res) => {
    let settings = await BackgroundSettings.findOne();
    if (!settings) {
        settings = new BackgroundSettings();
    }
    
    Object.assign(settings, req.body);
    await settings.save();
    res.json({ success: true, settings });
});

// ==========================================
// FILE UPLOADER ROUTES (MULTER)
// ==========================================

// Image asset upload
// Image asset upload
// Image asset upload with folder support
app.post('/api/media/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const folder = req.query.folder || req.body.folder || '';
    const safeFolder = folder.replace(/\.\./g, '').replace(/\\/g, '/');
    
    let fileUrl = `/uploads/media/${req.file.filename}`;
    
    if (safeFolder) {
        const targetFolderDir = path.join(mediaDir, safeFolder);
        if (!fs.existsSync(targetFolderDir)) {
            fs.mkdirSync(targetFolderDir, { recursive: true });
        }
        const oldPath = req.file.path;
        const newPath = path.join(targetFolderDir, req.file.filename);
        try {
            fs.renameSync(oldPath, newPath);
            fileUrl = `/uploads/media/${safeFolder}/${req.file.filename}`;
        } catch (e) {
            console.error("Local folder move failed:", e);
        }
    }
    
    if (supabase) {
        try {
            const currentPath = safeFolder ? path.join(mediaDir, safeFolder, req.file.filename) : req.file.path;
            const fileBuffer = fs.readFileSync(currentPath);
            const bucketName = 'media';
            const fileName = safeFolder ? `${safeFolder}/${Date.now()}_${req.file.filename}` : `${Date.now()}_${req.file.filename}`;
            
            let { data, error } = await supabase.storage
                .from(bucketName)
                .upload(fileName, fileBuffer, {
                    contentType: req.file.mimetype,
                    duplex: 'half'
                });
                
            if (error && error.message && error.message.includes('bucket not found')) {
                console.log(`Bucket ${bucketName} not found, creating it...`);
                const { error: createError } = await supabase.storage.createBucket(bucketName, {
                    public: true
                });
                if (!createError) {
                    const retry = await supabase.storage
                        .from(bucketName)
                        .upload(fileName, fileBuffer, {
                            contentType: req.file.mimetype,
                            duplex: 'half'
                        });
                    if (retry.error) throw retry.error;
                    data = retry.data;
                } else {
                    throw new Error(`Failed to create bucket: ${createError.message}`);
                }
            } else if (error) {
                throw error;
            }
            
            const { data: publicUrlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);
                
            if (publicUrlData && publicUrlData.publicUrl) {
                fileUrl = publicUrlData.publicUrl;
                try {
                    const currentPath = safeFolder ? path.join(mediaDir, safeFolder, req.file.filename) : req.file.path;
                    fs.unlinkSync(currentPath); // remove temp file
                } catch (err) {
                    console.error("Failed to delete temp file:", err);
                }
            }
        } catch (err) {
            console.error("Supabase storage upload failed, falling back to local storage:", err.message);
        }
    }
    
    await logActivity('Upload', `Uploaded media file: ${req.file.filename}`, req);
    res.json({ url: fileUrl, name: req.file.filename });
});

// Get media files listed in folder with details (timestamp, size, type)
app.get('/api/media', authenticateToken, async (req, res) => {
    const folder = req.query.folder || '';
    const safeFolder = folder.replace(/\.\./g, '').replace(/\\/g, '/');
    const localTargetDir = safeFolder ? path.join(mediaDir, safeFolder) : mediaDir;

    if (supabase) {
        try {
            const { data, error } = await supabase.storage
                .from('media')
                .list(safeFolder || '', {
                    limit: 150,
                    sortBy: { column: 'created_at', order: 'desc' }
                });
            if (!error && data) {
                const list = data.map(file => {
                    const relativePath = safeFolder ? `${safeFolder}/${file.name}` : file.name;
                    const { data: publicUrlData } = supabase.storage
                        .from('media')
                        .getPublicUrl(relativePath);
                    return {
                        name: file.name,
                        url: file.metadata ? publicUrlData.publicUrl : '',
                        isDir: !file.metadata,
                        size: file.metadata ? file.metadata.size : 0,
                        mtime: file.created_at || new Date()
                    };
                });
                return res.json(list);
            }
        } catch (err) {
            console.error("Failed to list media files from Supabase:", err.message);
        }
    }

    if (!fs.existsSync(localTargetDir)) {
        return res.json([]);
    }

    fs.readdir(localTargetDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Unable to scan folder' });
        
        const list = [];
        files.forEach(file => {
            const filePath = path.join(localTargetDir, file);
            let stat;
            try {
                stat = fs.statSync(filePath);
            } catch (e) {
                return;
            }
            
            const isDir = stat.isDirectory();
            const relativeUrlPath = safeFolder ? `${safeFolder}/${file}` : file;
            
            list.push({
                name: file,
                url: isDir ? '' : `/uploads/media/${relativeUrlPath}`,
                isDir,
                size: stat.size,
                mtime: stat.mtime
            });
        });
        
        res.json(list);
    });
});

// Create folder inside Media Library
app.post('/api/media/folder', authenticateToken, async (req, res) => {
    const { folderName } = req.body;
    if (!folderName) return res.status(400).json({ error: 'Folder name is required' });
    
    const safeName = folderName.replace(/[^a-zA-Z0-9_\-\/]/g, '');
    if (!safeName) return res.status(400).json({ error: 'Invalid folder name' });

    const dirPath = path.join(mediaDir, safeName);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    res.json({ success: true, folder: safeName });
});

// Delete media file/folder by path
app.post('/api/media/delete', authenticateToken, async (req, res) => {
    const { path: relativePath } = req.body;
    if (!relativePath) return res.status(400).json({ error: 'Path is required' });

    const safePath = relativePath.replace(/\.\./g, '');

    if (supabase) {
        try {
            const { error } = await supabase.storage
                .from('media')
                .remove([safePath]);
            if (!error) return res.json({ success: true });
        } catch (err) {
            console.error("Supabase delete failed, trying local:", err.message);
        }
    }

    const filePath = path.join(mediaDir, safePath);
    if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            fs.rmSync(filePath, { recursive: true });
        } else {
            fs.unlinkSync(filePath);
        }
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// Check image usage across portfolio sections
app.get('/api/media/usage', authenticateToken, async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const usages = [];

    // Query Hero
    const hero = await Hero.findOne({
        $or: [
            { avatar_url: url },
            { resume_url: url },
            { background_url: url },
            { video_path: url }
        ]
    });
    if (hero) usages.push("Hero Section");

    // Query About
    const about = await About.findOne({ photo_url: url });
    if (about) usages.push("About Section");

    // Query Skills
    const skill = await Skill.findOne({ icon_url: url });
    if (skill) usages.push(`Skills (${skill.name})`);

    // Query Projects
    const project = await Project.findOne({ image_url: url });
    if (project) usages.push(`Projects (${project.name})`);

    // Query UXIGeneral
    const uxiGen = await UXIGeneral.findOne({
        $or: [
            { logo_url: url },
            { hero_bg_url: url },
            { team_bg_url: url },
            { projects_bg_url: url }
        ]
    });
    if (uxiGen) usages.push("UXI General Page");

    // Query UXITeam
    const uxiTeam = await UXITeam.findOne({ photo_url: url });
    if (uxiTeam) usages.push(`UXI Team (${uxiTeam.name})`);

    // Query UXIProject
    const uxiProject = await UXIProject.findOne({ image_url: url });
    if (uxiProject) usages.push(`UXI Projects (${uxiProject.name})`);

    // Query Timeline
    const timeline = await Timeline.findOne({ icon_url: url });
    if (timeline) usages.push(`Timeline (${timeline.title})`);

    // Query Certificate
    const cert = await Certificate.findOne({ image_url: url });
    if (cert) usages.push(`Certificates (${cert.name})`);

    // Query Contact
    const contact = await Contact.findOne({ bg_image_url: url });
    if (contact) usages.push("Contact Section");

    // Query SEO
    const seo = await SEO.findOne({ image_url: url });
    if (seo) usages.push("SEO Meta Image");

    // Query WebsiteSettings
    const settings = await WebsiteSettings.findOne({
        $or: [
            { portfolio_favicon_url: url },
            { uxi_favicon_url: url },
            { admin_favicon_url: url }
        ]
    });
    if (settings) usages.push("Website Logo/Favicon");

    res.json({ usages });
});

// Delete media file
app.delete('/api/media/:name', authenticateToken, async (req, res) => {
    const name = req.params.name;
    if (supabase) {
        try {
            const { error } = await supabase.storage
                .from('media')
                .remove([name]);
            if (!error) return res.json({ success: true });
        } catch (err) {
            console.error("Supabase delete failed, trying local:", err.message);
        }
    }

    const filePath = path.join(mediaDir, name);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// Rename media file
app.put('/api/media/rename', authenticateToken, async (req, res) => {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: 'Missing parameters' });

    if (supabase) {
        try {
            const bucketName = 'media';
            const { error: copyError } = await supabase.storage
                .from(bucketName)
                .copy(oldName, newName);
                
            if (!copyError) {
                const { error: removeError } = await supabase.storage
                    .from(bucketName)
                    .remove([oldName]);
                    
                if (!removeError) {
                    const { data: publicUrlData } = supabase.storage
                        .from(bucketName)
                        .getPublicUrl(newName);
                    return res.json({ success: true, url: publicUrlData.publicUrl, name: newName });
                } else {
                    throw removeError;
                }
            } else {
                throw copyError;
            }
        } catch (err) {
            console.error("Supabase rename failed, trying local:", err.message);
        }
    }

    const oldPath = path.join(mediaDir, oldName);
    const newPath = path.join(mediaDir, newName);

    if (fs.existsSync(newPath)) return res.status(400).json({ error: 'File with new name already exists' });
    if (!fs.existsSync(oldPath)) return res.status(404).json({ error: 'File not found' });

    fs.rename(oldPath, newPath, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to rename file' });
        res.json({ success: true, url: `/uploads/media/${newName}`, name: newName });
    });
});

// Replace media file content
app.post('/api/media/replace/:name', authenticateToken, upload.single('file'), async (req, res) => {
    const name = req.params.name;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    if (supabase) {
        try {
            const fileBuffer = fs.readFileSync(req.file.path);
            const { error } = await supabase.storage
                .from('media')
                .update(name, fileBuffer, {
                    contentType: req.file.mimetype,
                    duplex: 'half'
                });
            fs.unlinkSync(req.file.path); // remove temp file
            if (!error) {
                const { data: publicUrlData } = supabase.storage
                    .from('media')
                    .getPublicUrl(name);
                return res.json({ success: true, url: publicUrlData.publicUrl });
            } else {
                throw error;
            }
        } catch (err) {
            console.error("Supabase replace failed, trying local:", err.message);
        }
    }

    const oldPath = path.join(mediaDir, name);
    const newPath = req.file.path; // temp uploaded file

    fs.copyFile(newPath, oldPath, (err) => {
        fs.unlinkSync(newPath); // delete temp upload
        if (err) return res.status(500).json({ error: 'Failed to replace file content' });
        res.json({ success: true, url: `/uploads/media/${name}` });
    });
});

// Resume PDF upload
app.post('/api/resume/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
    const fileUrl = `/uploads/resumes/${req.file.filename}`;
    
    // Auto-update Hero record to reference this new resume URL
    let hero = await Hero.findOne();
    if (!hero) hero = new Hero();
    hero.resume_url = fileUrl;
    await hero.save();

    res.json({ url: fileUrl });
});

// UXI Startup Page Route is served by the static frontend project.

// ==========================================
// UXI Startup Page API Routes
// ==========================================

// General info
app.get('/api/uxi/general', async (req, res) => {
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('uxi_settings')
                .select('*')
                .eq('id', 1)
                .single();
            if (error) {
                console.error("Supabase general error:", error);
                throw error;
            }
            if (data) {
                // Map fields from Supabase to match UXIGeneral Schema
                return res.json({
                    logo_url: data.logo_url,
                    about_copy: data.about_desc, // Map about_desc to about_copy
                    about_title: data.about_title,
                    about_story: data.about_story,
                    mission: data.about_mission, // Map about_mission to mission
                    vision: data.about_vision, // Map about_vision to vision
                    founded_year: data.about_founded, // Map about_founded to founded_year
                    email: data.contact_email, // Map contact_email to email
                    phone: data.contact_phone, // Map contact_phone to phone
                    location: data.contact_location, // Map contact_location to location
                    linkedin: data.contact_linkedin,
                    github: data.contact_github,
                    instagram: data.contact_instagram,
                    whatsapp: data.contact_whatsapp,
                    hero_title: data.hero_title,
                    hero_subtitle: data.hero_subtitle,
                    hero_desc: data.hero_desc,
                    seo_title: data.seo_title,
                    seo_desc: data.seo_desc,
                    seo_keywords: data.seo_keywords,
                    footer_text: data.footer_text,
                    footer_btn_text: data.footer_btn_text,
                    footer_btn_link: data.footer_btn_link,
                    footer_tagline: data.footer_tagline || 'Empowering the next generation of seamless web experiences.'
                });
            }
        }
    } catch (e) {
        console.warn("Falling back to MongoDB for /api/uxi/general due to:", e.message);
    }

    // Fallback to MongoDB
    const gen = await UXIGeneral.findOne() || new UXIGeneral();
    res.json(gen);
});

app.post('/api/uxi/general', authenticateToken, async (req, res) => {
    const { 
        logo_url, about_copy, about_title, about_story, mission, vision, founded_year, 
        email, phone, location, website_link,
        hero_title, hero_subtitle, hero_desc,
        linkedin, github, instagram, whatsapp,
        seo_title, seo_desc, seo_keywords,
        footer_text, footer_btn_text, footer_btn_link,
        footer_tagline
    } = req.body;

    try {
        if (supabase) {
            const upsertData = {
                id: 1,
                logo_url: logo_url || 'images/uxi_website.png',
                hero_title: hero_title || 'UXI',
                hero_subtitle: hero_subtitle || 'Unified eXperience Intelligence',
                hero_desc: hero_desc || '',
                about_title: about_title || 'About UXI',
                about_desc: about_copy || '',
                about_mission: mission || '',
                about_vision: vision || '',
                about_founded: founded_year || '2026',
                about_story: about_story || '',
                contact_email: email || 'contact@uxitech.in',
                contact_phone: phone || '+91 9959593027',
                contact_location: location || 'Vijayawada, India',
                contact_linkedin: linkedin || '#',
                contact_github: github || '#',
                contact_instagram: instagram || '#',
                contact_whatsapp: whatsapp || '#',
                seo_title: seo_title || 'UXI – Unified eXperience Intelligence',
                seo_desc: seo_desc || '',
                seo_keywords: seo_keywords || '',
                footer_text: footer_text || '© UXI – Unified eXperience Intelligence',
                footer_btn_text: footer_btn_text || 'Visit UXITECH',
                footer_btn_link: footer_btn_link || 'https://uxitech.in',
                footer_tagline: footer_tagline || 'Empowering the next generation of seamless web experiences.'
            };

            const { data, error } = await supabase
                .from('uxi_settings')
                .upsert(upsertData)
                .select()
                .single();
            
            if (error) {
                console.error("Supabase upsert settings error:", error);
                throw error;
            }
            if (data) {
                return res.json({
                    logo_url: data.logo_url,
                    about_copy: data.about_desc,
                    about_title: data.about_title,
                    about_story: data.about_story,
                    mission: data.about_mission,
                    vision: data.about_vision,
                    founded_year: data.about_founded,
                    email: data.contact_email,
                    phone: data.contact_phone,
                    location: data.contact_location,
                    linkedin: data.contact_linkedin,
                    github: data.contact_github,
                    instagram: data.contact_instagram,
                    whatsapp: data.contact_whatsapp,
                    hero_title: data.hero_title,
                    hero_subtitle: data.hero_subtitle,
                    hero_desc: data.hero_desc,
                    seo_title: data.seo_title,
                    seo_desc: data.seo_desc,
                    seo_keywords: data.seo_keywords,
                    footer_text: data.footer_text,
                    footer_btn_text: data.footer_btn_text,
                    footer_btn_link: data.footer_btn_link,
                    footer_tagline: data.footer_tagline || 'Empowering the next generation of seamless web experiences.'
                });
            }
        }
    } catch (e) {
        console.warn("Falling back to MongoDB for updating /api/uxi/general due to:", e.message);
    }

    // Fallback MongoDB edit
    let gen = await UXIGeneral.findOne();
    if (!gen) gen = new UXIGeneral();
    gen.logo_url = logo_url || 'images/uxi_website.png';
    gen.about_copy = about_copy;
    gen.about_title = about_title || 'About UXI';
    gen.about_story = about_story;
    gen.mission = mission;
    gen.vision = vision;
    gen.founded_year = founded_year;
    gen.email = email;
    gen.phone = phone;
    gen.location = location;
    gen.website_link = website_link || footer_btn_link || 'https://uxitech.in';
    gen.hero_title = hero_title || 'UXI';
    gen.hero_subtitle = hero_subtitle || 'Unified eXperience Intelligence';
    gen.hero_desc = hero_desc;
    gen.linkedin = linkedin;
    gen.github = github;
    gen.instagram = instagram;
    gen.whatsapp = whatsapp;
    gen.seo_title = seo_title;
    gen.seo_desc = seo_desc;
    gen.seo_keywords = seo_keywords;
    gen.footer_text = footer_text;
    gen.footer_btn_text = footer_btn_text;
    gen.footer_btn_link = footer_btn_link || website_link || 'https://uxitech.in';
    gen.footer_tagline = footer_tagline;
    await gen.save();
    res.json(gen);
});

// Team members
app.get('/api/uxi/team', async (req, res) => {
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('uxi_team')
                .select('*')
                .order('display_order', { ascending: true });
            if (error) throw error;
            if (data) {
                // Map fields from Supabase to match MongoDB schema UXITeam
                const mapped = data.map(member => ({
                    _id: member.id,
                    id: member.id,
                    name: member.name,
                    role: member.role,
                    bio: member.description,
                    responsibilities: member.responsibilities,
                    skills: member.skills || [],
                    linkedin_link: member.linkedin,
                    github_link: member.github,
                    photo_url: member.photo_url,
                    display_order: member.display_order
                }));
                return res.json(mapped);
            }
        }
    } catch (e) {
        console.warn("Falling back to MongoDB for /api/uxi/team due to:", e.message);
    }
    const team = await UXITeam.find().sort('display_order');
    res.json(team);
});

app.post('/api/uxi/team', authenticateToken, async (req, res) => {
    const { name, role, bio, responsibilities, skills, linkedin_link, github_link, photo_url } = req.body;
    try {
        if (supabase) {
            const { count, error: countErr } = await supabase
                .from('uxi_team')
                .select('*', { count: 'exact', head: true });
            const order = countErr ? 0 : (count || 0);

            const insertData = {
                name,
                role,
                description: bio || '',
                responsibilities: responsibilities || '',
                skills: Array.isArray(skills) ? skills : [],
                linkedin: linkedin_link || '#',
                github: github_link || '#',
                photo_url: photo_url || '',
                display_order: order
            };

            const { data, error } = await supabase
                .from('uxi_team')
                .insert(insertData)
                .select()
                .single();
            if (error) throw error;
            if (data) {
                return res.json({
                    _id: data.id,
                    id: data.id,
                    name: data.name,
                    role: data.role,
                    bio: data.description,
                    responsibilities: data.responsibilities,
                    skills: data.skills,
                    linkedin_link: data.linkedin,
                    github_link: data.github,
                    photo_url: data.photo_url,
                    display_order: data.display_order
                });
            }
        }
    } catch (e) {
        console.warn("Falling back to MongoDB for /api/uxi/team POST due to:", e.message);
    }

    const order = await UXITeam.countDocuments();
    const member = new UXITeam({ 
        name, role, bio, responsibilities, skills, 
        linkedin_link: linkedin_link || '#', 
        github_link: github_link || '#', 
        photo_url, display_order: order 
    });
    await member.save();
    res.json(member);
});

app.put('/api/uxi/team/reorder', authenticateToken, async (req, res) => {
    const { orders } = req.body;
    try {
        if (supabase && orders && orders.length > 0 && orders[0].match(/^[0-9a-fA-F-]{36}$/)) {
            const promises = orders.map((id, index) => 
                supabase.from('uxi_team').update({ display_order: index }).eq('id', id)
            );
            await Promise.all(promises);
            return res.json({ success: true });
        }
    } catch (e) {
        console.warn("Falling back to MongoDB for /api/uxi/team/reorder due to:", e.message);
    }

    try {
        const promises = orders.map((id, index) => 
            UXITeam.findByIdAndUpdate(id, { display_order: index })
        );
        await Promise.all(promises);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/uxi/team/:id', async (req, res) => {
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('uxi_team')
                .select('*')
                .eq('id', req.params.id)
                .single();
            if (!error && data) {
                return res.json({
                    _id: data.id,
                    id: data.id,
                    name: data.name,
                    role: data.role,
                    bio: data.description,
                    responsibilities: data.responsibilities,
                    skills: data.skills || [],
                    linkedin_link: data.linkedin,
                    github_link: data.github,
                    photo_url: data.photo_url,
                    display_order: data.display_order
                });
            }
        }
    } catch (e) {
        console.warn("Falling back to MongoDB for /api/uxi/team/:id due to:", e.message);
    }
    try {
        const member = await UXITeam.findById(req.params.id);
        if (!member) return res.status(404).json({ error: 'Team member not found' });
        res.json(member);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/uxi/team/:id', authenticateToken, async (req, res) => {
    const { name, role, bio, responsibilities, skills, linkedin_link, github_link, photo_url } = req.body;
    const { id } = req.params;
    try {
        if (supabase && id && id.match(/^[0-9a-fA-F-]{36}$/)) {
            const updateData = {
                name,
                role,
                description: bio,
                responsibilities,
                skills: Array.isArray(skills) ? skills : [],
                linkedin: linkedin_link,
                github: github_link,
                photo_url
            };

            const { data, error } = await supabase
                .from('uxi_team')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            if (data) {
                return res.json({
                    _id: data.id,
                    id: data.id,
                    name: data.name,
                    role: data.role,
                    bio: data.description,
                    responsibilities: data.responsibilities,
                    skills: data.skills,
                    linkedin_link: data.linkedin,
                    github_link: data.github,
                    photo_url: data.photo_url,
                    display_order: data.display_order
                });
            }
        }
    } catch (e) {
        console.warn("Falling back to MongoDB for /api/uxi/team PUT due to:", e.message);
    }

    const member = await UXITeam.findByIdAndUpdate(id, {
        name, role, bio, responsibilities, skills, 
        linkedin_link: linkedin_link || '#', 
        github_link: github_link || '#', 
        photo_url
    }, { new: true });
    res.json(member);
});

app.delete('/api/uxi/team/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        if (supabase && id && id.match(/^[0-9a-fA-F-]{36}$/)) {
            const { error } = await supabase
                .from('uxi_team')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return res.json({ success: true });
        }
    } catch (e) {
        console.warn("Falling back to MongoDB for /api/uxi/team DELETE due to:", e.message);
    }

    await UXITeam.findByIdAndDelete(id);
    res.json({ success: true });
});

// UXI Projects
app.get('/api/uxi/projects', async (req, res) => {
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('uxi_projects')
                .select('*')
                .order('display_order', { ascending: true });
            if (error) throw error;
            if (data) {
                const mapped = data.map(p => ({
                    _id: p.id,
                    id: p.id,
                    name: p.title,
                    description: p.description,
                    technologies: p.technologies || [],
                    github_link: p.github_link || '#',
                    live_link: p.live_link || '#',
                    image_url: p.image_url || '',
                    status: p.status || 'Completed',
                    completion_date: p.completion_date || '',
                    dev_stage: p.dev_stage || 'Planning',
                    expected_release: p.expected_release || '',
                    coming_soon: p.coming_soon || false,
                    progress_percent: p.progress_percent || 0,
                    expected_features: p.expected_features || [],
                    display_order: p.display_order || 0
                }));
                return res.json(mapped);
            }
        }
    } catch (e) {
        console.warn("Falling back to MongoDB for /api/uxi/projects due to:", e.message);
    }
    const projects = await UXIProject.find().sort('display_order');
    res.json(projects);
});

app.post('/api/uxi/projects', authenticateToken, async (req, res) => {
    const { name, description, technologies, github_link, live_link, image_url, status, completion_date, dev_stage, expected_release, coming_soon, progress_percent, expected_features } = req.body;
    try {
        if (supabase) {
            const { count, error: countErr } = await supabase
                .from('uxi_projects')
                .select('*', { count: 'exact', head: true });
            const order = countErr ? 0 : (count || 0);

            const insertData = {
                title: name,
                description: description || '',
                technologies: Array.isArray(technologies) ? technologies : [],
                github_link: github_link || '#',
                live_link: live_link || '#',
                image_url: image_url || '',
                status: status || 'Completed',
                completion_date: completion_date || '',
                dev_stage: dev_stage || 'Planning',
                expected_release: expected_release || '',
                coming_soon: coming_soon || false,
                progress_percent: Number(progress_percent) || 0,
                expected_features: Array.isArray(expected_features) ? expected_features : [],
                display_order: order
            };

            const { data, error } = await supabase
                .from('uxi_projects')
                .insert(insertData)
                .select()
                .single();
            if (error) throw error;
            if (data) {
                return res.json({
                    _id: data.id,
                    id: data.id,
                    name: data.title,
                    description: data.description,
                    technologies: data.technologies,
                    github_link: data.github_link,
                    live_link: data.live_link,
                    image_url: data.image_url,
                    status: data.status,
                    completion_date: data.completion_date,
                    dev_stage: data.dev_stage,
                    expected_release: data.expected_release,
                    coming_soon: data.coming_soon,
                    progress_percent: data.progress_percent,
                    expected_features: data.expected_features,
                    display_order: data.display_order
                });
            }
        }
    } catch (e) {
        console.warn("Falling back to MongoDB for /api/uxi/projects POST due to:", e.message);
    }

    const order = await UXIProject.countDocuments();
    const proj = new UXIProject({
        name, description, technologies, github_link, live_link, image_url, status,
        completion_date, dev_stage, expected_release, coming_soon, progress_percent, expected_features,
        display_order: order
    });
    await proj.save();
    res.json(proj);
});

app.put('/api/uxi/projects/reorder', authenticateToken, async (req, res) => {
    const { orders } = req.body;
    try {
        if (supabase && orders && orders.length > 0 && orders[0].match(/^[0-9a-fA-F-]{36}$/)) {
            const promises = orders.map((id, index) => 
                supabase.from('uxi_projects').update({ display_order: index }).eq('id', id)
            );
            await Promise.all(promises);
            return res.json({ success: true });
        }
    } catch (e) {
        console.warn("Falling back to MongoDB for /api/uxi/projects/reorder due to:", e.message);
    }

    try {
        const promises = orders.map((id, index) => 
            UXIProject.findByIdAndUpdate(id, { display_order: index })
        );
        await Promise.all(promises);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/uxi/projects/:id', async (req, res) => {
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('uxi_projects')
                .select('*')
                .eq('id', req.params.id)
                .single();
            if (!error && data) {
                return res.json({
                    _id: data.id,
                    id: data.id,
                    name: data.name,
                    status: data.status,
                    description: data.description,
                    technologies: data.technologies || [],
                    image_url: data.image_url,
                    github_link: data.github_link,
                    live_link: data.live_link,
                    completion_date: data.completion_date,
                    dev_stage: data.dev_stage,
                    expected_release: data.expected_release,
                    progress_percent: data.progress_percent,
                    coming_soon: data.coming_soon,
                    expected_features: data.expected_features || [],
                    display_order: data.display_order
                });
            }
        }
    } catch (e) {
        console.warn("Falling back to MongoDB for /api/uxi/projects/:id due to:", e.message);
    }
    try {
        const proj = await UXIProject.findById(req.params.id);
        if (!proj) return res.status(404).json({ error: 'UXI project not found' });
        res.json(proj);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/uxi/projects/:id', authenticateToken, async (req, res) => {
    const { name, description, technologies, github_link, live_link, image_url, status, completion_date, dev_stage, expected_release, coming_soon, progress_percent, expected_features } = req.body;
    const { id } = req.params;
    try {
        if (supabase && id && id.match(/^[0-9a-fA-F-]{36}$/)) {
            const updateData = {
                title: name,
                description,
                technologies: Array.isArray(technologies) ? technologies : [],
                github_link,
                live_link,
                image_url,
                status,
                completion_date,
                dev_stage,
                expected_release,
                coming_soon,
                progress_percent: Number(progress_percent) || 0,
                expected_features: Array.isArray(expected_features) ? expected_features : []
            };

            const { data, error } = await supabase
                .from('uxi_projects')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            if (data) {
                return res.json({
                    _id: data.id,
                    id: data.id,
                    name: data.title,
                    description: data.description,
                    technologies: data.technologies,
                    github_link: data.github_link,
                    live_link: data.live_link,
                    image_url: data.image_url,
                    status: data.status,
                    completion_date: data.completion_date,
                    dev_stage: data.dev_stage,
                    expected_release: data.expected_release,
                    coming_soon: data.coming_soon,
                    progress_percent: data.progress_percent,
                    expected_features: data.expected_features,
                    display_order: data.display_order
                });
            }
        }
    } catch (e) {
        console.warn("Falling back to MongoDB for /api/uxi/projects PUT due to:", e.message);
    }

    const proj = await UXIProject.findByIdAndUpdate(id, {
        name, description, technologies, github_link, live_link, image_url, status,
        completion_date, dev_stage, expected_release, coming_soon, progress_percent, expected_features
    }, { new: true });
    res.json(proj);
});

app.delete('/api/uxi/projects/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        if (supabase && id && id.match(/^[0-9a-fA-F-]{36}$/)) {
            const { error } = await supabase
                .from('uxi_projects')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return res.json({ success: true });
        }
    } catch (e) {
        console.warn("Falling back to MongoDB for /api/uxi/projects DELETE due to:", e.message);
    }

    await UXIProject.findByIdAndDelete(id);
    res.json({ success: true });
});

// Catch-all route to confirm API status
app.get('*', (req, res) => {
    res.json({ message: "Shaik Portfolio API is running.", status: "online" });
});

// ==========================================
// Database Initialization & Server Launch
// ==========================================

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/portfolio';

// Disable buffering so queries fail immediately if database connection is down
mongoose.set('bufferCommands', false);

// Seeding function
async function seedDatabase() {
    // Seed default admin user if none exists
        // Migration: ensure existing users have username and recovery_email
        const existingUsers = await User.find({ username: { $exists: false } });
        for (let u of existingUsers) {
            const rawEmail = u.get('email');
            u.username = rawEmail ? rawEmail.split('@')[0] : 'admin';
            u.recovery_email = rawEmail || 'shaikhafizulrehaman@gmail.com';
            u.session_timeout = 30;
            u.token_version = u.token_version || 0;
            await u.save();
            console.log(`Migrated user account: set username to "${u.username}" and recovery_email to "${u.recovery_email}"`);
        }

        const userCount = await User.countDocuments();
        if (userCount === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const defaultAdmin = new User({
                username: 'admin',
                password: hashedPassword,
                recovery_email: 'shaikhafizulrehaman@gmail.com',
                session_timeout: 30,
                token_version: 0
            });
            await defaultAdmin.save();
            console.log("Seeded default admin account: admin / admin123");
        }

        // Seed default settings if empty
        const heroCount = await Hero.countDocuments();
        if (heroCount === 0) {
            await new Hero().save();
            await new About().save();
            await new Contact().save();
            await new SocialLink().save();
            await new SEO().save();
            
            // Seed Skills
            const defaultSkills = [
                { name: 'HTML', category: 'Frontend', icon_class: 'fa-brands fa-html5', color: '#E34F26', display_order: 1 },
                { name: 'CSS', category: 'Frontend', icon_class: 'fa-brands fa-css3-alt', color: '#1572B6', display_order: 2 },
                { name: 'JavaScript', category: 'Frontend', icon_class: 'fa-brands fa-js', color: '#F7DF1E', display_order: 3 },
                { name: 'React', category: 'Frontend', icon_class: 'fa-brands fa-react', color: '#61DAFB', display_order: 4 },
                { name: 'Tailwind CSS', category: 'Frontend', icon_class: 'fa-solid fa-wind', color: '#38BDF8', display_order: 5 },
                { name: 'Node.js', category: 'Backend', icon_class: 'fa-brands fa-node-js', color: '#339933', display_order: 6 },
                { name: 'Express.js', category: 'Backend', icon_class: 'fa-solid fa-gears', color: '#828282', display_order: 7 },
                { name: 'MongoDB', category: 'Databases', icon_class: 'fa-solid fa-leaf', color: '#47A248', display_order: 8 },
                { name: 'Supabase', category: 'Databases', icon_class: 'fa-solid fa-bolt', color: '#3ECF8E', display_order: 9 },
                { name: 'Firebase', category: 'Databases', icon_class: 'fa-solid fa-fire', color: '#FFCA28', display_order: 10 },
                { name: 'Python', category: 'Programming', icon_class: 'fa-brands fa-python', color: '#3776AB', display_order: 11 },
                { name: 'Java', category: 'Programming', icon_class: 'fa-brands fa-java', color: '#007396', display_order: 12 },
                { name: 'C', category: 'Programming', icon_class: 'fa-solid fa-terminal', color: '#A8B9CC', display_order: 13 },
                { name: 'Machine Learning', category: 'AI / ML', icon_class: 'fa-solid fa-network-wired', color: '#60A5FA', display_order: 14 },
                { name: 'OpenAI APIs', category: 'AI / ML', icon_class: 'fa-solid fa-robot', color: '#10B981', display_order: 15 },
                { name: 'Prompt Engineering', category: 'AI / ML', icon_class: 'fa-solid fa-message', color: '#F59E0B', display_order: 16 },
                { name: 'Git', category: 'DevOps / Tools', icon_class: 'fa-brands fa-git-alt', color: '#F1502F', display_order: 17 },
                { name: 'GitHub', category: 'DevOps / Tools', icon_class: 'fa-brands fa-github', color: '#FFFFFF', display_order: 18 },
                { name: 'VS Code', category: 'DevOps / Tools', icon_class: 'fa-solid fa-code-branch', color: '#007ACC', display_order: 19 },
                { name: 'Vercel', category: 'DevOps / Tools', icon_class: 'fa-solid fa-caret-up', color: '#FFFFFF', display_order: 20 }
            ];
            await Skill.insertMany(defaultSkills);

            // Seed Projects
            const defaultProjects = [
                { name: 'Creators Hub', short_desc: 'A comprehensive dashboard designed for content creators, featuring real-time analytics, monetization tracking, and audience engagement metrics.', technologies: ['Node.js', 'Express.js', 'MongoDB', 'EJS'], category: 'Backend', github_link: 'https://github.com/shaikhafijulrehaman-ops/creators-hub', live_link: '#', image_url: 'images/creators_hub.png', is_featured: true, display_order: 1, status: 'Completed', completion_date: 'Jan 2026' },
                { name: 'India Recipe Finder', short_desc: 'An interactive recipe portal to explore authentic Indian cuisines, search by ingredients, filter by dietary requirements, and view step-by-step guides.', technologies: ['HTML', 'CSS', 'JavaScript', 'Recipe API'], category: 'Frontend', github_link: 'https://github.com/shaikhafijulrehaman-ops/recipe-finder', live_link: '#', image_url: 'images/recipe_finder.png', is_featured: true, display_order: 2, status: 'Completed', completion_date: 'Mar 2026' },
                { name: 'School Management System', short_desc: 'A robust educational platform featuring student onboarding, course scheduling, attendance tracking, grades management, and teacher portals.', technologies: ['Java', 'MySQL', 'Swing / FX'], category: 'Programming', github_link: 'https://github.com/shaikhafijulrehaman-ops/school-management', live_link: '#', image_url: 'images/school_management.png', is_featured: true, display_order: 3, status: 'Completed', completion_date: 'May 2025' },
                { name: 'Privacy Messenger', short_desc: 'A secure end-to-end encrypted messaging application prioritising user privacy, self-destructing messages, and zero-knowledge data storage.', technologies: ['React', 'Supabase', 'WebCrypto API'], category: 'Frontend', github_link: 'https://github.com/shaikhafijulrehaman-ops/privacy-messenger', live_link: '#', image_url: 'images/privacy_messenger.png', is_featured: true, display_order: 4, status: 'Completed', completion_date: 'Oct 2025' },
                { name: 'UXI Official Website', short_desc: 'The official agency website for UXI design studio, showcasing client portfolios, design services, interactive case studies, and team profiles.', technologies: ['React', 'Tailwind CSS', 'Framer Motion'], category: 'Frontend', github_link: 'https://github.com/shaikhafijulrehaman-ops/uxi-agency', live_link: '#', image_url: 'images/uxi_website.png', is_featured: true, display_order: 5, status: 'Completed', completion_date: 'Dec 2025' }
            ];
            await Project.insertMany(defaultProjects);

            // Seed Timeline
            const defaultTimeline = [
                { title: 'B.Tech', company: 'DVR & Dr. HS MIC College of Technology', description: 'Pursuing B.Tech in Artificial Intelligence & Machine Learning. Currently in 3rd Year with an outstanding current CGPA of 8.8. Actively involved in building AI applications and exploring machine learning methodologies.', start_date: '2023', end_date: 'Present', badge: 'Education', display_order: 1 },
                { title: 'AI Internship', company: 'IBM SkillsBuild', description: 'Acquired hands-on experience in training machine learning models, deploying APIs, and designing neural networks under guidance from industry mentors. Developed smart classification systems and analytics portals.', start_date: 'Summer', end_date: 'Internship', badge: 'Experience', display_order: 2 },
                { title: 'Community Service Internship', company: 'Academic outreach program', description: 'Leveraged digital skills to assist local communities, setting up administrative databases, organizing technical literacy programs, and building simple communication portals.', start_date: 'Community', end_date: 'Outreach', badge: 'Experience', display_order: 3 },
                { title: 'Web Development Projects', company: 'Self-initiated & Academic', description: 'Designed and deployed multiple complex applications integrating modern stacks like React, Node.js, and Supabase. Focused on secure authentications, API pipelines, and interactive user interfaces.', start_date: 'Ongoing', end_date: '', badge: 'Projects', display_order: 4 },
                { title: 'Freelance Projects', company: 'Independent Developer', description: 'Partnered with diverse clients to design web pages, implement custom admin portals, and automate workflows. Delivered fully responsive layouts optimized for loading speed and recruiter-friendly presentation.', start_date: 'Contract', end_date: '', badge: 'Freelance', display_order: 5 }
            ];
            await Timeline.insertMany(defaultTimeline);

            // Seed Certificates
            const defaultCertificates = [
                { title: 'AI Foundations & Engineering', organization: 'IBM SkillsBuild', issue_date: 'Jan 2025', credential_link: '#', image_url: 'images/cert_placeholder.png', display_order: 1 },
                { title: 'Full Stack Development Core', organization: 'Google / Coursera', issue_date: 'Aug 2025', credential_link: '#', image_url: 'images/cert_placeholder.png', display_order: 2 },
                { title: 'Machine Learning Specialist', organization: 'Stanford / Coursera', issue_date: 'Mar 2026', credential_link: '#', image_url: 'images/cert_placeholder.png', display_order: 3 },
                { title: 'Python for Data Science', organization: 'IBM SkillsBuild', issue_date: 'Nov 2025', credential_link: '#', image_url: 'images/cert_placeholder.png', display_order: 4 }
            ];
            await Certificate.insertMany(defaultCertificates);

            console.log("Default database records seeded successfully.");
        }

        // Seed website settings if empty
        const settingsCount = await WebsiteSettings.countDocuments();
        if (settingsCount === 0) {
            await new WebsiteSettings().save();
            console.log("Seeded default WebsiteSettings document.");
        }

        // Seed UXI Startup Data
        const uxiGeneralCount = await UXIGeneral.countDocuments();
        if (uxiGeneralCount === 0) {
            const defaultUXIGen = new UXIGeneral({
                logo_url: 'images/uxi_website.png',
                about_copy: 'UXI (Unified eXperience Intelligence) co-founded by passionate developers building modern digital solutions. We focus on integrating cutting edge Artificial Intelligence and Machine Learning techniques into seamless, intuitive user experiences.',
                mission: 'To empower organizations with intelligence-driven, premium user experience solutions.',
                vision: 'A future where design, intelligence, and code merge into invisible yet powerful human-computer interactions.',
                founded_year: '2026',
                email: 'contact@uxitech.in',
                phone: '+91 9959593027',
                location: 'Vijayawada, Andhra Pradesh, India',
                website_link: 'https://uxitech.in'
            });
            await defaultUXIGen.save();

            const defaultUXITeam = [
                {
                    name: 'Shaik Hafijulrehaman',
                    role: 'Co-Founder & AI/ML Lead',
                    bio: 'AI/ML student and Full-Stack Developer passionate about designing and building intelligent web experiences.',
                    responsibilities: 'Overseeing technical architecture, developing AI pipelines, and leading front-end integration.',
                    skills: ['Python', 'Machine Learning', 'React', 'Node.js', 'MongoDB'],
                    linkedin_link: 'https://www.linkedin.com/in/shaik-hafijulrehaman-b78793358',
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
            await UXITeam.insertMany(defaultUXITeam);

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
            await UXIProject.insertMany(defaultUXIProjects);
            console.log("UXI Startup database records seeded successfully.");
        }
}

let dbConnectionPromise = null;
let isSeeded = false;

async function connectToDatabase() {
    if (dbConnectionPromise) {
        return dbConnectionPromise;
    }

    console.log("Connecting to MongoDB...");
    dbConnectionPromise = mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000
    }).then(async (conn) => {
        console.log("Connected to MongoDB successfully!");
        
        if (!isSeeded) {
            isSeeded = true;
            try {
                await seedDatabase();
            } catch (seedErr) {
                console.error("Database seeding failed:", seedErr.message);
            }
        }
        return conn;
    }).catch(err => {
        dbConnectionPromise = null; // Clear connection cache on failure to retry next time
        console.error("MongoDB Connection Error:", err.message);
        throw err;
    });

    return dbConnectionPromise;
}

// Middleware to ensure DB connection is active for any API routes
app.use('/api', async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (err) {
        console.error("DB connection middleware failed:", err.message);
        res.status(500).json({ 
            error: "Database Connection Failed", 
            message: "The server failed to connect to MongoDB. If this is in production, please verify that your MongoDB connection string (MONGO_URI) is correct in Vercel settings and that your MongoDB Atlas IP Whitelist allows access from all IPs (0.0.0.0/0). Detail: " + err.message
        });
    }
});

// Proactively listen and trigger connection in non-serverless environments
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
        connectToDatabase().catch(() => {});
    });
}

module.exports = app;
