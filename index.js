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
        id: `profile_${Date.now()}`,
        name: 'New Profile',
        modelId: '',
        postProcessing: 'default',
        bodyParams: ''
    };
}

async function loadSettings() {
    // Initialize settings if they don't exist
    if (!extension_settings[MODULE_NAME]) {
        extension_settings[MODULE_NAME] = {
            profiles: []
        };
    }

    // Reference the settings object
    settings = extension_settings[MODULE_NAME];

    // Ensure profiles array exists
    if (!Array.isArray(settings.profiles)) {
        settings.profiles = [];
        saveSettings();
    }

    console.log(`[${MODULE_NAME}] Loaded settings:`, settings);
    renderSettingsProfiles();
}

function saveSettings() {
    // Save back to extension_settings
    extension_settings[MODULE_NAME] = settings;
    saveSettingsDebounced();
    console.log(`[${MODULE_NAME}] Settings saved:`, settings);
}

function addProfile() {
    const profile = createDefaultProfile();
    settings.profiles.push(profile);
    console.log(`[${MODULE_NAME}] Added profile:`, profile);
    console.log(`[${MODULE_NAME}] Total profiles:`, settings.profiles.length);
    saveSettings();
    renderSettingsProfiles();
    if (switcherWindow) {
        renderSwitcherProfiles();
    }
    toastr.success('Profile added');
}

function deleteProfile(profileId) {
    console.log(`[${MODULE_NAME}] Attempting to delete profile:`, profileId);
    console.log(`[${MODULE_NAME}] Current profiles:`, settings.profiles);

    const index = settings.profiles.findIndex(p => p.id === profileId);
    console.log(`[${MODULE_NAME}] Found at index:`, index);

    if (index !== -1) {
        const deleted = settings.profiles.splice(index, 1);
        console.log(`[${MODULE_NAME}] Deleted profile:`, deleted);
        console.log(`[${MODULE_NAME}] Remaining profiles:`, settings.profiles);

        saveSettings();
        renderSettingsProfiles();
        if (switcherWindow) {
            renderSwitcherProfiles();
        }
        toastr.success('Profile deleted');
    } else {
        console.error(`[${MODULE_NAME}] Profile not found:`, profileId);
        toastr.error('Profile not found');
    }
}

function updateProfile(profileId, field, value) {
    const profile = settings.profiles.find(p => p.id === profileId);
    if (profile) {
        profile[field] = value;
        console.log(`[${MODULE_NAME}] Updated profile ${profileId} field ${field}:`, value);
        saveSettings();
        if (switcherWindow && field === 'name') {
            renderSwitcherProfiles();
        }
    } else {
        console.error(`[${MODULE_NAME}] Profile not found for update:`, profileId);
    }
}

function applyProfile(profileId) {
    const profile = settings.profiles.find(p => p.id === profileId);
    if (!profile) {
        toastr.error('Profile not found');
        console.error(`[${MODULE_NAME}] Profile not found:`, profileId);
        return;
    }

    console.log(`[${MODULE_NAME}] Applying profile:`, profile);

    try {
        let appliedCount = 0;

        // Set Model ID
        const modelIdInput = document.querySelector("#custom_model_id");
        if (modelIdInput) {
            modelIdInput.value = profile.modelId || '';
            modelIdInput.dispatchEvent(new Event('input', { bubbles: true }));
            modelIdInput.dispatchEvent(new Event('change', { bubbles: true }));
            appliedCount++;
            console.log(`[${MODULE_NAME}] Set Model ID to:`, profile.modelId || '(empty)');
        } else {
            console.warn(`[${MODULE_NAME}] Model ID input (#custom_model_id) not found`);
        }

        // Set Prompt Post-Processing
        const postProcessingSelect = document.querySelector("#custom_prompt_post_processing");
        if (postProcessingSelect) {
            postProcessingSelect.value = profile.postProcessing || 'default';
            postProcessingSelect.dispatchEvent(new Event('change', { bubbles: true }));
            postProcessingSelect.dispatchEvent(new Event('input', { bubbles: true }));
            appliedCount++;
            console.log(`[${MODULE_NAME}] Set Post-Processing to:`, profile.postProcessing);
        } else {
            console.warn(`[${MODULE_NAME}] Post-Processing select (#custom_prompt_post_processing) not found`);
        }

        // Set Include Body Parameters - explicitly handle empty values
        const bodyParamsInput = document.querySelector("#custom_include_body");
        if (bodyParamsInput) {
            // Set the value (even if empty)
            bodyParamsInput.value = profile.bodyParams || '';

            // Trigger multiple events to ensure SillyTavern recognizes the change
            bodyParamsInput.dispatchEvent(new Event('input', { bubbles: true }));
            bodyParamsInput.dispatchEvent(new Event('change', { bubbles: true }));
            bodyParamsInput.dispatchEvent(new Event('blur', { bubbles: true }));

            // For extra safety, also try jQuery trigger if available
            if (typeof $ !== 'undefined' && $(bodyParamsInput).length) {
                $(bodyParamsInput).trigger('input').trigger('change');
            }

            appliedCount++;
            console.log(`[${MODULE_NAME}] Set Body Parameters to:`, profile.bodyParams || '(empty)');
        } else {
            console.warn(`[${MODULE_NAME}] Body Parameters input (#custom_include_body) not found`);
        }

        if (appliedCount > 0) {
            toastr.success(`Applied: ${profile.name}`);
            console.log(`[${MODULE_NAME}] Successfully applied ${appliedCount} settings`);
        } else {
            toastr.warning('No settings applied. Check if you are on the API settings page.');
            console.warn(`[${MODULE_NAME}] No settings were applied`);
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
        console.error(`[${MODULE_NAME}] Profile not found for capture:`, profileId);
        return;
    }

    console.log(`[${MODULE_NAME}] Capturing settings to profile:`, profileId);

    try {
        let capturedCount = 0;

        // Capture Model ID
        const modelIdInput = document.querySelector("#custom_model_id");
        if (modelIdInput) {
            profile.modelId = modelIdInput.value || '';
            capturedCount++;
            console.log(`[${MODULE_NAME}] Captured Model ID:`, profile.modelId);
        } else {
            console.warn(`[${MODULE_NAME}] Model ID input not found`);
        }

        // Capture Prompt Post-Processing
        const postProcessingSelect = document.querySelector("#custom_prompt_post_processing");
        if (postProcessingSelect) {
            profile.postProcessing = postProcessingSelect.value || 'default';
            capturedCount++;
            console.log(`[${MODULE_NAME}] Captured Post-Processing:`, profile.postProcessing);
        } else {
            console.warn(`[${MODULE_NAME}] Post-Processing select not found`);
        }

        // Capture Include Body Parameters
        const bodyParamsInput = document.querySelector("#custom_include_body");
        if (bodyParamsInput) {
            profile.bodyParams = bodyParamsInput.value || '';
            capturedCount++;
            console.log(`[${MODULE_NAME}] Captured Body Parameters:`, profile.bodyParams);
        } else {
            console.warn(`[${MODULE_NAME}] Body Parameters input not found`);
        }

        if (capturedCount > 0) {
            saveSettings();
            renderSettingsProfiles();
            if (switcherWindow) {
                renderSwitcherProfiles();
            }
            toastr.success(`Captured to: ${profile.name}`);
            console.log(`[${MODULE_NAME}] Captured ${capturedCount} settings successfully`);
        } else {
            toastr.warning('No settings captured. Check if you are on the API settings page.');
            console.warn(`[${MODULE_NAME}] No settings were captured`);
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
        console.log(`[${MODULE_NAME}] Found ${options.length} post-processing options`);
    }

    // Fallback options if not found
    if (options.length === 0) {
        console.warn(`[${MODULE_NAME}] Using fallback post-processing options`);
        return [
            { value: 'default', text: 'Default' },
            { value: 'none', text: 'None' }
        ];
    }

    return options;
}

// Render profiles in settings
function renderSettingsProfiles() {
    const container = $('#ms_settings_profiles_container');
    if (!container.length) {
        console.warn(`[${MODULE_NAME}] Settings profiles container not found`);
        return;
    }

    console.log(`[${MODULE_NAME}] Rendering ${settings.profiles.length} profiles in settings`);
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

    settings.profiles.forEach((profile, index) => {
        console.log(`[${MODULE_NAME}] Rendering profile ${index}:`, profile);

        const optionsHtml = postProcessingOptions.map(opt =>
            `<option value="${escapeHtml(opt.value)}" ${opt.value === profile.postProcessing ? 'selected' : ''}>${escapeHtml(opt.text)}</option>`
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
    console.log(`[${MODULE_NAME}] Binding settings profile events`);

    // Name change
    $('.ms-profile-name').off('input').on('input', function () {
        const profileId = $(this).attr('data-profile-id');
        const value = $(this).val();
        console.log(`[${MODULE_NAME}] Name changed for ${profileId}:`, value);
        updateProfile(profileId, 'name', value);
    });

    // Model ID change
    $('.ms-model-id').off('input').on('input', function () {
        const profileId = $(this).attr('data-profile-id');
        const value = $(this).val();
        console.log(`[${MODULE_NAME}] Model ID changed for ${profileId}:`, value);
        updateProfile(profileId, 'modelId', value);
    });

    // Post-processing change
    $('.ms-post-processing').off('change').on('change', function () {
        const profileId = $(this).attr('data-profile-id');
        const value = $(this).val();
        console.log(`[${MODULE_NAME}] Post-processing changed for ${profileId}:`, value);
        updateProfile(profileId, 'postProcessing', value);
    });

    // Body params change
    $('.ms-body-params').off('input').on('input', function () {
        const profileId = $(this).attr('data-profile-id');
        const value = $(this).val();
        console.log(`[${MODULE_NAME}] Body params changed for ${profileId}`);
        updateProfile(profileId, 'bodyParams', value);
    });

    // Capture button
    $('.ms-capture-btn').off('click').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const profileId = $(this).attr('data-profile-id');
        console.log(`[${MODULE_NAME}] Capture clicked for:`, profileId);
        captureCurrentSettings(profileId);
    });

    // Delete button
    $('.ms-delete-btn').off('click').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const profileId = $(this).attr('data-profile-id');
        const profile = settings.profiles.find(p => p.id === profileId);
        console.log(`[${MODULE_NAME}] Delete clicked for:`, profileId);

        if (profile && confirm(`Delete profile "${profile.name}"?`)) {
            deleteProfile(profileId);
        }
    });
}

// Render profiles in switcher window
function renderSwitcherProfiles() {
    const container = $('#ms_switcher_profiles');
    if (!container.length) {
        console.warn(`[${MODULE_NAME}] Switcher profiles container not found`);
        return;
    }

    console.log(`[${MODULE_NAME}] Rendering ${settings.profiles.length} profiles in switcher`);
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
                <div class="ms-switcher-profile-model">${escapeHtml(profile.modelId) || '(no model set)'}</div>
            </button>
        `;
        container.append(profileBtn);
    });

    bindSwitcherProfileEvents();
}

function bindSwitcherProfileEvents() {
    console.log(`[${MODULE_NAME}] Binding switcher profile events`);

    $('.ms-switcher-profile-btn').off('click').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const profileId = $(this).attr('data-profile-id');
        console.log(`[${MODULE_NAME}] Switcher profile clicked:`, profileId);
        applyProfile(profileId);
    });
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function showSwitcherWindow() {
    if (switcherWindow) {
        console.log(`[${MODULE_NAME}] Switcher window already shown`);
        return;
    }

    console.log(`[${MODULE_NAME}] Showing switcher window`);

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
        console.log(`[${MODULE_NAME}] Hiding switcher window`);
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
    $('#ms_window_close').off('click').on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideSwitcherWindow();
    });
}

// Initialize extension
jQuery(async () => {
    try {
        console.log(`[${MODULE_NAME}] Initializing extension`);

        const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
        $("#extensions_settings").append(settingsHtml);
        console.log(`[${MODULE_NAME}] Settings HTML loaded`);

        const buttonHtml = await $.get(`${extensionFolderPath}/button.html`);
        $("#send_but").before(buttonHtml);
        console.log(`[${MODULE_NAME}] Button HTML loaded`);

        // Bind add profile button in settings
        $('#ms_add_profile').off('click').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`[${MODULE_NAME}] Add profile button clicked`);
            addProfile();
        });

        // Bind toggle button
        $("#ms_toggle_button").off('click').on("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`[${MODULE_NAME}] Toggle button clicked`);
            if (switcherWindow) {
                hideSwitcherWindow();
            } else {
                showSwitcherWindow();
            }
        });

        await loadSettings();

        console.log(`[${MODULE_NAME}] Extension initialized successfully`);
        console.log(`[${MODULE_NAME}] Initial profiles:`, settings.profiles);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to initialize extension:`, error);
        toastr.error(`Failed to initialize Model Switcher: ${error.message}`);
    }
});