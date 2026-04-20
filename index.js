// st-virtual-phone/index.js
import { extension_settings, getContext } from "../../../extensions.js";
import { saveChatDebounced } from '../../../../script.js';

const EXTENSION_NAME = "cinnamon-phone";
const DEFAULT_SETTINGS = {
    phoneColor: "#000000",
    iconColor: "#ffffff",
    wallpaper: "",
    showFloatingBtn: true,
    msgTheme: "light-blue", // light-blue, black, dark-grey, dark-white
    timeline_ig: [],
    timeline_tw: []
};

let settings = {};
let pendingPrompts = [];

const phoneHTML = `
<div id="vp-floating-btn" title="Virtual Phone"><i class="fa-solid fa-mobile-screen"></i><div class="vp-badge"></div></div>

<div id="vp-container">
    <div id="vp-screen">
        <div class="vp-header"><div class="vp-notch"></div></div>

        <!-- Home Screen -->
        <div id="vp-app-home" class="vp-app-view active">
            <div class="vp-avatar-container"><img id="vp-char-avatar" src="" alt="Avatar"></div>
            <div class="vp-app-grid">
                <div class="vp-app-icon" data-app="message"><div class="vp-app-icon-box msg"><i class="fa-solid fa-comment"></i></div><span>Message</span></div>
                <div class="vp-app-icon" data-app="insta"><div class="vp-app-icon-box ig"><i class="fa-brands fa-instagram"></i></div><span>Insta</span></div>
                <div class="vp-app-icon" data-app="twitter"><div class="vp-app-icon-box tw"><i class="fa-brands fa-twitter"></i></div><span>Twitter</span></div>
                <div class="vp-app-icon" data-app="settings"><div class="vp-app-icon-box set"><i class="fa-solid fa-gear"></i></div><span>Settings</span></div>
            </div>
        </div>

        <!-- Message App -->
        <div id="vp-app-message" class="vp-app-view theme-light-blue">
            <div class="vp-top-nav">
                <i class="fa-solid fa-chevron-left vp-back-btn"></i>
                <span style="font-weight:600;">Messages</span>
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

        <!-- Settings App -->
        <div id="vp-app-settings" class="vp-app-view">
            <div class="vp-top-nav">
                <i class="fa-solid fa-chevron-left vp-back-btn"></i><span style="font-weight:600;">Settings</span>
            </div>
            <div class="vp-input-group">
                <label class="vp-label">Wallpaper URL (Home Screen)</label>
                <input type="text" class="vp-input vp-img-input" id="vp-set-wallpaper" placeholder="https://...">
                <img class="vp-img-preview" id="vp-set-wallpaper-preview">

                <label class="vp-label">Message App Theme</label>
                <select class="vp-input" id="vp-set-theme">
                    <option value="light-blue">ขาว-ฟ้า (Light-Blue)</option>
                    <option value="black">ดำ (Black)</option>
                    <option value="dark-grey">ดำ-เทา (Dark-Grey)</option>
                    <option value="dark-white">เทา-ขาว (Dark-White)</option>
                </select>

                <label class="vp-label">Phone Frame Color</label>
                <input type="color" class="vp-input" id="vp-set-frame-color">
                <label class="vp-label">Floating Icon Color</label>
                <input type="color" class="vp-input" id="vp-set-icon-color">
                <button class="vp-btn" id="vp-save-settings">Save Settings</button>
            </div>
        </div>

        <!-- Timeline App (IG / Twitter) -->
        <div id="vp-app-timeline" class="vp-app-view">
            <div class="vp-top-nav">
                <i class="fa-solid fa-chevron-left vp-back-btn"></i>
                <span id="vp-tl-title" style="font-weight:600;">Timeline</span>
                <div class="vp-nav-actions">
                    <i class="fa-solid fa-trash vp-nav-btn" id="vp-tl-clear" title="Clear All"></i>
                    <i class="fa-solid fa-plus vp-nav-btn" id="vp-tl-add" title="New Post"></i>
                </div>
            </div>
            <div class="vp-timeline-list" id="vp-tl-list"></div>
        </div>

        <!-- Generic Form View -->
        <div id="vp-app-form" class="vp-app-view">
            <div class="vp-top-nav">
                <i class="fa-solid fa-chevron-left vp-back-btn"></i><span id="vp-form-title" style="font-weight:600;">Form</span>
            </div>
            <div class="vp-input-group" id="vp-form-body"></div>
        </div>

    </div>
    <!-- Export Button Outside Screen -->
    <div id="vp-export-btn-outer">ส่งออก Prompt เข้าช่องแชทหลัก</div>
</div>
`;

function loadSettings() {
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
    settings = extension_settings[EXTENSION_NAME];
    if(!settings.timeline_ig) settings.timeline_ig = [];
    if(!settings.timeline_tw) settings.timeline_tw = [];
    if(!settings.msgTheme) settings.msgTheme = "light-blue";
}

function saveExtensionSettings() {
    extension_settings[EXTENSION_NAME] = settings;
    saveChatDebounced();
}

function applySettings() {
    $('#vp-container').css('background-color', settings.phoneColor);
    $('#vp-floating-btn').css('color', settings.iconColor);
    $('#vp-floating-btn').toggle(settings.showFloatingBtn);

    // Apply Theme
    $('#vp-app-message').removeClass('theme-light-blue theme-black theme-dark-grey theme-dark-white').addClass(`theme-${settings.msgTheme}`);

    const context = getContext();
    let bgImage = settings.wallpaper;
    const defaultBg = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1000&auto=format&fit=crop";

    if (!bgImage) {
        if (context && context.characters && context.characterId !== undefined) {
            const char = context.characters[context.characterId];
            if (char && char.avatar) bgImage = `/characters/${char.avatar}`;
        }
        if(!bgImage) bgImage = defaultBg;
    }

    $('#vp-char-avatar').attr('src', bgImage);
    $('#vp-app-home').css('background', `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${bgImage}') center/cover`);
    $('#vp-app-message').css('background', `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url('${bgImage}') center/cover`);
    $('#vp-app-timeline').css('background', `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url('${bgImage}') center/cover`);
    $('#vp-app-form').css('background', `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url('${bgImage}') center/cover`);
    $('#vp-app-settings').css('background', `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url('${bgImage}') center/cover`);
}

function exportToSillyTavern() {
    if (pendingPrompts.length === 0) {
        toastr.warning("ไม่มีข้อมูลให้ส่งออก");
        return;
    }
    const combinedPrompt = pendingPrompts.join('\n\n');
    const textarea = document.getElementById('send_textarea');
    if (textarea) {
        textarea.value += (textarea.value.length > 0 ? '\n\n' : '') + combinedPrompt;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        pendingPrompts = [];
        $('#vp-chat-history').empty();
        toastr.success("ส่งออก Prompt เรียบร้อย (ตรวจสอบในช่องแชท)");
    }
}

function openApp(appId) {
    $('.vp-app-view').removeClass('active');
    $(`#vp-app-${appId}`).addClass('active');
}

// Render Generic Form with Labels & Previews
function renderForm(title, inputsHTML, onSave) {
    openApp('form');
    $('#vp-form-title').text(title);
    $('#vp-form-body').html(inputsHTML + `<button class="vp-btn" id="vp-form-submit">Save / Add</button>`);

    // Image Preview Binding
    $('.vp-img-input').on('input', function() {
        const url = $(this).val();
        const previewId = $(this).attr('id') + '-preview';
        if(url) {
            $(`#${previewId}`).attr('src', url).show();
        } else {
            $(`#${previewId}`).hide();
        }
    });

    $('#vp-form-submit').off('click').on('click', function() {
        onSave();
    });
}

// Timeline Renderer
function renderTimeline(type) {
    openApp('timeline');
    $('#vp-tl-title').text(type === 'ig' ? 'Instagram' : 'Twitter');
    $('#vp-tl-add').data('type', type);
    $('#vp-tl-clear').data('type', type);

    const list = type === 'ig' ? settings.timeline_ig : settings.timeline_tw;
    $('#vp-tl-list').empty();

    if(list.length === 0) {
        $('#vp-tl-list').html('<div style="text-align:center; color:#888; margin-top:20px;">No posts yet.</div>');
        return;
    }

    list.forEach((item, index) => {
        let html = `<div class="vp-tl-item">`;
        if(type === 'ig') {
            if(item.img) html += `<img src="${item.img}" class="vp-tl-img">`;
            html += `<div class="vp-tl-text"><b>Caption:</b> ${item.caption}</div>`;
            html += `<div class="vp-tl-text">❤️ ${item.likes} Likes</div>`;
        } else {
            html += `<div class="vp-tl-text" style="font-size:15px;">${item.text}</div>`;
            html += `<div class="vp-tl-text" style="color:#aaa;">🔒 ${item.privacy}</div>`;
        }
        html += `<div class="vp-tl-actions">
                    <button class="vp-tl-btn add-prompt" data-type="${type}" data-idx="${index}">+ Add to Prompt</button>
                    <button class="vp-tl-btn del" data-type="${type}" data-idx="${index}">Delete</button>
                 </div></div>`;
        $('#vp-tl-list').prepend(html); // ใหม่สุดอยู่บน
    });
}

function setupEvents() {
    $('#vp-floating-btn').on('click', function() {
        $('#vp-container').fadeToggle();
        applySettings();
    });

    if (window.innerWidth > 768) {
        $('#vp-container').draggable({ handle: ".vp-header", containment: "window" });
    }

    $(document).on('click', '.vp-app-icon', function() {
        const app = $(this).data('app');
        if (app === 'settings') {
            openApp('settings');
            $('#vp-set-wallpaper').val(settings.wallpaper || '').trigger('input');
            $('#vp-set-theme').val(settings.msgTheme);
            $('#vp-set-frame-color').val(settings.phoneColor);
            $('#vp-set-icon-color').val(settings.iconColor);
        } else if (app === 'insta') {
            renderTimeline('ig');
        } else if (app === 'twitter') {
            renderTimeline('tw');
        } else {
            openApp(app);
        }
    });

    $(document).on('click', '.vp-back-btn', function() { openApp('home'); });

    // Settings
    $(document).on('click', '#vp-save-settings', function() {
        settings.wallpaper = $('#vp-set-wallpaper').val();
        settings.msgTheme = $('#vp-set-theme').val();
        settings.phoneColor = $('#vp-set-frame-color').val();
        settings.iconColor = $('#vp-set-icon-color').val();
        saveExtensionSettings();
        applySettings();
        toastr.success("Settings saved!");
    });

    // Timeline Actions
    $(document).on('click', '#vp-tl-add', function() {
        const type = $(this).data('type');
        if(type === 'ig') {
            renderForm('New IG Post', `
                <label class="vp-label">Image URL</label>
                <input type="text" class="vp-input vp-img-input" id="ig-img" placeholder="https://...">
                <img class="vp-img-preview" id="ig-img-preview">
                <label class="vp-label">Caption</label>
                <textarea class="vp-input" id="ig-caption" placeholder="Write a caption..."></textarea>
                <label class="vp-label">Likes Count</label>
                <input type="number" class="vp-input" id="ig-likes" placeholder="e.g. 100" value="100">
            `, () => {
                const post = { img: $('#ig-img').val(), caption: $('#ig-caption').val(), likes: $('#ig-likes').val() };
                settings.timeline_ig.push(post);
                saveExtensionSettings();
                renderTimeline('ig');
            });
        } else {
            renderForm('New Tweet', `
                <label class="vp-label">Tweet Content</label>
                <textarea class="vp-input" id="tw-text" placeholder="What's happening?"></textarea>
                <label class="vp-label">Privacy</label>
                <select class="vp-input" id="tw-privacy"><option value="Public">Public</option><option value="Private">Private</option></select>
            `, () => {
                const tweet = { text: $('#tw-text').val(), privacy: $('#tw-privacy').val() };
                settings.timeline_tw.push(tweet);
                saveExtensionSettings();
                renderTimeline('tw');
            });
        }
    });

    $(document).on('click', '.vp-tl-btn.del', function() {
        const type = $(this).data('type');
        const idx = $(this).data('idx');
        if(type === 'ig') settings.timeline_ig.splice(idx, 1);
        else settings.timeline_tw.splice(idx, 1);
        saveExtensionSettings();
        renderTimeline(type);
    });

    $(document).on('click', '#vp-tl-clear', function() {
        if(confirm("Clear all posts?")) {
            const type = $(this).data('type');
            if(type === 'ig') settings.timeline_ig = [];
            else settings.timeline_tw = [];
            saveExtensionSettings();
            renderTimeline(type);
        }
    });

    $(document).on('click', '.vp-tl-btn.add-prompt', function() {
        const type = $(this).data('type');
        const idx = $(this).data('idx');
        if(type === 'ig') {
            const item = settings.timeline_ig[idx];
            pendingPrompts.push(`📱 **[Instagram Post by Lou]**\nImage: ${item.img}\nCaption: "${item.caption}"\n❤️ ${item.likes} Likes`);
        } else {
            const item = settings.timeline_tw[idx];
            pendingPrompts.push(`📱 **[Twitter (${item.privacy}) by Lou]**\n"${item.text}"`);
        }
        toastr.success("Added to Pending Prompts!");
    });

    // Message Actions
    $(document).on('click', '#vp-btn-plus', function() { $('#vp-plus-menu').toggleClass('active'); });
    $(document).on('click', '#vp-btn-send-msg', function() {
        const text = $('#vp-msg-input').val().trim();
        if (text) {
            $('#vp-chat-history').append(`<div class="vp-chat-bubble me">${text}</div>`);
            pendingPrompts.push(`📱 **[Chat Message from Lou]**: "${text}"`);
            $('#vp-msg-input').val('');
            const chatArea = document.getElementById('vp-chat-history');
            chatArea.scrollTop = chatArea.scrollHeight;
        }
    });

    $(document).on('click', '.vp-plus-item', function() {
        const action = $(this).data('action');
        $('#vp-plus-menu').removeClass('active');

        if (action === 'slip') {
            renderForm('Bank Transfer', `
                <label class="vp-label">Transfer To (Name)</label><input type="text" class="vp-input" id="slip-to">
                <label class="vp-label">Amount ($)</label><input type="number" class="vp-input" id="slip-amount">
            `, () => {
                pendingPrompts.push(`📱 **[Bank Transfer Slip]**\nFrom: Lou\nTo: ${$('#slip-to').val()}\nAmount: $${$('#slip-amount').val()}`);
                $('#vp-chat-history').append(`<div class="vp-chat-bubble me">💸 Transfer: $${$('#slip-amount').val()}</div>`);
                openApp('message');
            });
        } else if (action === 'location') {
            renderForm('Share Location', `
                <label class="vp-label">Location Name / Address</label><input type="text" class="vp-input" id="loc-name">
            `, () => {
                pendingPrompts.push(`📱 **[Location Shared by Lou]**\n📍 Location: ${$('#loc-name').val()}`);
                $('#vp-chat-history').append(`<div class="vp-chat-bubble me">📍 Location: ${$('#loc-name').val()}</div>`);
                openApp('message');
            });
        } else if (action === 'voice') {
            renderForm('Voice Message', `
                <label class="vp-label">Voice Text (What you said)</label><textarea class="vp-input" id="voice-text"></textarea>
            `, () => {
                pendingPrompts.push(`📱 **[Voice Message from Lou]**\n▶️ *(Audio plays: "${$('#voice-text').val()}")*`);
                $('#vp-chat-history').append(`<div class="vp-chat-bubble me">▶️ Voice Message</div>`);
                openApp('message');
            });
        } else if (action === 'image') {
            renderForm('Send Image/Sticker', `
                <label class="vp-label">Image URL</label>
                <input type="text" class="vp-input vp-img-input" id="msg-img-url" placeholder="https://...">
                <img class="vp-img-preview" id="msg-img-url-preview">
                <label class="vp-label">Description (For AI)</label>
                <input type="text" class="vp-input" id="msg-img-desc" placeholder="e.g. A cute cat sticker">
            `, () => {
                pendingPrompts.push(`📱 **[Image/Sticker sent by Lou]**\n[Content: ${$('#msg-img-desc').val()}]\nLink: ${$('#msg-img-url').val()}`);
                $('#vp-chat-history').append(`<div class="vp-chat-bubble me"><img src="${$('#msg-img-url').val()}" style="max-width:100%; border-radius:10px;"></div>`);
                openApp('message');
            });
        }
    });

    $(document).on('click', '#vp-export-btn-outer', function() { exportToSillyTavern(); });
}

function init() {
    $('body').append(phoneHTML);
    loadSettings();
    applySettings();
    setupEvents();
}

jQuery(function () { init(); });
