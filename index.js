// st-virtual-phone/index.js
import { extension_settings, getContext } from "../../../extensions.js";
import { saveChatDebounced } from '../../../../script.js';

const EXTENSION_NAME = "cinnamon-phone";
const DEFAULT_SETTINGS = {
    phoneColor: "#000000",
    iconColor: "#ffffff",
    wallpaper: "",
    showFloatingBtn: true,
    chatTheme: "blue", // "dark", "light", "blue"
    drafts: [] // เซฟ Timeline
};

let settings = {};

// HTML Structure
const phoneHTML = `
<div id="vp-floating-btn" title="Virtual Phone"><i class="fa-solid fa-mobile-screen"></i></div>

<div id="vp-container">
    <div id="vp-phone-wrapper">
        <div class="vp-header"><div class="vp-notch"></div></div>
        <div id="vp-screen">
            <!-- Home Screen -->
            <div id="vp-app-home" class="vp-app-view active">
                <div class="vp-avatar-container"><img id="vp-char-avatar" src="" alt="Avatar" style="display:none;"></div>
                <div class="vp-app-grid">
                    <div class="vp-app-icon" data-app="message">
                        <div class="vp-app-icon-box msg"><i class="fa-solid fa-comment"></i></div><span>Message</span>
                    </div>
                    <div class="vp-app-icon" data-app="insta">
                        <div class="vp-app-icon-box ig"><i class="fa-brands fa-instagram"></i></div><span>Insta</span>
                    </div>
                    <div class="vp-app-icon" data-app="twitter">
                        <div class="vp-app-icon-box tw"><i class="fa-brands fa-twitter"></i></div><span>Twitter</span>
                    </div>
                    <div class="vp-app-icon" data-app="timeline">
                        <div class="vp-app-icon-box time"><i class="fa-solid fa-list"></i></div><span>Timeline</span>
                    </div>
                    <div class="vp-app-icon" data-app="settings">
                        <div class="vp-app-icon-box set"><i class="fa-solid fa-gear"></i></div><span>Settings</span>
                    </div>
                </div>
            </div>

            <!-- Message App -->
            <div id="vp-app-message" class="vp-app-view">
                <div class="vp-top-nav">
                    <i class="fa-solid fa-chevron-left vp-back-btn"></i><span style="font-weight:600;">Messages</span>
                </div>
                <div class="vp-chat-area" id="vp-chat-history"></div>
                <div class="vp-plus-menu" id="vp-plus-menu">
                    <div class="vp-plus-item" data-action="slip"><i class="fa-solid fa-money-bill-transfer"></i> ส่งสลิปโอนเงิน</div>
                    <div class="vp-plus-item" data-action="location"><i class="fa-solid fa-location-dot"></i> ส่งโลเคชั่น</div>
                    <div class="vp-plus-item" data-action="voice"><i class="fa-solid fa-microphone"></i> ข้อความเสียง</div>
                    <div class="vp-plus-item" data-action="image"><i class="fa-solid fa-image"></i> ส่งรูปภาพ/สติกเกอร์</div>
                </div>
                <div class="vp-chat-input-area">
                    <i class="fa-solid fa-plus vp-action-btn" id="vp-btn-plus"></i>
                    <input type="text" id="vp-msg-input" placeholder="Type a message...">
                    <i class="fa-solid fa-paper-plane vp-action-btn" id="vp-btn-send-msg"></i>
                </div>
            </div>

            <!-- Timeline App -->
            <div id="vp-app-timeline" class="vp-app-view">
                <div class="vp-top-nav">
                    <i class="fa-solid fa-chevron-left vp-back-btn"></i>
                    <span style="font-weight:600; flex:1;">Timeline (Drafts)</span>
                    <i class="fa-solid fa-trash-can" id="vp-clear-timeline" style="cursor:pointer; color:#ff3b30;" title="Clear All"></i>
                </div>
                <div class="vp-input-group" id="vp-timeline-list"></div>
            </div>

            <!-- Settings App -->
            <div id="vp-app-settings" class="vp-app-view">
                <div class="vp-top-nav">
                    <i class="fa-solid fa-chevron-left vp-back-btn"></i><span style="font-weight:600;">Settings</span>
                </div>
                <div class="vp-input-group">
                    <label class="vp-label">Wallpaper URL (Home Screen)</label>
                    <input type="text" class="vp-input vp-img-input" id="vp-set-wallpaper" placeholder="Image URL...">
                    <img class="vp-preview-img" id="vp-set-wp-preview">

                    <label class="vp-label">Chat Bubble Theme</label>
                    <select class="vp-input" id="vp-set-theme">
                        <option value="blue">White - Blue</option>
                        <option value="light">Gray - White</option>
                        <option value="dark">Black - Gray</option>
                    </select>

                    <label class="vp-label">Phone Frame Color</label>
                    <input type="color" class="vp-input" id="vp-set-frame-color" style="height:40px;">
                    <label class="vp-label">Floating Icon Color</label>
                    <input type="color" class="vp-input" id="vp-set-icon-color" style="height:40px;">

                    <button class="vp-btn" id="vp-save-settings">Save Settings</button>
                </div>
            </div>

            <!-- Generic Form View -->
            <div id="vp-app-form" class="vp-app-view">
                <div class="vp-top-nav">
                    <i class="fa-solid fa-chevron-left vp-back-btn"></i><span id="vp-form-title" style="font-weight:600;">Form</span>
                </div>
                <div class="vp-input-group" id="vp-form-body"></div>
            </div>
        </div>
    </div>
    <!-- Global Export Button -->
    <button id="vp-global-export"><i class="fa-solid fa-paper-plane"></i> ส่งออก Prompt ทั้งหมดเข้าช่องแชท</button>
</div>
`;

function loadSettings() {
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
    settings = extension_settings[EXTENSION_NAME];
    if (!settings.drafts) settings.drafts = [];
}

function saveSettings() {
    extension_settings[EXTENSION_NAME] = settings;
    saveChatDebounced();
}

function applySettings() {
    $('#vp-phone-wrapper').css('background-color', settings.phoneColor);
    $('#vp-floating-btn').css('color', settings.iconColor);
    $('#vp-floating-btn').toggle(settings.showFloatingBtn);

    // Chat Theme
    const root = document.documentElement;
    if (settings.chatTheme === 'dark') {
        root.style.setProperty('--vp-chat-me-bg', '#333333');
        root.style.setProperty('--vp-chat-me-text', '#ffffff');
    } else if (settings.chatTheme === 'light') {
        root.style.setProperty('--vp-chat-me-bg', '#e5e5ea');
        root.style.setProperty('--vp-chat-me-text', '#000000');
    } else { // blue
        root.style.setProperty('--vp-chat-me-bg', '#007aff');
        root.style.setProperty('--vp-chat-me-text', '#ffffff');
    }

    // Wallpaper Logic
    const context = getContext();
    let bgImage = settings.wallpaper;

    $('#vp-char-avatar').hide();
    if (!bgImage && context && context.characters && context.characterId !== undefined) {
        const char = context.characters[context.characterId];
        if (char && char.avatar) {
            bgImage = `/characters/${char.avatar}`;
            $('#vp-char-avatar').attr('src', bgImage).show();
        }
    }

    if (bgImage) {
        const gradient = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6))`;
        $('#vp-screen').css('background-image', `${gradient}, url('${bgImage}')`);
    } else {
        $('#vp-screen').css('background-image', `linear-gradient(135deg, #2c3e50, #3498db)`);
    }
}

function renderTimeline() {
    const list = $('#vp-timeline-list');
    list.empty();
    if (settings.drafts.length === 0) {
        list.append('<div style="text-align:center; color:#aaa; margin-top:20px;">No drafts yet.</div>');
        return;
    }
    settings.drafts.forEach((draft, index) => {
        // ตัดข้อความให้สั้นลงสำหรับ Preview
        const previewText = draft.length > 80 ? draft.substring(0, 80) + '...' : draft;
        list.append(`
            <div class="vp-timeline-item">
                <i class="fa-solid fa-xmark vp-timeline-del" data-index="${index}"></i>
                <div style="white-space: pre-wrap;">${previewText}</div>
            </div>
        `);
    });
}

function addDraft(promptText, chatBubbleHtml = null) {
    settings.drafts.push(promptText);
    saveSettings();
    renderTimeline();

    if (chatBubbleHtml) {
        $('#vp-chat-history').append(chatBubbleHtml);
        const chatArea = document.getElementById('vp-chat-history');
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    toastr.success("Added to Timeline!");
}

function exportToSillyTavern() {
    if (settings.drafts.length === 0) {
        toastr.warning("Timeline is empty!");
        return;
    }

    const combinedPrompt = settings.drafts.join('\n\n');
    const textarea = document.getElementById('send_textarea');

    if (textarea) {
        textarea.value += (textarea.value.length > 0 ? '\n\n' : '') + combinedPrompt;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        // Clear Drafts
        settings.drafts = [];
        saveSettings();
        renderTimeline();
        $('#vp-chat-history').empty();

        toastr.success("ส่งออก Prompt เรียบร้อย!");
        $('#vp-container').fadeOut();
    }
}

function openApp(appId) {
    $('.vp-app-view').removeClass('active');
    $(`#vp-app-${appId}`).addClass('active');
    if (appId === 'timeline') renderTimeline();
}

function renderForm(title, inputsHTML, onSave) {
    openApp('form');
    $('#vp-form-title').text(title);
    $('#vp-form-body').html(inputsHTML + `<button class="vp-btn" id="vp-form-submit" style="margin-top:10px;">Save to Timeline</button>`);

    // Image Preview Logic for dynamic forms
    $('.vp-img-input').off('input').on('input', function() {
        const url = $(this).val();
        const preview = $(this).next('.vp-preview-img');
        if (url) { preview.attr('src', url).show(); }
        else { preview.hide(); }
    });

    $('#vp-form-submit').off('click').on('click', function() {
        onSave();
        openApp('timeline'); // กลับไปหน้า Timeline เพื่อดูผลลัพธ์
    });
}

function setupEvents() {
    $('#vp-floating-btn').on('click', function() {
        $('#vp-container').fadeToggle();
        applySettings();
    });

    if (window.innerWidth > 768) {
        $('#vp-container').draggable({ handle: ".vp-header", containment: "window", cancel: "input, textarea, button, select" });
    }

    $(document).on('click', '.vp-app-icon', function() {
        const app = $(this).data('app');
        openApp(app);

        if (app === 'settings') {
            $('#vp-set-wallpaper').val(settings.wallpaper || '').trigger('input');
            $('#vp-set-frame-color').val(settings.phoneColor);
            $('#vp-set-icon-color').val(settings.iconColor);
            $('#vp-set-theme').val(settings.chatTheme || 'blue');
        }

        if (app === 'insta') {
            renderForm('Instagram Post', `
                <label class="vp-label">Image URL</label>
                <input type="text" class="vp-input vp-img-input" id="ig-img" placeholder="https://...">
                <img class="vp-preview-img">
                <label class="vp-label">Caption</label>
                <textarea class="vp-input" id="ig-caption" placeholder="Write a caption..."></textarea>
                <label class="vp-label">Likes Count</label>
                <input type="number" class="vp-input" id="ig-likes" placeholder="e.g. 1500" value="100">
            `, () => {
                const prompt = `📱 **[Instagram Post by Lou]**\nImage: ${$('#ig-img').val()}\nCaption: "${$('#ig-caption').val()}"\n❤️ ${$('#ig-likes').val()} Likes`;
                addDraft(prompt);
            });
        }
        if (app === 'twitter') {
            renderForm('New Tweet', `
                <label class="vp-label">Tweet Content</label>
                <textarea class="vp-input" id="tw-text" placeholder="What's happening?"></textarea>
                <label class="vp-label">Privacy Settings</label>
                <select class="vp-input" id="tw-privacy"><option value="Public">Public</option><option value="Private">Private</option></select>
            `, () => {
                const prompt = `📱 **[Twitter (${$('#tw-privacy').val()}) by Lou]**\n"${$('#tw-text').val()}"`;
                addDraft(prompt);
            });
        }
    });

    $(document).on('click', '.vp-back-btn', function() { openApp('home'); });

    // Settings
    $(document).on('click', '#vp-save-settings', function() {
        settings.wallpaper = $('#vp-set-wallpaper').val();
        settings.phoneColor = $('#vp-set-frame-color').val();
        settings.iconColor = $('#vp-set-icon-color').val();
        settings.chatTheme = $('#vp-set-theme').val();
        saveSettings();
        applySettings();
        toastr.success("Settings Saved!");
    });

    // Settings Image Preview
    $('#vp-set-wallpaper').on('input', function() {
        const url = $(this).val();
        if (url) { $('#vp-set-wp-preview').attr('src', url).show(); }
        else { $('#vp-set-wp-preview').hide(); }
    });

    // Message App Actions
    $(document).on('click', '#vp-btn-plus', function() { $('#vp-plus-menu').toggleClass('active'); });

    $(document).on('click', '#vp-btn-send-msg', function() {
        const text = $('#vp-msg-input').val().trim();
        if (text) {
            const prompt = `📱 **[Chat Message from Lou]**: "${text}"`;
            addDraft(prompt, `<div class="vp-chat-bubble me">${text}</div>`);
            $('#vp-msg-input').val('');
        }
    });

    $(document).on('click', '.vp-plus-item', function() {
        const action = $(this).data('action');
        $('#vp-plus-menu').removeClass('active');

        if (action === 'slip') {
            renderForm('Bank Transfer', `
                <label class="vp-label">Transfer To (Name)</label>
                <input type="text" class="vp-input" id="slip-to" placeholder="e.g. Kael">
                <label class="vp-label">Amount</label>
                <input type="number" class="vp-input" id="slip-amount" placeholder="0.00">
            `, () => {
                const prompt = `📱 **[Bank Transfer Slip]**\nFrom: Lou\nTo: ${$('#slip-to').val()}\nAmount: $${$('#slip-amount').val()}`;
                addDraft(prompt, `<div class="vp-chat-bubble me" style="background:#28a745; color:#fff;">💸 Transfer: $${$('#slip-amount').val()}</div>`);
            });
        } else if (action === 'location') {
            renderForm('Share Location', `
                <label class="vp-label">Location Name / Address</label>
                <input type="text" class="vp-input" id="loc-name" placeholder="Where are you?">
            `, () => {
                const prompt = `📱 **[Location Shared by Lou]**\n📍 Location: ${$('#loc-name').val()}`;
                addDraft(prompt, `<div class="vp-chat-bubble me" style="background:#17a2b8; color:#fff;">📍 Location: ${$('#loc-name').val()}</div>`);
            });
        } else if (action === 'voice') {
            renderForm('Voice Message', `
                <label class="vp-label">Voice Content (What Lou says)</label>
                <textarea class="vp-input" id="voice-text" placeholder="Type the dialogue here..."></textarea>
            `, () => {
                const prompt = `📱 **[Voice Message from Lou]**\n▶️ *(Audio plays: "${$('#voice-text').val()}")*`;
                addDraft(prompt, `<div class="vp-chat-bubble me" style="background:#6f42c1; color:#fff;">▶️ Voice Message</div>`);
            });
        } else if (action === 'image') {
            renderForm('Send Image/Sticker', `
                <label class="vp-label">Image/Sticker URL</label>
                <input type="text" class="vp-input vp-img-input" id="img-url" placeholder="https://...">
                <img class="vp-preview-img">
                <label class="vp-label">Description (For AI Context)</label>
                <input type="text" class="vp-input" id="img-desc" placeholder="e.g. A cute cat sticker">
            `, () => {
                const prompt = `📱 **[Image/Sticker sent by Lou]**\n[Image Content: ${$('#img-desc').val()}]\nLink: ${$('#img-url').val()}`;
                addDraft(prompt, `<div class="vp-chat-bubble me"><img src="${$('#img-url').val()}" style="max-width:100%; border-radius:10px;"></div>`);
            });
        }
    });

    // Timeline Actions
    $(document).on('click', '.vp-timeline-del', function() {
        const index = $(this).data('index');
        settings.drafts.splice(index, 1);
        saveSettings();
        renderTimeline();
    });

    $(document).on('click', '#vp-clear-timeline', function() {
        if(confirm("Clear all timeline drafts?")) {
            settings.drafts = [];
            saveSettings();
            renderTimeline();
            $('#vp-chat-history').empty();
        }
    });

    // Global Export
    $(document).on('click', '#vp-global-export', function() {
        exportToSillyTavern();
    });
}

function init() {
    $('body').append(phoneHTML);
    loadSettings();
    applySettings();
    setupEvents();
}

jQuery(function () {
    init();
});
