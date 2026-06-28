// admin-js/media-picker.js
import { apiRequest, showToast } from './api.js';
import { updateSelectorPreview } from './modules.js';

let currentPickerTarget = null;
let pickerCurrentFolder = '';
let cachedPickerMedia = [];
let selectedPickerAsset = null;
let currentFilteredAssets = [];
let activeIndex = -1;

// Open the media picker modal
export function openMediaPicker(targetId) {
    currentPickerTarget = targetId;
    selectedPickerAsset = null;
    pickerCurrentFolder = '';
    currentFilteredAssets = [];
    activeIndex = -1;
    
    const previewBox = document.getElementById('picker-preview-box');
    if (previewBox) previewBox.innerHTML = `<i class="fa-solid fa-image"></i>`;
    
    const infoBox = document.getElementById('picker-info-box');
    if (infoBox) infoBox.style.display = 'none';
    
    const actionsBox = document.getElementById('picker-actions-box');
    if (actionsBox) actionsBox.style.display = 'none';
    
    const searchInput = document.getElementById('picker-search');
    if (searchInput) searchInput.value = '';
    
    // Show Modal
    const modal = document.getElementById('media-picker-modal');
    if (modal) {
        // Portal rendering: ensure it is attached directly to document.body
        if (modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }
        
        // Add click listener to close if clicked outside modal-content
        if (!modal.dataset.hasClickListener) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeMediaPicker();
                }
            });
            modal.dataset.hasClickListener = "true";
        }
        
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
    
    loadPickerGrid();
}
window.openMediaPicker = openMediaPicker;

// Close the media picker modal
export function closeMediaPicker() {
    const modal = document.getElementById('media-picker-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    currentPickerTarget = null;
}
window.closeMediaPicker = closeMediaPicker;

// Load grid items
export async function loadPickerGrid() {
    const grid = document.getElementById('picker-grid');
    if (grid) grid.innerHTML = '<div style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading assets...</div>';
    
    try {
        const res = await apiRequest(`/api/media?folder=${encodeURIComponent(pickerCurrentFolder)}`);
        cachedPickerMedia = res || [];
        renderPickerGrid();
    } catch (e) {
        if (grid) grid.innerHTML = '<div style="color:var(--danger);grid-column:1/-1;text-align:center;padding:20px;">Error loading assets.</div>';
    }
}

// Navigate picker folders
window.navigatePickerFolder = (folderPath) => {
    pickerCurrentFolder = folderPath;
    loadPickerGrid();
};

window.navigatePickerUp = () => {
    if (!pickerCurrentFolder) return;
    const idx = pickerCurrentFolder.lastIndexOf('/');
    const parent = idx !== -1 ? pickerCurrentFolder.substring(0, idx) : '';
    window.navigatePickerFolder(parent);
};

// Selection helper
function selectFileByIndex(index) {
    if (index < 0 || index >= currentFilteredAssets.length) return;
    
    activeIndex = index;
    selectedPickerAsset = currentFilteredAssets[index];
    
    // Reset selections
    document.querySelectorAll('#picker-grid .media-picker-item').forEach((el) => {
        if (el.classList.contains('folder-item')) return;
        el.classList.remove('selected');
        const check = el.querySelector('.item-check');
        if (check) check.style.display = 'none';
    });
    
    const activeDiv = document.getElementById(`picker-file-item-${index}`);
    if (activeDiv) {
        activeDiv.classList.add('selected');
        const check = activeDiv.querySelector('.item-check');
        if (check) check.style.display = 'flex';
        
        // Scroll into view if out of viewport inside scroll container
        activeDiv.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    
    showPickerAssetDetails(selectedPickerAsset);
}

// Render gallery items inside modal grid
export function renderPickerGrid() {
    const grid = document.getElementById('picker-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const searchVal = (document.getElementById('picker-search')?.value || '').toLowerCase().trim();
    
    // Split folders and files
    const folders = cachedPickerMedia.filter(a => a.isDir && a.name.toLowerCase().includes(searchVal));
    const files = cachedPickerMedia.filter(a => !a.isDir && a.name.toLowerCase().includes(searchVal));
    
    currentFilteredAssets = files; // files list for keyboard navigation
    activeIndex = -1;
    
    // Back to parent folder card
    if (pickerCurrentFolder) {
        const div = document.createElement('div');
        div.className = 'media-picker-item folder-item';
        div.style = 'cursor:pointer;position:relative;aspect-ratio:1;border:1px dashed rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.01);';
        div.innerHTML = `
            <div class="folder-icon" style="display:flex;align-items:center;justify-content:center;height:100%;"><i class="fa-solid fa-turn-up" style="font-size:24px;color:var(--accent);"></i></div>
            <div style="font-size:10px;text-align:center;padding:5px;background:rgba(0,0,0,0.5);width:100%;position:absolute;bottom:0;color:#fff;">Parent Folder</div>
        `;
        div.addEventListener('click', window.navigatePickerUp);
        grid.appendChild(div);
    }
    
    // Render Folders
    folders.forEach(folder => {
        const relativePath = pickerCurrentFolder ? `${pickerCurrentFolder}/${folder.name}` : folder.name;
        const div = document.createElement('div');
        div.className = 'media-picker-item folder-item';
        div.style = 'cursor:pointer;position:relative;aspect-ratio:1;border:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.15);';
        div.innerHTML = `
            <div class="folder-icon" style="display:flex;align-items:center;justify-content:center;height:100%;"><i class="fa-solid fa-folder" style="font-size:32px;color:#f59e0b;"></i></div>
            <div style="font-size:10px;text-align:center;padding:5px;background:rgba(0,0,0,0.7);width:100%;position:absolute;bottom:0;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;color:#fff;">${folder.name}</div>
        `;
        div.addEventListener('click', () => window.navigatePickerFolder(relativePath));
        grid.appendChild(div);
    });
    
    if (folders.length === 0 && files.length === 0 && !pickerCurrentFolder) {
        grid.innerHTML = '<div style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:20px;">No images available. Upload an image first.</div>';
        return;
    }
    
    // Render Files (Images/Videos) in chunks (virtualized)
    const renderLimit = 40;
    
    const renderChunk = (startIdx) => {
        const chunk = files.slice(startIdx, startIdx + renderLimit);
        chunk.forEach((asset, chunkOffset) => {
            const fileIdx = startIdx + chunkOffset;
            const div = document.createElement('div');
            div.className = 'media-picker-item';
            div.id = `picker-file-item-${fileIdx}`;
            div.style = 'cursor:pointer;position:relative;aspect-ratio:1;border:2px solid rgba(255,255,255,0.06);overflow:hidden;background:#0b0f19;display:flex;align-items:center;justify-content:center;';
            
            if (selectedPickerAsset && selectedPickerAsset.name === asset.name) {
                div.classList.add('selected');
                activeIndex = fileIdx;
            }
            
            const isVideo = asset.name.match(/\.(mp4|webm|mov)$/i);
            const mediaPreview = isVideo 
                ? `<video src="${asset.url}" muted style="width:100%;height:100%;object-fit:cover;"></video><div class="video-play-indicator" style="position:absolute;top:5px;left:5px;color:#fff;background:rgba(0,0,0,0.5);width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-play" style="font-size:9px;"></i></div>` 
                : `<img src="${asset.url}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" alt="${asset.name}">`;
                
            div.innerHTML = `
                ${mediaPreview}
                <div class="item-check" style="position:absolute;top:5px;right:5px;background:var(--accent);color:#fff;border-radius:50%;width:20px;height:20px;display:none;align-items:center;justify-content:center;font-size:10px;"><i class="fa-solid fa-check"></i></div>
            `;
            
            if (selectedPickerAsset && selectedPickerAsset.name === asset.name) {
                div.querySelector('.item-check').style.display = 'flex';
            }
            
            // Single-click selection loader
            div.addEventListener('click', () => {
                selectFileByIndex(fileIdx);
            });
            
            // Double-click instant choice
            div.addEventListener('dblclick', () => {
                selectFileByIndex(fileIdx);
                window.insertPickerAsset();
            });
            
            grid.appendChild(div);
        });
    };
    
    renderChunk(0);
    
    // Incremental on-scroll loading handler
    const container = document.querySelector('.media-picker-grid-container');
    if (container) {
        container.onscroll = () => {
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 30) {
                const currentCount = grid.querySelectorAll('.media-picker-item:not(.folder-item)').length;
                if (currentCount < files.length) {
                    renderChunk(currentCount);
                }
            }
        };
    }
}
window.filterPickerMedia = renderPickerGrid;

// Display selected details
export function showPickerAssetDetails(asset) {
    const isVideo = asset.name.match(/\.(mp4|webm|mov)$/i);
    const previewBox = document.getElementById('picker-preview-box');
    if (previewBox) {
        previewBox.innerHTML = isVideo 
            ? `<video src="${asset.url}" controls muted autoplay loop style="max-width:100%;max-height:100%;object-fit:contain;"></video>` 
            : `<img src="${asset.url}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="${asset.name}">`;
    }
    
    const infoBox = document.getElementById('picker-info-box');
    if (infoBox) {
        const formattedSize = asset.size ? `${(asset.size / 1024).toFixed(1)} KB` : 'Unknown';
        const dateStr = asset.mtime ? new Date(asset.mtime).toLocaleDateString() : 'Unknown';
        
        infoBox.innerHTML = `
            <h4 style="word-break:break-all;font-size:12px;margin-bottom:6px;">${asset.name}</h4>
            <p style="font-size:11px;margin-top:4px;word-break:break-all;"><strong>URL:</strong> <span style="user-select:all;color:var(--accent);">${asset.url}</span></p>
            <p style="font-size:11px;margin-top:4px;"><strong>Size:</strong> ${formattedSize}</p>
            <p style="font-size:11px;margin-top:4px;"><strong>Date Added:</strong> ${dateStr}</p>
        `;
        
        if (!isVideo && asset.url) {
            infoBox.innerHTML += `<p style="font-size:11px;margin-top:4px;" id="picker-detail-res"><strong>Resolution:</strong> Loading...</p>`;
            const img = new Image();
            img.src = asset.url;
            img.onload = () => {
                const resEl = document.getElementById('picker-detail-res');
                if (resEl) resEl.innerHTML = `<strong>Resolution:</strong> ${img.naturalWidth} x ${img.naturalHeight} px`;
            };
        }
        infoBox.style.display = 'block';
    }
    
    const renameInput = document.getElementById('picker-rename-input');
    if (renameInput) renameInput.value = asset.name;
    
    const actionsBox = document.getElementById('picker-actions-box');
    if (actionsBox) actionsBox.style.display = 'block';
}

// Choose asset action
window.insertPickerAsset = () => {
    if (!selectedPickerAsset) {
        showToast("Please select an asset first.", "error");
        return;
    }
    updateSelectorPreview(currentPickerTarget, selectedPickerAsset.url);
    closeMediaPicker();
    showToast("Asset selected!", "success");
};

// Rename asset from picker
window.renamePickerAsset = async () => {
    if (!selectedPickerAsset) return;
    const oldName = selectedPickerAsset.name;
    const newName = document.getElementById('picker-rename-input').value.trim();
    if (!newName || oldName === newName) return;
    
    try {
        await apiRequest('/api/media/rename', {
            method: 'PUT',
            body: { oldName, newName }
        });
        showToast("Asset renamed successfully!", "success");
        loadPickerGrid();
    } catch (err) {
        showToast(err.message, "error");
    }
};

// Replace asset content
window.triggerPickerReplace = () => {
    document.getElementById('picker-replace-uploader').click();
};

window.replacePickerAssetFile = async (file) => {
    if (!selectedPickerAsset) return;
    showToast("Replacing asset file content...", "accent");
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetPath', selectedPickerAsset.name);
    
    try {
        await apiRequest('/api/media/upload?replace=true', {
            method: 'POST',
            body: formData
        });
        showToast("Asset content replaced successfully!", "success");
        loadPickerGrid();
    } catch (err) {
        showToast(err.message, "error");
    }
};

// Delete asset from picker
window.deletePickerAsset = async () => {
    if (!selectedPickerAsset) return;
    if (!confirm(`Are you sure you want to delete "${selectedPickerAsset.name}"?`)) return;
    
    const path = pickerCurrentFolder ? `${pickerCurrentFolder}/${selectedPickerAsset.name}` : selectedPickerAsset.name;
    try {
        await apiRequest(`/api/media/${encodeURIComponent(path)}`, {
            method: 'DELETE'
        });
        showToast("Asset deleted from library.", "success");
        selectedPickerAsset = null;
        
        document.getElementById('picker-preview-box').innerHTML = `<i class="fa-solid fa-image"></i>`;
        document.getElementById('picker-info-box').style.display = 'none';
        document.getElementById('picker-actions-box').style.display = 'none';
        
        loadPickerGrid();
    } catch (err) {
        showToast(err.message, "error");
    }
};

// Upload handler inside picker modal
async function uploadPickerMultipleFiles(files) {
    showToast(`Uploading ${files.length} asset(s)...`, "accent");
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const url = `/api/media/upload?folder=${encodeURIComponent(pickerCurrentFolder)}`;
            const res = await apiRequest(url, {
                method: 'POST',
                body: formData
            });
            if (res && res.url) {
                showToast(`Asset "${file.name}" uploaded!`, "success");
            }
        } catch (err) {
            showToast(`Upload failed for "${file.name}": ${err.message}`, "error");
        }
    }
    loadPickerGrid();
}

// Keyboard Navigation & Escape close listeners
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('media-picker-modal');
    if (!modal || !modal.classList.contains('active')) return;
    
    if (e.key === 'Escape') {
        closeMediaPicker();
        e.preventDefault();
        return;
    }
    
    if (currentFilteredAssets.length === 0) return;
    
    let nextIndex = activeIndex;
    const columns = window.innerWidth > 992 ? 4 : 2;
    
    if (e.key === 'ArrowRight') {
        nextIndex = activeIndex + 1;
        if (nextIndex >= currentFilteredAssets.length) nextIndex = 0;
        selectFileByIndex(nextIndex);
        e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
        nextIndex = activeIndex - 1;
        if (nextIndex < 0) nextIndex = currentFilteredAssets.length - 1;
        selectFileByIndex(nextIndex);
        e.preventDefault();
    } else if (e.key === 'ArrowDown') {
        nextIndex = activeIndex + columns;
        if (nextIndex < currentFilteredAssets.length) {
            selectFileByIndex(nextIndex);
        }
        e.preventDefault();
    } else if (e.key === 'ArrowUp') {
        nextIndex = activeIndex - columns;
        if (nextIndex >= 0) {
            selectFileByIndex(nextIndex);
        }
        e.preventDefault();
    } else if (e.key === 'Enter') {
        if (selectedPickerAsset) {
            window.insertPickerAsset();
            e.preventDefault();
        }
    }
});

// Bind upload and outside-click actions
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('media-picker-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeMediaPicker();
            }
        });
    }

    const dropzone = document.getElementById('picker-dropzone');
    const fileUploader = document.getElementById('picker-file-uploader');
    const replaceUploader = document.getElementById('picker-replace-uploader');
    
    if (dropzone && fileUploader) {
        dropzone.addEventListener('click', (e) => {
            // Only click selector if not clicking dynamic containers
            if (e.target === dropzone || dropzone.contains(e.target)) {
                if (e.target.tagName !== 'INPUT') {
                    fileUploader.click();
                }
            }
        });
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                uploadPickerMultipleFiles(e.dataTransfer.files);
            }
        });
        
        fileUploader.addEventListener('change', () => {
            if (fileUploader.files.length > 0) {
                uploadPickerMultipleFiles(fileUploader.files);
            }
        });
    }

    if (replaceUploader) {
        replaceUploader.addEventListener('change', () => {
            if (replaceUploader.files.length > 0) {
                window.replacePickerAssetFile(replaceUploader.files[0]);
            }
        });
    }
});
