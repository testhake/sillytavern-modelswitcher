import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

const MODULE_NAME = 'sillytavern-modelswitcher';
const extensionFolderPath = `scripts/extensions/third-party/${MODULE_NAME}`;

let settings = {
    profiles: []
};

let switcherWindow = null;

// Default profile structure
function createDefaultProfile() {
    return {
        id: Date.now().toString(),
        name: 'New Profile',
        modelId: '',
        postProcessing: 'default',
        bodyParams: ''
    };
}

async function loadSettings() {
    if (!extension_settings[MODULE_NAME]) {
        extension_settings[MODULE_NAME] = {
            profiles: []
        };
    }
    settings = extension_settings[MODULE_NAME];

    // Ensure profiles array exists
    if (!Array.isArray(settings.profiles)) {
        settings.profiles = [];
    }

    renderSettingsProfiles();
    if (switcherWindow) {
        renderSwitcherProfiles();
    }
}

function saveSettings() {
    extension_settings[MODULE_NAME] = settings;
    saveSettingsDebounced();
}

function addProfile() {
    const profile = createDefaultProfile();
    settings.profiles.push(profile);
    saveSettings();
    renderSettingsProfiles();
    if (switcherWindow) {
        renderSwitcherProfiles();
    }
    console.log(`[${MODULE_NAME}] Added new profile:`, profile);
}

function deleteProfile(profileId) {
    const index = settings.profiles.findIndex(p => p.id === profileId);
    if (index !== -1) {
        settings.profiles.splice(index, 1);
        saveSettings();
        renderSettingsProfiles();
        if (switcherWindow) {
            renderSwitcherProfiles();
        }
    }
}

function updateProfile(profileId, field, value) {
    const profile = settings.profiles.find(p => p.id === profileId);
    if (profile) {
        profile[field] = value;
        saveSettings();
        if (switcherWindow) {
            renderSwitcherProfiles();
        }
    }
}

function applyProfile(profileId) {
    const profile = settings.profiles.find(p => p.id === profileId);
    if (!profile) {
        toastr.error('Profile not found');
        console.error(`[${MODULE_NAME}] Profile not found:`, profileId);
        return;
    }

    try {
        let appliedCount = 0;

        // Set Model ID
        const modelIdInput = document.querySelector("#custom_model_id");
        if (modelIdInput) {
            modelIdInput.value = profile.modelId || '';
            modelIdInput.dispatchEvent(new Event('input', { bubbles: true }));
            appliedCount++;
            console.log(`[${MODULE_NAME}] Set Model ID:`, profile.modelId);
        } else {
            console.warn(`[${MODULE_NAME}] Model ID input not found`);
        }

        // Set Prompt Post-Processing
        const postProcessingSelect = document.querySelector("#custom_prompt_post_processing");
        if (postProcessingSelect) {
            postProcessingSelect.value = profile.postProcessing || 'default';
            postProcessingSelect.dispatchEvent(new Event('change', { bubbles: true }));
            appliedCount++;
            console.log(`[${MODULE_NAME}] Set Post-Processing:`, profile.postProcessing);
        } else {
            console.warn(`[${MODULE_NAME}] Post-Processing select not found`);
        }

        // Set Include Body Parameters
        const bodyParamsInput = document.querySelector("#custom_include_body");
        if (bodyParamsInput) {
            bodyParamsInput.value = profile.bodyParams || '';
            bodyParamsInput.dispatchEvent(new Event('input', { bubbles: true }));
            appliedCount++;
            console.log(`[${MODULE_NAME}] Set Body Parameters:`, profile.bodyParams);
        } else {
            console.warn(`[${MODULE_NAME}] Body Parameters input not found`);
        }

        if (appliedCount > 0) {
            toastr.success(`Applied profile: ${profile.name}`);
            console.log(`[${MODULE_NAME}] Successfully applied profile:`, profile);
        } else {
            toastr.warning('No settings were applied. Make sure you are on the API settings page.');
        }
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error applying profile:`, error);
        toastr.error(`Failed to apply profile: ${error.message}`);
    }
}

function captureCurrentSettings(profileId) {
    const profile = settings.profiles.find(p => p.id === profileId);
    if (!profile) {
        toastr.error('Profile not found');
        return;
    }

    try {
        let capturedCount = 0;

        // Capture Model ID
        const modelIdInput = document.querySelector("#custom_model_id");
        if (modelIdInput) {
            profile.modelId = modelIdInput.value;
            capturedCount++;
        }

        // Capture Prompt Post-Processing
        const postProcessingSelect = document.querySelector("#custom_prompt_post_processing");
        if (postProcessingSelect) {
            profile.postProcessing = postProcessingSelect.value;
            capturedCount++;
        }

        // Capture Include Body Parameters
        const bodyParamsInput = document.querySelector("#custom_include_body");
        if (bodyParamsInput) {
            profile.bodyParams = bodyParamsInput.value;
            capturedCount++;
        }

        if (capturedCount > 0) {
            saveSettings();
            renderSettingsProfiles();
            toastr.success(`Captured settings to: ${profile.name}`);
            console.log(`[${MODULE_NAME}] Captured settings:`, profile);
        } else {
            toastr.warning('No settings were captured. Make sure you are on the API settings page.');
        }
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error capturing settings:`, error);
        toastr.error(`Failed to capture settings: ${error.message}`);
    }
}

// Get available post-processing options
function getPostProcessingOptions() {
    const postProcessingSelect = document.querySelector("#custom_prompt_post_processing");
    const options = [];

    if (postProcessingSelect) {
        Array.from(postProcessingSelect.options).forEach(option => {
            options.push({
                value: option.value,
                text: option.text
            });
        });
    }

    // Fallback options if not found
    if (options.length === 0) {
        return [
            { value: 'default', text: 'Default' },
            { value: 'none', text: 'None' },
            { value: 'prompt_manager', text: 'Prompt Manager' }
        ];
    }

    return options;
}

// Render profiles in settings
function renderSettingsProfiles() {
    const container = $('#ms_settings_profiles_container');
    if (!container.length) return;

    container.empty();

    if (settings.profiles.length === 0) {
        container.append(`
            <div class="ms-empty-state">
                No profiles yet. Click "Add Profile" to create one.
            </div>
        `);
        return;
    }

    const postProcessingOptions = getPostProcessingOptions();

    settings.profiles.forEach(profile => {
        const optionsHtml = postProcessingOptions.map(opt =>
            `<option value="${opt.value}" ${opt.value === profile.postProcessing ? 'selected' : ''}>${opt.text}</option>`
        ).join('');

        const profileHtml = `
            <div class="ms-profile-item" data-profile-id="${profile.id}">
                <div class="ms-profile-header">
                    <input 
                        type="text" 
                        class="ms-profile-name text_pole" 
                        value="${escapeHtml(profile.name)}" 
                        placeholder="Profile Name"
                        data-profile-id="${profile.id}"
                    />
                    <div class="ms-profile-actions">
                        <button class="menu_button ms-capture-btn" data-profile-id="${profile.id}" title="Capture current settings">
                            <i class="fa-solid fa-camera"></i>
                        </button>
                        <button class="menu_button ms-delete-btn" data-profile-id="${profile.id}" title="Delete profile">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="ms-profile-fields">
                    <div class="ms-field">
                        <label>Model ID:</label>
                        <input 
                            type="text" 
                            class="text_pole ms-model-id" 
                            value="${escapeHtml(profile.modelId)}" 
                            placeholder="e.g., gpt-4"
                            data-profile-id="${profile.id}"
                        />
                    </div>
                    <div class="ms-field">
                        <label>Prompt Post-Processing:</label>
                        <select 
                            class="text_pole ms-post-processing" 
                            data-profile-id="${profile.id}"
                        >
                            ${optionsHtml}
                        </select>
                    </div>
                    <div class="ms-field">
                        <label>Include Body Parameters:</label>
                        <textarea 
                            class="textarea_compact ms-body-params" 
                            rows="2" 
                            placeholder='e.g., {"temperature": 0.7}'
                            data-profile-id="${profile.id}"
                        >${escapeHtml(profile.bodyParams)}</textarea>
                    </div>
                </div>
            </div>
        `;
        container.append(profileHtml);
    });

    bindSettingsProfileEvents();
}

function bindSettingsProfileEvents() {
    // Name change
    $('.ms-profile-name').off('input').on('input', function () {
        const profileId = $(this).data('profile-id');
        const value = $(this).val();
        updateProfile(profileId, 'name', value);
    });

    // Model ID change
    $('.ms-model-id').off('input').on('input', function () {
        const profileId = $(this).data('profile-id');
        const value = $(this).val();
        updateProfile(profileId, 'modelId', value);
    });

    // Post-processing change
    $('.ms-post-processing').off('change').on('change', function () {
        const profileId = $(this).data('profile-id');
        const value = $(this).val();
        updateProfile(profileId, 'postProcessing', value);
    });

    // Body params change
    $('.ms-body-params').off('input').on('input', function () {
        const profileId = $(this).data('profile-id');
        const value = $(this).val();
        updateProfile(profileId, 'bodyParams', value);
    });

    // Capture button
    $('.ms-capture-btn').off('click').on('click', function () {
        const profileId = $(this).data('profile-id');
        captureCurrentSettings(profileId);
    });

    // Delete button
    $('.ms-delete-btn').off('click').on('click', function () {
        const profileId = $(this).data('profile-id');
        const profile = settings.profiles.find(p => p.id === profileId);
        if (confirm(`Delete profile "${profile.name}"?`)) {
            deleteProfile(profileId);
        }
    });
}

// Render profiles in switcher window
function renderSwitcherProfiles() {
    const container = $('#ms_switcher_profiles');
    if (!container.length) return;

    container.empty();

    if (settings.profiles.length === 0) {
        container.append(`
            <div class="ms-switcher-empty">
                No profiles. Add them in settings.
            </div>
        `);
        return;
    }

    settings.profiles.forEach(profile => {
        const profileBtn = `
            <button class="ms-switcher-profile-btn" data-profile-id="${profile.id}" title="Click to apply this profile">
                <div class="ms-switcher-profile-name">${escapeHtml(profile.name)}</div>
                <div class="ms-switcher-profile-model">${escapeHtml(profile.modelId) || '(no model)'}</div>
            </button>
        `;
        container.append(profileBtn);
    });

    bindSwitcherProfileEvents();
}

function bindSwitcherProfileEvents() {
    $('.ms-switcher-profile-btn').off('click').on('click', function () {
        const profileId = $(this).data('profile-id');
        applyProfile(profileId);
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSwitcherWindow() {
    if (switcherWindow) {
        return;
    }

    const windowHtml = `
        <div id="ms_switcher_window">
            <div class="ms-window-header" id="ms_window_header">
                <div class="ms-window-title">
                    <i class="fa-solid fa-exchange-alt"></i>
                    <span>Model Switcher</span>
                </div>
                <button class="ms-window-close" id="ms_window_close" title="Close">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            <div class="ms-window-body">
                <div id="ms_switcher_profiles"></div>
            </div>
        </div>
    `;

    $('body').append(windowHtml);
    switcherWindow = $('#ms_switcher_window');

    makeWindowDraggable();
    bindWindowEvents();
    renderSwitcherProfiles();
}

function hideSwitcherWindow() {
    if (switcherWindow) {
        switcherWindow.remove();
        switcherWindow = null;
    }
}

function makeWindowDraggable() {
    const $window = $('#ms_switcher_window');
    const $header = $('#ms_window_header');

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    $header.css('cursor', 'move');

    $header.on('mousedown', (e) => {
        if ($(e.target).closest('.ms-window-close').length > 0) {
            return;
        }

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const rect = $window[0].getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        $window.addClass('dragging');
        e.preventDefault();
    });

    $(document).on('mousemove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        const newLeft = Math.max(0, Math.min(window.innerWidth - $window.outerWidth(), initialLeft + deltaX));
        const newTop = Math.max(0, Math.min(window.innerHeight - $window.outerHeight(), initialTop + deltaY));

        $window.css({
            left: newLeft + 'px',
            top: newTop + 'px'
        });
    });

    $(document).on('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            $window.removeClass('dragging');
        }
    });
}

function bindWindowEvents() {
    $('#ms_window_close').on('click', () => {
        hideSwitcherWindow();
    });
}

// Initialize extension
jQuery(async () => {
    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
        $("#extensions_settings").append(settingsHtml);

        const buttonHtml = await $.get(`${extensionFolderPath}/button.html`);
        $("#send_but").before(buttonHtml);

        // Bind add profile button in settings
        $('#ms_add_profile').on('click', () => {
            addProfile();
        });

        $("#ms_toggle_button").on("click", () => {
            if (switcherWindow) {
                hideSwitcherWindow();
            } else {
                showSwitcherWindow();
            }
        });

        await loadSettings();

        console.log(`[${MODULE_NAME}] Extension initialized successfully`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to initialize extension:`, error);
    }
});