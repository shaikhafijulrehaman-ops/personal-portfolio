// admin-js/modules.js
import { apiRequest, showToast } from './api.js';
import { openMediaPicker } from './media-picker.js';

// ==========================================
// Reusable Premium Confirmation Dialog Helper
// ==========================================
export function confirmAction(title, message, onConfirm) {
    const overlay = document.getElementById('confirm-modal-overlay');
    const titleEl = document.getElementById('confirm-modal-title');
    const messageEl = document.getElementById('confirm-modal-message');
    const confirmBtn = document.getElementById('confirm-modal-confirm-btn');
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
    
    if (!overlay || !confirmBtn || !cancelBtn) return;
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    overlay.classList.add('active');
    
    confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = 'Processing...';
        try {
            await onConfirm();
        } catch (e) {
            console.error("Action confirmation execution failed:", e);
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = originalText;
            overlay.classList.remove('active');
        }
    };
    
    cancelBtn.onclick = () => {
        overlay.classList.remove('active');
    };
}
window.confirmAction = confirmAction;

export function toggleBodyScrollLock() {
    const activeOverlays = document.querySelectorAll('.modal-overlay.active');
    if (activeOverlays.length > 0) {
        document.body.classList.add('modal-open');
    } else {
        document.body.classList.remove('modal-open');
    }
}
window.toggleBodyScrollLock = toggleBodyScrollLock;

// ==========================================
// Selector Widget Preview Utilities
// ==========================================
export function updateSelectorPreview(targetId, url) {
    const hiddenInput = document.getElementById(targetId);
    if (hiddenInput) hiddenInput.value = url;
    
    const previewContainer = document.getElementById(`${targetId}-preview`);
    if (previewContainer) {
        if (url) {
            previewContainer.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`;
        } else {
            previewContainer.innerHTML = `<div style="font-size:24px;color:var(--text-muted);"><i class="fa-solid fa-image"></i></div>`;
        }
    }
    
    const infoText = document.getElementById(`${targetId}-info`);
    if (infoText) {
        infoText.textContent = url ? url.substring(url.lastIndexOf('/') + 1) : "No image selected";
    }
}
window.updateSelectorPreview = updateSelectorPreview;

window.openMediaPickerWidget = (targetId) => {
    openMediaPicker((url) => {
        updateSelectorPreview(targetId, url);
    });
};

// ==========================================
// Reorder Utility Helper
// ==========================================
async function saveReorder(url, ids) {
    try {
        await apiRequest(url, {
            method: 'PUT',
            body: { orders: ids }
        });
        showToast("Display order updated successfully!", "success");
    } catch (e) {
        showToast("Failed to save reorder", "error");
    }
}

// ==========================================
// Modal Operations (Open/Close)
// ==========================================
window.openSkillModal = () => {
    document.getElementById('skill-modal-title').textContent = "Add Skill";
    document.getElementById('skill-id').value = "";
    document.getElementById('skill-form').reset();
    document.getElementById('skill-modal').classList.add('active');
    toggleBodyScrollLock();
};
window.closeSkillModal = () => {
    document.getElementById('skill-modal').classList.remove('active');
    toggleBodyScrollLock();
};

window.openProjectModal = () => {
    document.getElementById('project-modal-title').textContent = "Add Project";
    document.getElementById('project-id').value = "";
    document.getElementById('project-form').reset();
    updateSelectorPreview('project-image', '');
    document.getElementById('project-modal').classList.add('active');
    toggleBodyScrollLock();
};
window.closeProjectModal = () => {
    document.getElementById('project-modal').classList.remove('active');
    toggleBodyScrollLock();
};

window.openTimelineModal = () => {
    document.getElementById('timeline-modal-title').textContent = "Add Timeline Entry";
    document.getElementById('timeline-id').value = "";
    document.getElementById('timeline-form').reset();
    updateSelectorPreview('timeline-logo', '');
    document.getElementById('timeline-modal').classList.add('active');
    toggleBodyScrollLock();
};
window.closeTimelineModal = () => {
    document.getElementById('timeline-modal').classList.remove('active');
    toggleBodyScrollLock();
};

window.openCertModal = () => {
    document.getElementById('cert-modal-title').textContent = "Add Certification";
    document.getElementById('cert-id').value = "";
    document.getElementById('cert-form').reset();
    updateSelectorPreview('cert-image', '');
    document.getElementById('cert-modal').classList.add('active');
    toggleBodyScrollLock();
};
window.closeCertModal = () => {
    document.getElementById('cert-modal').classList.remove('active');
    toggleBodyScrollLock();
};

window.openUXITeamModal = () => {
    document.getElementById('uxi-team-modal-title').textContent = "Add Team Member";
    document.getElementById('uxi-team-id').value = "";
    document.getElementById('uxi-team-form').reset();
    updateSelectorPreview('uxi-team-photo', '');
    document.getElementById('uxi-team-modal').classList.add('active');
    toggleBodyScrollLock();
};
window.closeUXITeamModal = () => {
    document.getElementById('uxi-team-modal').classList.remove('active');
    toggleBodyScrollLock();
};

window.openUXIProjectModal = () => {
    document.getElementById('uxi-project-modal-title').textContent = "Add UXI Project";
    document.getElementById('uxi-project-id').value = "";
    document.getElementById('uxi-project-form').reset();
    updateSelectorPreview('uxi-project-image', '');
    document.getElementById('uxi-project-modal').classList.add('active');
    toggleBodyScrollLock();
};
window.closeUXIProjectModal = () => {
    document.getElementById('uxi-project-modal').classList.remove('active');
    toggleBodyScrollLock();
};

// ==========================================
// CRUD Actions (Edit, Delete, Duplicate)
// ==========================================

// Skills CRUD
window.editSkill = async (id) => {
    try {
        const skill = await apiRequest(`/api/skills/${id}`);
        if (skill) {
            document.getElementById('skill-modal-title').textContent = "Edit Skill";
            document.getElementById('skill-id').value = skill._id;
            document.getElementById('skill-name').value = skill.name || '';
            document.getElementById('skill-category').value = skill.category || 'Frontend';
            document.getElementById('skill-icon-class').value = skill.icon_class || '';
            document.getElementById('skill-color').value = skill.color || '#3b82f6';
            document.getElementById('skill-visible').checked = !!skill.is_visible;
            document.getElementById('skill-modal').classList.add('active');
            toggleBodyScrollLock();
        }
    } catch (e) {
        showToast("Failed to fetch skill details", "error");
    }
};
window.deleteSkill = (id) => {
    confirmAction("Delete Skill?", "Are you sure you want to delete this skill record?", async () => {
        await apiRequest(`/api/skills/${id}`, { method: 'DELETE' });
        showToast("Skill deleted successfully", "success");
        lazyLoaders.skills();
    });
};
window.duplicateSkill = async (id) => {
    try {
        const data = await apiRequest(`/api/skills/${id}`);
        if (data) {
            const copy = {
                name: `${data.name} (Copy)`,
                category: data.category,
                icon_class: data.icon_class,
                color: data.color,
                is_visible: data.is_visible
            };
            await apiRequest('/api/skills', { method: 'POST', body: copy });
            showToast("Skill duplicated!", "success");
            lazyLoaders.skills();
        }
    } catch (err) {
        showToast("Duplication failed", "error");
    }
};

// Projects CRUD
window.editProject = async (id) => {
    try {
        const data = await apiRequest(`/api/projects/${id}`);
        if (data) {
            document.getElementById('project-id').value = data._id;
            document.getElementById('project-name').value = data.name || '';
            document.getElementById('project-category').value = data.category || 'Frontend';
            document.getElementById('project-status').value = data.status || 'Completed';
            document.getElementById('project-short').value = data.short_desc || '';
            document.getElementById('project-long').value = data.long_desc || '';
            document.getElementById('project-tech').value = data.technologies ? data.technologies.join(', ') : '';
            updateSelectorPreview('project-image', data.image_url || '');
            document.getElementById('project-github').value = data.github_link || '';
            document.getElementById('project-live').value = data.live_link || '';
            document.getElementById('project-completion-date').value = data.completion_date || '';
            document.getElementById('project-dev-stage').value = data.dev_stage || 'Planning';
            document.getElementById('project-expected-release').value = data.expected_release || '';
            document.getElementById('project-progress-percent').value = data.progress_percent || '0';
            document.getElementById('project-coming-soon').checked = !!data.coming_soon;
            document.getElementById('project-expected-features').value = data.expected_features ? data.expected_features.join(', ') : '';
            document.getElementById('project-featured').checked = !!data.is_featured;
            
            document.getElementById('project-modal-title').textContent = "Edit Project";
            document.getElementById('project-modal').classList.add('active');
            toggleBodyScrollLock();
        }
    } catch (e) {
        showToast("Failed to fetch project details", "error");
    }
};
window.deleteProject = (id) => {
    confirmAction("Delete Project?", "Are you sure you want to delete this project record?", async () => {
        await apiRequest(`/api/projects/${id}`, { method: 'DELETE' });
        showToast("Project deleted successfully", "success");
        lazyLoaders.projects();
    });
};
window.duplicateProject = async (id) => {
    try {
        const data = await apiRequest(`/api/projects/${id}`);
        if (data) {
            const copy = {
                ...data,
                name: `${data.name} (Copy)`
            };
            delete copy._id;
            delete copy.__v;
            await apiRequest('/api/projects', { method: 'POST', body: copy });
            showToast("Project duplicated!", "success");
            lazyLoaders.projects();
        }
    } catch (err) {
        showToast("Duplication failed", "error");
    }
};

// Timeline CRUD
window.editTimeline = async (id) => {
    try {
        const data = await apiRequest(`/api/timeline/${id}`);
        if (data) {
            document.getElementById('timeline-id').value = data._id;
            document.getElementById('timeline-title').value = data.title || '';
            document.getElementById('timeline-company').value = data.company || '';
            document.getElementById('timeline-start').value = data.start_date || '';
            document.getElementById('timeline-end').value = data.end_date || '';
            document.getElementById('timeline-badge').value = data.badge || 'Experience';
            document.getElementById('timeline-desc').value = data.description || '';
            updateSelectorPreview('timeline-logo', data.logo_url || '');
            
            document.getElementById('timeline-modal-title').textContent = "Edit Timeline Entry";
            document.getElementById('timeline-modal').classList.add('active');
            toggleBodyScrollLock();
        }
    } catch (e) {
        showToast("Failed to fetch timeline details", "error");
    }
};
window.deleteTimeline = (id) => {
    confirmAction("Delete Timeline Entry?", "Are you sure you want to delete this timeline entry?", async () => {
        await apiRequest(`/api/timeline/${id}`, { method: 'DELETE' });
        showToast("Entry deleted successfully", "success");
        lazyLoaders.timeline();
    });
};
window.duplicateTimeline = async (id) => {
    try {
        const data = await apiRequest(`/api/timeline/${id}`);
        if (data) {
            const copy = {
                title: `${data.title} (Copy)`,
                company: data.company,
                description: data.description,
                start_date: data.start_date,
                end_date: data.end_date,
                badge: data.badge,
                logo_url: data.logo_url
            };
            await apiRequest('/api/timeline', { method: 'POST', body: copy });
            showToast("Timeline entry duplicated!", "success");
            lazyLoaders.timeline();
        }
    } catch (err) {
        showToast("Duplication failed", "error");
    }
};

// Certificates CRUD
window.editCertificate = async (id) => {
    try {
        const data = await apiRequest(`/api/certificates/${id}`);
        if (data) {
            document.getElementById('cert-id').value = data._id;
            document.getElementById('cert-title').value = data.title || '';
            document.getElementById('cert-org').value = data.organization || '';
            document.getElementById('cert-date').value = data.issue_date || '';
            document.getElementById('cert-link').value = data.credential_link || '';
            updateSelectorPreview('cert-image', data.image_url || '');
            
            document.getElementById('cert-modal-title').textContent = "Edit Certification";
            document.getElementById('cert-modal').classList.add('active');
            toggleBodyScrollLock();
        }
    } catch (e) {
        showToast("Failed to fetch certificate details", "error");
    }
};
window.deleteCertificate = (id) => {
    confirmAction("Delete Certification?", "Are you sure you want to delete this certificate?", async () => {
        await apiRequest(`/api/certificates/${id}`, { method: 'DELETE' });
        showToast("Certification deleted successfully", "success");
        lazyLoaders.certifications();
    });
};
window.duplicateCertificate = async (id) => {
    try {
        const data = await apiRequest(`/api/certificates/${id}`);
        if (data) {
            const copy = {
                title: `${data.title} (Copy)`,
                organization: data.organization,
                issue_date: data.issue_date,
                credential_link: data.credential_link,
                image_url: data.image_url,
                is_visible: data.is_visible
            };
            await apiRequest('/api/certificates', { method: 'POST', body: copy });
            showToast("Certificate duplicated!", "success");
            lazyLoaders.certifications();
        }
    } catch (err) {
        showToast("Duplication failed", "error");
    }
};

// UXI Team CRUD
window.editTeamMember = async (id) => {
    try {
        const data = await apiRequest(`/api/uxi/team/${id}`);
        if (data) {
            document.getElementById('uxi-team-id').value = data._id;
            document.getElementById('uxi-team-name').value = data.name || '';
            document.getElementById('uxi-team-role').value = data.role || '';
            document.getElementById('uxi-team-bio').value = data.bio || '';
            document.getElementById('uxi-team-responsibilities').value = data.responsibilities || '';
            document.getElementById('uxi-team-skills').value = data.skills ? data.skills.join(', ') : '';
            document.getElementById('uxi-team-linkedin').value = data.linkedin_link || '';
            updateSelectorPreview('uxi-team-photo', data.photo_url || '');
            
            document.getElementById('uxi-team-modal-title').textContent = "Edit UXI Team Member";
            document.getElementById('uxi-team-modal').classList.add('active');
            toggleBodyScrollLock();
        }
    } catch (e) {
        showToast("Failed to fetch team member details", "error");
    }
};
window.deleteTeamMember = (id) => {
    confirmAction("Delete Team Member?", "Are you sure you want to delete this team member?", async () => {
        await apiRequest(`/api/uxi/team/${id}`, { method: 'DELETE' });
        showToast("Member deleted successfully", "success");
        lazyLoaders.uxi();
    });
};

// UXI Projects CRUD
window.editUXIProject = async (id) => {
    try {
        const data = await apiRequest(`/api/uxi/projects/${id}`);
        if (data) {
            document.getElementById('uxi-project-id').value = data._id;
            document.getElementById('uxi-project-name').value = data.name || '';
            document.getElementById('uxi-project-status').value = data.status || 'Completed';
            document.getElementById('uxi-project-desc').value = data.description || '';
            document.getElementById('uxi-project-tech').value = data.technologies ? data.technologies.join(', ') : '';
            updateSelectorPreview('uxi-project-image', data.image_url || '');
            document.getElementById('uxi-project-github').value = data.github_link || '';
            document.getElementById('uxi-project-live').value = data.live_link || '';
            document.getElementById('uxi-project-completion-date').value = data.completion_date || '';
            document.getElementById('uxi-project-dev-stage').value = data.dev_stage || 'Planning';
            document.getElementById('uxi-project-expected-release').value = data.expected_release || '';
            document.getElementById('uxi-project-progress-percent').value = data.progress_percent || '0';
            document.getElementById('uxi-project-coming-soon').checked = !!data.coming_soon;
            document.getElementById('uxi-project-expected-features').value = data.expected_features ? data.expected_features.join(', ') : '';
            
            document.getElementById('uxi-project-modal-title').textContent = "Edit UXI Project";
            document.getElementById('uxi-project-modal').classList.add('active');
            toggleBodyScrollLock();
        }
    } catch (e) {
        showToast("Failed to fetch UXI project details", "error");
    }
};
window.deleteUXIProject = (id) => {
    confirmAction("Delete UXI Project?", "Are you sure you want to delete this UXI project record?", async () => {
        await apiRequest(`/api/uxi/projects/${id}`, { method: 'DELETE' });
        showToast("Project deleted successfully", "success");
        lazyLoaders.uxi();
    });
};

// Mobile Nav Items
window.openMobileNavItemModal = () => {
    document.getElementById('mobilenav-item-modal-title').textContent = "Add Navigation Menu Item";
    document.getElementById('mobilenav-item-id').value = "";
    document.getElementById('mobilenav-item-form').reset();
    document.getElementById('mobilenav-item-modal').classList.add('active');
    toggleBodyScrollLock();
};
window.closeMobileNavItemModal = () => {
    document.getElementById('mobilenav-item-modal').classList.remove('active');
    toggleBodyScrollLock();
};
window.openMobileFABMenuItemModal = () => {
    window.openMobileNavItemModal();
};
window.editMobileFABMenuItem = async (id) => {
    try {
        const data = await apiRequest(`/api/mobilenav/fab/${id}`);
        if (data) {
            document.getElementById('mobilenav-item-id').value = data._id;
            document.getElementById('mobilenav-item-label').value = data.label || '';
            document.getElementById('mobilenav-item-desc').value = data.description || '';
            document.getElementById('mobilenav-item-icon').value = data.icon_class || '';
            document.getElementById('mobilenav-item-url').value = data.url || '';
            document.getElementById('mobilenav-item-target').value = data.target_type || 'scroll';
            document.getElementById('mobilenav-item-enabled').checked = !!data.is_active;
            
            document.getElementById('mobilenav-item-modal-title').textContent = "Edit Navigation Menu Item";
            document.getElementById('mobilenav-item-modal').classList.add('active');
            toggleBodyScrollLock();
        }
    } catch (e) {
        showToast("Failed to fetch menu item details", "error");
    }
};
window.deleteMobileFABMenuItem = (id) => {
    confirmAction("Delete Navigation Item?", "Are you sure you want to delete this menu item?", async () => {
        await apiRequest(`/api/mobilenav/fab/${id}`, { method: 'DELETE' });
        showToast("Navigation item deleted successfully", "success");
        lazyLoaders.mobilenav();
    });
};

// ==========================================
// Tab Controllers Object
// ==========================================
export const lazyLoaders = {
    // ------------------------------------------
    // MODULE: Dashboard
    // ------------------------------------------
    dashboard: async () => {
        const stats = await apiRequest('/api/dashboard/stats');
        document.getElementById('stat-projects').textContent = stats.projects || '0';
        document.getElementById('stat-skills').textContent = stats.skills || '0';
        document.getElementById('stat-certificates').textContent = stats.certificates || '0';
        document.getElementById('stat-timeline').textContent = stats.timeline || '0';
    },

    // ------------------------------------------
    // MODULE: Hero
    // ------------------------------------------
    hero: async () => {
        const data = await apiRequest('/api/hero');
        if (data) {
            document.getElementById('hero-name').value = data.name || '';
            document.getElementById('hero-tagline').value = data.tagline || '';
            document.getElementById('hero-bio').value = data.bio || '';
            updateSelectorPreview('hero-bg-image', data.bg_image_url || '');
            updateSelectorPreview('hero-profile-image', data.profile_image_url || '');
            
            setupFormAutosave('hero-form', '/api/hero', () => ({
                name: document.getElementById('hero-name').value,
                tagline: document.getElementById('hero-tagline').value,
                bio: document.getElementById('hero-bio').value,
                bg_image_url: document.getElementById('hero-bg-image').value,
                profile_image_url: document.getElementById('hero-profile-image').value
            }));
        }
    },

    // ------------------------------------------
    // MODULE: About
    // ------------------------------------------
    about: async () => {
        const data = await apiRequest('/api/about');
        if (data) {
            document.getElementById('about-bio').value = data.bio || '';
            document.getElementById('about-cgpa').value = data.cgpa || '';
            document.getElementById('about-btech-year').value = data.btech_year || '';
            document.getElementById('about-active-hours').value = data.active_hours_coding || '';
            
            setupFormAutosave('about-form', '/api/about', () => ({
                bio: document.getElementById('about-bio').value,
                cgpa: Number(document.getElementById('about-cgpa').value),
                btech_year: document.getElementById('about-btech-year').value,
                active_hours_coding: Number(document.getElementById('about-active-hours').value)
            }));
        }
    },

    // ------------------------------------------
    // MODULE: Skills
    // ------------------------------------------
    skills: async () => {
        const skills = await apiRequest('/api/skills');
        const tbody = document.getElementById('skills-table-body');
        tbody.innerHTML = '';
        
        skills.forEach(skill => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', skill._id);
            tr.innerHTML = `
                <td><i class="fa-solid fa-grip-vertical drag-handle"></i></td>
                <td><strong>${skill.name}</strong></td>
                <td>${skill.category}</td>
                <td><code>${skill.icon_class}</code></td>
                <td><span style="display:inline-block;width:16px;height:16px;border-radius:40%;background:${skill.color};vertical-align:middle;margin-right:8px;"></span>${skill.color}</td>
                <td>${skill.is_visible ? '<span class="badge-status badge-published">Visible</span>' : '<span class="badge-status badge-draft">Hidden</span>'}</td>
                <td class="actions-cell">
                    <button class="btn-icon edit-btn" onclick="editSkill('${skill._id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon duplicate-btn" onclick="duplicateSkill('${skill._id}')" style="margin: 0 4px;"><i class="fa-solid fa-copy"></i></button>
                    <button class="btn-icon delete-btn" onclick="deleteSkill('${skill._id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        setupSortable('skills-table-body', '/api/skills/reorder');
    },

    // ------------------------------------------
    // MODULE: Projects
    // ------------------------------------------
    projects: async () => {
        const projs = await apiRequest('/api/projects');
        const completedBody = document.getElementById('completed-projects-table-body');
        const upcomingBody = document.getElementById('upcoming-projects-table-body');
        
        if (completedBody) completedBody.innerHTML = '';
        if (upcomingBody) upcomingBody.innerHTML = '';
        
        projs.forEach(proj => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', proj._id);
            
            if (proj.status === 'Completed') {
                tr.innerHTML = `
                    <td><i class="fa-solid fa-grip-vertical drag-handle"></i></td>
                    <td><strong>${proj.name}</strong></td>
                    <td>${proj.short_desc || ''}</td>
                    <td>${proj.technologies ? proj.technologies.slice(0, 3).join(', ') : ''}</td>
                    <td>${proj.is_featured ? '<span class="badge-status badge-published"><i class="fa-solid fa-star"></i> Featured</span>' : '<span style="color:var(--text-muted);">Standard</span>'}</td>
                    <td class="actions-cell">
                        <button class="btn-icon edit-btn" title="Edit" onclick="editProject('${proj._id}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon duplicate-btn" title="Duplicate" onclick="duplicateProject('${proj._id}')" style="margin: 0 4px;"><i class="fa-solid fa-copy"></i></button>
                        <button class="btn-icon delete-btn" title="Delete" onclick="deleteProject('${proj._id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                if (completedBody) completedBody.appendChild(tr);
            } else {
                tr.innerHTML = `
                    <td><i class="fa-solid fa-grip-vertical drag-handle"></i></td>
                    <td><strong>${proj.name}</strong></td>
                    <td>${proj.short_desc || ''}</td>
                    <td>${proj.technologies ? proj.technologies.slice(0, 3).join(', ') : ''}</td>
                    <td>${proj.dev_stage || 'Planning'}</td>
                    <td>${proj.progress_percent || 0}%</td>
                    <td>${proj.coming_soon ? '<span class="badge-status badge-draft">Yes</span>' : '<span style="color:var(--text-muted);">No</span>'}</td>
                    <td class="actions-cell">
                        <button class="btn-icon edit-btn" title="Edit" onclick="editProject('${proj._id}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon duplicate-btn" title="Duplicate" onclick="duplicateProject('${proj._id}')" style="margin: 0 4px;"><i class="fa-solid fa-copy"></i></button>
                        <button class="btn-icon delete-btn" title="Delete" onclick="deleteProject('${proj._id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                if (upcomingBody) upcomingBody.appendChild(tr);
            }
        });
        
        if (completedBody) setupSortable('completed-projects-table-body', '/api/projects/reorder');
        if (upcomingBody) setupSortable('upcoming-projects-table-body', '/api/projects/reorder');
    },

    // ------------------------------------------
    // MODULE: Timeline
    // ------------------------------------------
    timeline: async () => {
        const timeline = await apiRequest('/api/timeline');
        const tbody = document.getElementById('timeline-table-body');
        tbody.innerHTML = '';
        
        timeline.forEach(item => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', item._id);
            tr.innerHTML = `
                <td><i class="fa-solid fa-grip-vertical drag-handle"></i></td>
                <td><strong>${item.title}</strong></td>
                <td>${item.badge}</td>
                <td>${item.start_date} - ${item.end_date || 'Present'}</td>
                <td>${item.description ? item.description.substring(0, 40) + '...' : ''}</td>
                <td class="actions-cell">
                    <button class="btn-icon edit-btn" onclick="editTimeline('${item._id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon duplicate-btn" onclick="duplicateTimeline('${item._id}')" style="margin: 0 4px;"><i class="fa-solid fa-copy"></i></button>
                    <button class="btn-icon delete-btn" onclick="deleteTimeline('${item._id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        setupSortable('timeline-table-body', '/api/timeline/reorder');
    },

    // ------------------------------------------
    // MODULE: Certifications
    // ------------------------------------------
    certifications: async () => {
        const certs = await apiRequest('/api/certificates');
        const tbody = document.getElementById('certs-table-body');
        if (tbody) {
            tbody.innerHTML = '';
            certs.forEach(cert => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-id', cert._id);
                tr.innerHTML = `
                    <td><i class="fa-solid fa-grip-vertical drag-handle"></i></td>
                    <td><strong>${cert.title}</strong></td>
                    <td>${cert.organization}</td>
                    <td>${cert.issue_date}</td>
                    <td class="actions-cell">
                        <button class="btn-icon edit-btn" onclick="editCertificate('${cert._id}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon duplicate-btn" onclick="duplicateCertificate('${cert._id}')" style="margin: 0 4px;"><i class="fa-solid fa-copy"></i></button>
                        <button class="btn-icon delete-btn" onclick="deleteCertificate('${cert._id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            setupSortable('certs-table-body', '/api/certificates/reorder');
        }
    },

    // ------------------------------------------
    // MODULE: Contact
    // ------------------------------------------
    contact: async () => {
        const contact = await apiRequest('/api/contact');
        if (contact) {
            document.getElementById('contact-email').value = contact.email || '';
            document.getElementById('contact-phone').value = contact.phone || '';
            document.getElementById('contact-location').value = contact.location || '';
        }
        const socials = await apiRequest('/api/socials');
        if (socials) {
            document.getElementById('social-github').value = socials.github || '';
            document.getElementById('social-linkedin').value = socials.linkedin || '';
            document.getElementById('social-whatsapp').value = socials.whatsapp || '';
        }
        
        setupFormAutosave('contact-form', '/api/contact', () => ({
            email: document.getElementById('contact-email').value,
            phone: document.getElementById('contact-phone').value,
            location: document.getElementById('contact-location').value
        }));
        
        const form = document.getElementById('contact-form');
        if (form) {
            form.removeEventListener('input', debounceSocialSave);
            form.addEventListener('input', debounceSocialSave);
            form.removeEventListener('change', debounceSocialSave);
            form.addEventListener('change', debounceSocialSave);
        }
    },

    // ------------------------------------------
    // MODULE: SEO
    // ------------------------------------------
    seo: async () => {
        const seo = await apiRequest('/api/seo');
        if (seo) {
            document.getElementById('seo-title').value = seo.title || '';
            document.getElementById('seo-desc').value = seo.description || '';
            document.getElementById('seo-keywords').value = seo.keywords || '';
            updateSelectorPreview('seo-og-image', seo.image_url || '');
            
            setupFormAutosave('seo-form', '/api/seo', () => ({
                title: document.getElementById('seo-title').value,
                description: document.getElementById('seo-desc').value,
                keywords: document.getElementById('seo-keywords').value,
                image_url: document.getElementById('seo-og-image').value
            }));
        }
    },

    // ------------------------------------------
    // MODULE: Media
    // ------------------------------------------
    media: async () => {
        renderMediaManager();
    },

    // ------------------------------------------
    // MODULE: Backgrounds
    // ------------------------------------------
    backgrounds: async () => {
        const bgs = await apiRequest('/api/backgrounds');
        if (bgs) {
            updateSelectorPreview('bg-hero', bgs.hero_bg_image || '');
            updateSelectorPreview('bg-about', bgs.about_bg_image || '');
            updateSelectorPreview('bg-skills', bgs.skills_bg_image || '');
            updateSelectorPreview('bg-projects', bgs.projects_bg_image || '');
            updateSelectorPreview('bg-uxi', bgs.uxi_bg_image || '');
            updateSelectorPreview('bg-contact', bgs.contact_bg_image || '');
            
            setupFormAutosave('backgrounds-form', '/api/backgrounds', () => ({
                hero_bg_image: document.getElementById('bg-hero').value,
                about_bg_image: document.getElementById('bg-about').value,
                skills_bg_image: document.getElementById('bg-skills').value,
                projects_bg_image: document.getElementById('bg-projects').value,
                uxi_bg_image: document.getElementById('bg-uxi').value,
                contact_bg_image: document.getElementById('bg-contact').value
            }));
        }
    },

    // ------------------------------------------
    // MODULE: Resume
    // ------------------------------------------
    resume: async () => {
        const settings = await apiRequest('/api/settings');
        const preview = document.getElementById('resume-pdf-preview');
        if (settings && settings.resume_url) {
            preview.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:8px;">
                    <i class="fa-solid fa-file-pdf" style="font-size:32px;color:#ef4444;"></i>
                    <div>
                        <div style="font-weight:600;">Active Resume PDF</div>
                        <a href="${settings.resume_url}" target="_blank" style="font-size:12px;color:var(--accent);">Download/View Resume File</a>
                    </div>
                </div>
            `;
        } else {
            preview.innerHTML = `<div style="color:var(--text-muted);font-size:13px;">No resume file uploaded yet.</div>`;
        }
    },

    // ------------------------------------------
    // MODULE: UXI
    // ------------------------------------------
    uxi: async () => {
        const info = await apiRequest('/api/uxi/general');
        if (info) {
            updateSelectorPreview('uxi-logo', info.logo_url || '');
            document.getElementById('uxi-about-copy').value = info.about_copy || '';
            document.getElementById('uxi-mission').value = info.mission || '';
            document.getElementById('uxi-vision').value = info.vision || '';
            document.getElementById('uxi-founded-year').value = info.founded_year || '';
            document.getElementById('uxi-website-link').value = info.website_link || '';
            document.getElementById('uxi-email').value = info.email || '';
            document.getElementById('uxi-phone').value = info.phone || '';
            document.getElementById('uxi-location').value = info.location || '';
            
            document.getElementById('uxi-footer-company').value = info.footer_btn_text || '';
            document.getElementById('uxi-footer-tagline').value = info.footer_tagline || '';
            document.getElementById('uxi-footer-website').value = info.footer_btn_link || '';
            document.getElementById('uxi-footer-copyright').value = info.footer_text || '';
            
            setupFormAutosave('uxi-general-form', '/api/uxi/general', () => ({
                logo_url: document.getElementById('uxi-logo').value,
                about_copy: document.getElementById('uxi-about-copy').value,
                mission: document.getElementById('uxi-mission').value,
                vision: document.getElementById('uxi-vision').value,
                founded_year: document.getElementById('uxi-founded-year').value,
                website_link: document.getElementById('uxi-website-link').value,
                email: document.getElementById('uxi-email').value,
                phone: document.getElementById('uxi-phone').value,
                location: document.getElementById('uxi-location').value
            }));
            
            setupFormAutosave('uxi-footer-form', '/api/uxi/general', () => ({
                footer_btn_text: document.getElementById('uxi-footer-company').value,
                footer_tagline: document.getElementById('uxi-footer-tagline').value,
                footer_btn_link: document.getElementById('uxi-footer-website').value,
                footer_text: document.getElementById('uxi-footer-copyright').value
            }));
        }
        
        // Load team members
        const team = await apiRequest('/api/uxi/team');
        const teamBody = document.getElementById('uxi-team-table-body');
        teamBody.innerHTML = '';
        team.forEach(m => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', m._id);
            tr.innerHTML = `
                <td><i class="fa-solid fa-grip-vertical drag-handle"></i></td>
                <td><img src="${m.photo_url || ''}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;background:#1e293b;"></td>
                <td><strong>${m.name}</strong></td>
                <td>${m.role}</td>
                <td class="actions-cell">
                    <button class="btn-icon edit-btn" onclick="editTeamMember('${m._id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon delete-btn" onclick="deleteTeamMember('${m._id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            teamBody.appendChild(tr);
        });
        setupSortable('uxi-team-table-body', '/api/uxi/team/reorder');

        // Load UXI projects
        const uxiProjs = await apiRequest('/api/uxi/projects');
        const uxiProjBody = document.getElementById('uxi-project-table-body');
        uxiProjBody.innerHTML = '';
        uxiProjs.forEach(p => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', p._id);
            tr.innerHTML = `
                <td><i class="fa-solid fa-grip-vertical drag-handle"></i></td>
                <td><strong>${p.name}</strong></td>
                <td>${p.status === 'Completed' ? '<span class="badge-status badge-published">Completed</span>' : '<span class="badge-status badge-draft">Upcoming</span>'}</td>
                <td>${p.progress_percent}%</td>
                <td class="actions-cell">
                    <button class="btn-icon edit-btn" onclick="editUXIProject('${p._id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon delete-btn" onclick="deleteUXIProject('${p._id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            uxiProjBody.appendChild(tr);
        });
        setupSortable('uxi-project-table-body', '/api/uxi/projects/reorder');
    },

    // ------------------------------------------
    // MODULE: Mobile Navigation Settings
    // ------------------------------------------
    mobilenav: async () => {
        const header = await apiRequest('/api/mobilenav/header');
        if (header) {
            document.getElementById('mobile-header-title').value = header.mobile_brand_title || '';
            document.getElementById('mobile-header-subtitle').value = header.mobile_brand_subtitle || '';
            
            setupFormAutosave('mobile-header-settings-form', '/api/mobilenav/header', () => ({
                mobile_brand_title: document.getElementById('mobile-header-title').value,
                mobile_brand_subtitle: document.getElementById('mobile-header-subtitle').value
            }));
        }
        
        // Load FAB items
        const fab = await apiRequest('/api/mobilenav/fab');
        const fabBody = document.getElementById('mobile-fab-menu-table-body');
        fabBody.innerHTML = '';
        fab.forEach(f => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', f._id);
            tr.innerHTML = `
                <td><i class="fa-solid fa-grip-vertical drag-handle"></i></td>
                <td><strong>${f.label}</strong></td>
                <td><i class="${f.icon_class}"></i></td>
                <td><a href="${f.url}" target="_blank" style="color:var(--accent);">${f.url}</a></td>
                <td>${f.is_active ? '<span class="badge-status badge-published">Active</span>' : '<span class="badge-status badge-draft">Inactive</span>'}</td>
                <td class="actions-cell">
                    <button class="btn-icon edit-btn" onclick="editMobileFABMenuItem('${f._id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon delete-btn" onclick="deleteMobileFABMenuItem('${f._id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            fabBody.appendChild(tr);
        });
        setupSortable('mobile-fab-menu-table-body', '/api/mobilenav/fab/reorder');
    },

    // ------------------------------------------
    // MODULE: Settings (Favicons, credentials, backups)
    // ------------------------------------------
    settings: async () => {
        const website = await apiRequest('/api/settings');
        if (website) {
            updateSelectorPreview('settings-portfolio-favicon', website.portfolio_favicon_url || '');
            updateSelectorPreview('settings-uxi-favicon', website.uxi_favicon_url || '');
            updateSelectorPreview('settings-admin-favicon', website.admin_favicon_url || '');
            
            setupFormAutosave('settings-form', '/api/settings', () => ({
                portfolio_favicon_url: document.getElementById('settings-portfolio-favicon').value,
                uxi_favicon_url: document.getElementById('settings-uxi-favicon').value,
                admin_favicon_url: document.getElementById('settings-admin-favicon').value
            }));
        }

        const admin = await apiRequest('/api/admin/settings');
        if (admin) {
            document.getElementById('admin-username').value = admin.username || '';
            document.getElementById('admin-recovery-email').value = admin.recovery_email || '';
            document.getElementById('admin-session-timeout').value = admin.session_timeout || 30;
        }

        loadBackupsList();
    },

    // ------------------------------------------
    // MODULE: Activity Logs
    // ------------------------------------------
    activity: async () => {
        loadActivityLogs();
    }
};

// ==========================================
// Social Links Autosave Helper
// ==========================================
let socialSaveTimer;
function debounceSocialSave() {
    clearTimeout(socialSaveTimer);
    socialSaveTimer = setTimeout(async () => {
        try {
            await apiRequest('/api/socials', {
                method: 'POST',
                body: {
                    github: document.getElementById('social-github').value,
                    linkedin: document.getElementById('social-linkedin').value,
                    whatsapp: document.getElementById('social-whatsapp').value
                }
            });
        } catch (e) {
            console.error("Autosave socials failed:", e);
        }
    }, 1200);
}

// ==========================================
// Activity Logs Row Loader
// ==========================================
export async function loadActivityLogs() {
    try {
        const logs = await apiRequest('/api/admin/activity');
        const tbody = document.getElementById('activity-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">No activity logs recorded yet.</td></tr>';
            return;
        }
        
        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><small style="color:var(--text-muted);">${new Date(log.timestamp).toLocaleString()}</small></td>
                <td><span class="badge-status badge-${log.action === 'Delete' ? 'draft' : 'published'}" style="text-transform:uppercase;font-size:10px;">${log.action}</span></td>
                <td><strong>${log.details}</strong></td>
                <td><code>${log.ip_address || 'System'}</code></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Failed to load activity logs:", e);
    }
}
window.loadActivityLogs = loadActivityLogs;

// ==========================================
// Sortable (Drag and Drop) Manager
// ==========================================
function setupSortable(tbodyId, reorderUrl) {
    const el = document.getElementById(tbodyId);
    if (!el) return;
    
    if (el._sortableInstance) {
        el._sortableInstance.destroy();
    }
    
    el._sortableInstance = new Sortable(el, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: () => {
            const rows = el.querySelectorAll('tr');
            const ids = Array.from(rows).map(row => row.getAttribute('data-id'));
            saveReorder(reorderUrl, ids);
        }
    });
}

// ==========================================
// Form Autosave Manager (Save-on-Change)
// ==========================================
let autosaveTimers = {};
function setupFormAutosave(formId, saveUrl, dataExtractor) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    let statusIndicator = form.querySelector('.autosave-status');
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.className = 'autosave-status';
        statusIndicator.style = 'font-size: 11px; color: var(--text-muted); margin-top: 10px; text-align: right; font-style: italic;';
        statusIndicator.textContent = 'Changes autosave automatically';
        form.appendChild(statusIndicator);
    }

    form.oninput = () => triggerAutosave();
    form.onchange = () => triggerAutosave();
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        triggerAutosave(true);
    };
    
    function triggerAutosave(immediate = false) {
        statusIndicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving changes...';
        clearTimeout(autosaveTimers[formId]);
        
        const saveAction = async () => {
            try {
                const body = dataExtractor();
                await apiRequest(saveUrl, {
                    method: 'POST',
                    body
                });
                statusIndicator.innerHTML = '<i class="fa-solid fa-cloud-arrow-up" style="color:var(--accent);"></i> All changes saved';
                
                if (formId === 'settings-form') {
                    if (body.admin_favicon_url) {
                        const fav = document.getElementById('dynamic-favicon');
                        if (fav) fav.href = body.admin_favicon_url;
                    }
                }
                if (immediate) {
                    showToast("Changes saved successfully!", "success");
                }
            } catch (err) {
                statusIndicator.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color:var(--danger);"></i> Autosave failed';
            }
        };

        if (immediate) {
            saveAction();
        } else {
            autosaveTimers[formId] = setTimeout(saveAction, 1200);
        }
    }
}

// ==========================================
// Media Manager Core explorer
// ==========================================
let currentMediaFolder = '';
async function renderMediaManager(filter = '') {
    const grid = document.getElementById('media-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p style="margin-top:10px;">Loading assets...</p></div>';
    
    try {
        const url = `/api/media?folder=${currentMediaFolder}`;
        const files = await apiRequest(url);
        
        const filtered = files.filter(item => item.name.toLowerCase().includes(filter));
        grid.innerHTML = '';
        
        if (currentMediaFolder) {
            const backItem = document.createElement('div');
            backItem.className = 'gallery-card';
            backItem.style = 'cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; aspect-ratio: 1; border: 1px dashed rgba(255,255,255,0.15); border-radius: 12px; background: rgba(255,255,255,0.01);';
            backItem.innerHTML = `
                <i class="fa-solid fa-turn-up" style="font-size:32px;color:var(--accent);"></i>
                <span style="font-size:11px;margin-top:8px;">Back</span>
            `;
            backItem.addEventListener('click', () => {
                const parts = currentMediaFolder.split('/');
                parts.pop();
                currentMediaFolder = parts.join('/');
                renderMediaManager();
            });
            grid.appendChild(backItem);
        }
        
        if (filtered.length === 0 && !currentMediaFolder) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Media Library is empty. Upload files to get started!</div>';
            return;
        }

        filtered.forEach(file => {
            const card = document.createElement('div');
            card.className = 'gallery-card';
            card.style = 'border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; background: rgba(0,0,0,0.15); display: flex; flex-direction: column; position: relative; aspect-ratio: 1; transition: transform 0.2s;';
            card.addEventListener('mouseenter', () => card.style.transform = 'scale(1.02)');
            card.addEventListener('mouseleave', () => card.style.transform = 'scale(1)');
            
            let preview = '';
            if (file.isDir) {
                preview = `
                    <div style="flex:1; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="enterMediaFolder('${file.name}')">
                        <i class="fa-solid fa-folder" style="font-size:64px;color:#f59e0b;filter:drop-shadow(0 4px 10px rgba(245,158,11,0.25));"></i>
                    </div>
                `;
            } else {
                const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);
                preview = `
                    <div style="flex:1; display:flex; align-items:center; justify-content:center; overflow:hidden; cursor:pointer; background:#0b0f19;" onclick="previewMedia('${file.url}', '${file.name}')">
                        ${isImg ? `<img src="${file.url}" style="width:100%;height:100%;object-fit:cover;">` : `<i class="fa-solid fa-file-arrow-up" style="font-size:48px;color:var(--text-muted);"></i>`}
                    </div>
                `;
            }
            
            card.innerHTML = `
                ${preview}
                <div style="padding: 10px; background: rgba(11,15,25,0.85); display: flex; justify-content: space-between; align-items: center; border-top:1px solid rgba(255,255,255,0.06);">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 500; flex:1; padding-right:8px;" title="${file.name}">
                        ${file.name}
                    </div>
                    ${!file.isDir ? `
                        <div style="display:flex;gap:4px;">
                            <button class="btn-icon" title="Copy URL" onclick="copyMediaUrl('${file.url}')" style="width:24px;height:24px;padding:0;"><i class="fa-solid fa-link" style="font-size:10px;"></i></button>
                            <button class="btn-icon delete-btn" title="Delete" onclick="deleteMediaFile('${file.name}')" style="width:24px;height:24px;padding:0;"><i class="fa-solid fa-trash-can" style="font-size:10px;"></i></button>
                        </div>
                    ` : ''}
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (e) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 40px;">Failed to scan media folders.</div>';
    }
}
window.renderMediaManager = renderMediaManager;

window.enterMediaFolder = (folderName) => {
    currentMediaFolder = currentMediaFolder ? `${currentMediaFolder}/${folderName}` : folderName;
    renderMediaManager();
};

window.copyMediaUrl = (url) => {
    const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
    navigator.clipboard.writeText(fullUrl).then(() => {
        showToast("Copied URL to clipboard!", "success");
    }).catch(() => {
        showToast("Copy failed", "error");
    });
};

window.deleteMediaFile = async (name) => {
    confirmAction("Delete File?", `Are you sure you want to delete "${name}" from the media gallery?`, async () => {
        const path = currentMediaFolder ? `${currentMediaFolder}/${name}` : name;
        const res = await apiRequest(`/api/media/${encodeURIComponent(path)}`, { method: 'DELETE' });
        if (res.success) {
            showToast("File deleted successfully", "success");
            renderMediaManager();
        }
    });
};

window.handleMediaLibraryUpload = async (input) => {
    if (input.files.length === 0) return;
    const file = input.files[0];
    
    showToast("Uploading graphics asset...", "accent");
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const url = `/api/media/upload?folder=${currentMediaFolder}`;
        const res = await apiRequest(url, {
            method: 'POST',
            body: formData
        });
        if (res && res.url) {
            showToast("Asset saved inside Media Manager!", "success");
            renderMediaManager();
        }
    } catch (err) {
        showToast(err.message || "Failed to upload file", "error");
    } finally {
        input.value = '';
    }
};

window.createNewFolder = async () => {
    const folderName = prompt("Enter new directory name:");
    if (!folderName) return;
    const cleanName = folderName.replace(/[^a-zA-Z0-9_-]/g, '').trim();
    if (!cleanName) return alert("Invalid folder name.");
    
    const path = currentMediaFolder ? `${currentMediaFolder}/${cleanName}` : cleanName;
    try {
        await apiRequest('/api/media/folder', {
            method: 'POST',
            body: { folder: path }
        });
        showToast("Folder created!", "success");
        renderMediaManager();
    } catch (err) {
        showToast(err.message, "error");
    }
};

const mediaSearch = document.getElementById('media-search-input');
if (mediaSearch) {
    mediaSearch.addEventListener('input', (e) => {
        renderMediaManager(e.target.value.toLowerCase());
    });
}

// ==========================================
// Database backups actions
// ==========================================
export async function loadBackupsList() {
    try {
        const backups = await apiRequest('/api/admin/backups');
        const tbody = document.getElementById('backups-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (backups.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px;">No backups found. Snapshot your DB to create one.</td></tr>';
            return;
        }
        
        backups.forEach(b => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${new Date(b.timestamp).toLocaleString()}</strong></td>
                <td><span class="badge-status badge-published">Healthy Snapshot</span></td>
                <td style="text-align: right;">
                    <button class="btn-icon edit-btn" title="Restore this snapshot" onclick="restoreDatabaseBackup('${b._id}')" style="margin-right:10px;"><i class="fa-solid fa-clock-rotate-left"></i> Restore</button>
                    <button class="btn-icon delete-btn" title="Delete backup" onclick="deleteDatabaseBackup('${b._id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Failed to load backups list:", err);
    }
}
window.loadBackupsList = loadBackupsList;

window.createDatabaseBackup = async () => {
    showToast("Creating database snapshot...", "accent");
    try {
        await apiRequest('/api/admin/backup', { method: 'POST' });
        showToast("Snapshot saved successfully!", "success");
        loadBackupsList();
        loadActivityLogs();
    } catch (err) {
        showToast(err.message, "error");
    }
};

window.restoreDatabaseBackup = async (id) => {
    confirmAction("Restore Database Snapshot?", "WARNING: This will overwrite all current website settings, team members, projects, achievements, and metadata. Proceed?", async () => {
        showToast("Restoring database from snapshot...", "accent");
        await apiRequest(`/api/admin/restore/${id}`, { method: 'POST' });
        showToast("Database restored successfully! Reloading data...", "success");
        loadActivityLogs();
        const activeMod = window.location.hash.replace('#', '') || 'dashboard';
        if (lazyLoaders[activeMod]) lazyLoaders[activeMod]();
    });
};

window.deleteDatabaseBackup = async (id) => {
    confirmAction("Delete Backup Snapshot?", "Are you sure you want to delete this backup snapshot permanently?", async () => {
        await apiRequest(`/api/admin/backups/${id}`, { method: 'DELETE' });
        showToast("Backup snapshot deleted.", "success");
        loadBackupsList();
    });
};

// Export & Import
window.exportPortfolioData = async () => {
    try {
        showToast("Packaging database collections...", "accent");
        const data = await apiRequest('/api/admin/export');
        
        const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shaik_portfolio_snapshot_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Snapshot downloaded successfully!", "success");
    } catch (err) {
        showToast("Export failed: " + err.message, "error");
    }
};

window.importPortfolioData = async (input) => {
    if (input.files.length === 0) return;
    const file = input.files[0];
    
    confirmAction("Import Database Backup?", `Are you sure you want to upload "${file.name}"? This will overwrite all database tables.`, async () => {
        showToast("Uploading and importing snapshot...", "accent");
        const text = await file.text();
        const parsed = JSON.parse(text);
        
        await apiRequest('/api/admin/import', {
            method: 'POST',
            body: parsed
        });
        showToast("Database imported successfully! Reloading...", "success");
        loadActivityLogs();
        const activeMod = window.location.hash.replace('#', '') || 'dashboard';
        if (lazyLoaders[activeMod]) lazyLoaders[activeMod]();
    });
    input.value = '';
};

// Update credentials form submit
const credsForm = document.getElementById('admin-credentials-form');
if (credsForm) {
    credsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value;
        const recovery_email = document.getElementById('admin-recovery-email').value.trim();
        const session_timeout = document.getElementById('admin-session-timeout').value;

        try {
            const data = await apiRequest('/api/admin/settings', {
                method: 'POST',
                body: { username, password, recovery_email, session_timeout }
            });
            showToast("Credentials updated successfully!", "success");
            document.getElementById('admin-password').value = ""; 
            if (data.token) {
                localStorage.setItem("admin_token", data.token); 
            }
            loadActivityLogs();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

// Global logout from all devices
window.logoutAllDevices = async () => {
    confirmAction("Sign Out from All Devices?", "Are you sure you want to invalidate all active device sessions?", async () => {
        await apiRequest('/api/admin/logout-all', { method: 'POST' });
        showToast("Logged out of all devices. Redirecting...", "success");
        localStorage.removeItem("admin_token");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);
    });
};

// Resume PDF upload listener
const uploadBtn = document.getElementById('btn-upload-resume');
if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
        const uploader = document.getElementById('resume-uploader');
        if (!uploader || uploader.files.length === 0) {
            showToast("Please select a PDF file first", "error");
            return;
        }
        const file = uploader.files[0];
        if (file.type !== "application/pdf") {
            showToast("Only PDF files are supported", "error");
            return;
        }
        
        showToast("Uploading resume PDF...", "accent");
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const res = await apiRequest('/api/resume/upload', {
                method: 'POST',
                body: formData
            });
            if (res && res.url) {
                showToast("Resume uploaded successfully!", "success");
                lazyLoaders.resume();
            }
        } catch (err) {
            showToast(err.message || "Upload failed", "error");
        } finally {
            uploader.value = '';
        }
    });
}

// Submit listener for Skills form
const skillForm = document.getElementById('skill-form');
if (skillForm) {
    skillForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('skill-id').value;
        const name = document.getElementById('skill-name').value.trim();
        const category = document.getElementById('skill-category').value;
        const icon_class = document.getElementById('skill-icon-class').value.trim();
        const color = document.getElementById('skill-color').value;
        const is_visible = document.getElementById('skill-visible').checked;
        
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/skills/${id}` : '/api/skills';
        
        try {
            await apiRequest(url, {
                method,
                body: { name, category, icon_class, color, is_visible }
            });
            showToast(id ? "Skill updated successfully!" : "Skill added successfully!", "success");
            window.closeSkillModal();
            lazyLoaders.skills();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

// Submit listener for Projects form
const projForm = document.getElementById('project-form');
if (projForm) {
    projForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('project-id').value;
        const name = document.getElementById('project-name').value.trim();
        const category = document.getElementById('project-category').value;
        const status = document.getElementById('project-status').value;
        const short_desc = document.getElementById('project-short').value.trim();
        const long_desc = document.getElementById('project-long').value.trim();
        const techStr = document.getElementById('project-tech').value.trim();
        const image_url = document.getElementById('project-image').value;
        const github_link = document.getElementById('project-github').value.trim();
        const live_link = document.getElementById('project-live').value.trim();
        const completion_date = document.getElementById('project-completion-date').value;
        const dev_stage = document.getElementById('project-dev-stage').value;
        const expected_release = document.getElementById('project-expected-release').value;
        const progress_percent = parseInt(document.getElementById('project-progress-percent').value) || 0;
        const coming_soon = document.getElementById('project-coming-soon').checked;
        const expected_features_str = document.getElementById('project-expected-features').value.trim();
        const is_featured = document.getElementById('project-featured').checked;
        
        const technologies = techStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const expected_features = expected_features_str.split(',').map(s => s.trim()).filter(s => s.length > 0);
        
        if (!name) {
            showToast("Project Name is required.", "error");
            return;
        }
        if (!short_desc) {
            showToast("Short Description is required.", "error");
            return;
        }
        if (!image_url) {
            showToast("Project Image is required.", "error");
            return;
        }

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/projects/${id}` : '/api/projects';
        
        try {
            await apiRequest(url, {
                method,
                body: {
                    name, category, status, short_desc, long_desc, technologies, image_url,
                    github_link, live_link, completion_date, dev_stage, expected_release,
                    progress_percent, coming_soon, expected_features, is_featured
                }
            });
            showToast(id ? "Project updated successfully!" : "Project added successfully!", "success");
            window.closeProjectModal();
            lazyLoaders.projects();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

// Submit listener for Timeline form
const tlineForm = document.getElementById('timeline-form');
if (tlineForm) {
    tlineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('timeline-id').value;
        const title = document.getElementById('timeline-title').value.trim();
        const company = document.getElementById('timeline-company').value.trim();
        const start_date = document.getElementById('timeline-start').value.trim();
        const end_date = document.getElementById('timeline-end').value.trim();
        const badge = document.getElementById('timeline-badge').value;
        const description = document.getElementById('timeline-desc').value.trim();
        const logo_url = document.getElementById('timeline-logo').value;
        
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/timeline/${id}` : '/api/timeline';
        
        try {
            await apiRequest(url, {
                method,
                body: { title, company, start_date, end_date, badge, description, logo_url }
            });
            showToast(id ? "Timeline entry updated successfully!" : "Timeline entry added successfully!", "success");
            window.closeTimelineModal();
            lazyLoaders.timeline();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

// Submit listener for Certifications form
const certForm = document.getElementById('cert-form');
if (certForm) {
    certForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('cert-id').value;
        const title = document.getElementById('cert-title').value.trim();
        const organization = document.getElementById('cert-org').value.trim();
        const issue_date = document.getElementById('cert-date').value.trim();
        const credential_link = document.getElementById('cert-link').value.trim();
        const image_url = document.getElementById('cert-image').value;
        
        if (!title) {
            showToast("Certificate Title is required.", "error");
            return;
        }
        if (!organization) {
            showToast("Organization is required.", "error");
            return;
        }
        if (!image_url) {
            showToast("Certificate Image is required.", "error");
            return;
        }

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/certificates/${id}` : '/api/certificates';
        
        try {
            await apiRequest(url, {
                method,
                body: { title, organization, issue_date, credential_link, image_url }
            });
            showToast(id ? "Certification updated successfully!" : "Certification added successfully!", "success");
            window.closeCertModal();
            lazyLoaders.certifications();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

// Submit listener for UXI Team Member form
const uxiTeamForm = document.getElementById('uxi-team-form');
if (uxiTeamForm) {
    uxiTeamForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('uxi-team-id').value;
        const name = document.getElementById('uxi-team-name').value.trim();
        const role = document.getElementById('uxi-team-role').value.trim();
        const bio = document.getElementById('uxi-team-bio').value.trim();
        const responsibilities = document.getElementById('uxi-team-responsibilities').value.trim();
        const skillsStr = document.getElementById('uxi-team-skills').value.trim();
        const linkedin_link = document.getElementById('uxi-team-linkedin').value.trim();
        const photo_url = document.getElementById('uxi-team-photo').value;
        
        const skills = skillsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
        
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/uxi/team/${id}` : '/api/uxi/team';
        
        try {
            await apiRequest(url, {
                method,
                body: { name, role, bio, responsibilities, skills, linkedin_link, photo_url }
            });
            showToast(id ? "Team member updated successfully!" : "Team member added successfully!", "success");
            window.closeUXITeamModal();
            lazyLoaders.uxi();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

// Submit listener for UXI Project form
const uxiProjForm = document.getElementById('uxi-project-form');
if (uxiProjForm) {
    uxiProjForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('uxi-project-id').value;
        const name = document.getElementById('uxi-project-name').value.trim();
        const status = document.getElementById('uxi-project-status').value;
        const description = document.getElementById('uxi-project-desc').value.trim();
        const techStr = document.getElementById('uxi-project-tech').value.trim();
        const image_url = document.getElementById('uxi-project-image').value;
        const github_link = document.getElementById('uxi-project-github').value.trim();
        const live_link = document.getElementById('uxi-project-live').value.trim();
        const completion_date = document.getElementById('uxi-project-completion-date').value;
        const dev_stage = document.getElementById('uxi-project-dev-stage').value;
        const expected_release = document.getElementById('uxi-project-expected-release').value;
        const progress_percent = parseInt(document.getElementById('uxi-project-progress-percent').value) || 0;
        const coming_soon = document.getElementById('uxi-project-coming-soon').checked;
        const expected_features_str = document.getElementById('uxi-project-expected-features').value.trim();
        
        const technologies = techStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const expected_features = expected_features_str.split(',').map(s => s.trim()).filter(s => s.length > 0);
        
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/uxi/projects/${id}` : '/api/uxi/projects';
        
        try {
            await apiRequest(url, {
                method,
                body: {
                    name, status, description, technologies, image_url, github_link, live_link,
                    completion_date, dev_stage, expected_release, progress_percent, coming_soon, expected_features
                }
            });
            showToast(id ? "UXI project updated successfully!" : "UXI project added successfully!", "success");
            window.closeUXIProjectModal();
            lazyLoaders.uxi();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

// Submit listener for Mobile Nav FAB Item form
const mobileItemForm = document.getElementById('mobilenav-item-form');
if (mobileItemForm) {
    mobileItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('mobilenav-item-id').value;
        const label = document.getElementById('mobilenav-item-label').value.trim();
        const description = document.getElementById('mobilenav-item-desc').value.trim();
        const icon_class = document.getElementById('mobilenav-item-icon').value.trim();
        const url = document.getElementById('mobilenav-item-url').value.trim();
        const target_type = document.getElementById('mobilenav-item-target').value;
        const is_active = document.getElementById('mobilenav-item-enabled').checked;
        
        const method = id ? 'PUT' : 'POST';
        const apiPath = id ? `/api/mobilenav/fab/${id}` : '/api/mobilenav/fab';
        
        try {
            await apiRequest(apiPath, {
                method,
                body: { label, description, icon_class, url, target_type, is_active }
            });
            showToast(id ? "Navigation item updated successfully!" : "Navigation item added successfully!", "success");
            window.closeMobileNavItemModal();
            lazyLoaders.mobilenav();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}
